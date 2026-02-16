#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# migration-verify.sh — Compare local files vs registry vs remote
#
# Usage:
#   ./scripts/migration-verify.sh
#
# Requires:
#   SUPABASE_DB_URL  — Postgres connection string (service_role)
# ─────────────────────────────────────────────────────────────
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || REPO_ROOT="."

# Source .env.local first (local dev), fall back to .env (CI/production)
for _env in "$REPO_ROOT/.env.local" "$REPO_ROOT/.env"; do
  if [[ -f "$_env" ]]; then
    # shellcheck disable=SC1090
    source "$_env"
    break
  fi
done

MIGRATION_DIR="$REPO_ROOT/supabase/migrations"

if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
  echo "ERROR: SUPABASE_DB_URL is not set." >&2
  exit 1
fi

echo "═══════════════════════════════════════════════════════════"
echo "  Migration Verify — $(date '+%Y-%m-%d %H:%M')"
echo "═══════════════════════════════════════════════════════════"
echo ""

ISSUES=0

# ── 1. Check: local files not in registry ─────────────────────
echo "── Local files NOT in registry ──────────────────────────"
for f in "$MIGRATION_DIR"/*.sql; do
  [[ -f "$f" ]] || continue
  VERSION="$(basename "$f" .sql | cut -d'_' -f1)"
  EXISTS=$(psql "$SUPABASE_DB_URL" -tAc \
    "SELECT 1 FROM migration_tools.migration_registry WHERE version = '${VERSION}'" 2>/dev/null)
  if [[ "$EXISTS" != "1" ]]; then
    echo "  ⚠️  ${VERSION} — not registered (run migration-register.sh)"
    ISSUES=$((ISSUES + 1))
  fi
done
[[ $ISSUES -eq 0 ]] && echo "  ✅ All local files are registered."

echo ""

# ── 2. Check: registry entries from other repos missing locally
echo "── Registry entries missing locally ─────────────────────"
MISSING=$(psql "$SUPABASE_DB_URL" -tAc \
  "SELECT version || ' | ' || name || ' | ' || source_repo
   FROM migration_tools.migration_registry
   WHERE applied = true
   ORDER BY version" 2>/dev/null)

MISS_COUNT=0
while IFS= read -r row; do
  [[ -z "$row" ]] && continue
  V=$(echo "$row" | cut -d'|' -f1 | xargs)
  # Check if any local file starts with this version
  if ! ls "$MIGRATION_DIR"/${V}_*.sql &>/dev/null; then
    echo "  📥 $row — applied on remote but no local file"
    MISS_COUNT=$((MISS_COUNT + 1))
  fi
done <<< "$MISSING"
[[ $MISS_COUNT -eq 0 ]] && echo "  ✅ All applied migrations have local files."

echo ""

# ── 3. Check: checksum drift ─────────────────────────────────
echo "── Checksum drift (file modified after registration) ────"
DRIFT=0
for f in "$MIGRATION_DIR"/*.sql; do
  [[ -f "$f" ]] || continue
  VERSION="$(basename "$f" .sql | cut -d'_' -f1)"
  LOCAL_HASH="$(shasum -a 256 "$f" | cut -d' ' -f1)"
  REG_HASH=$(psql "$SUPABASE_DB_URL" -tAc \
    "SELECT checksum FROM migration_tools.migration_registry WHERE version = '${VERSION}'" 2>/dev/null | xargs)
  if [[ -n "$REG_HASH" && "$REG_HASH" != "$LOCAL_HASH" ]]; then
    echo "  🔀 ${VERSION} — local hash differs from registry"
    echo "       local:    ${LOCAL_HASH:0:16}…"
    echo "       registry: ${REG_HASH:0:16}…"
    DRIFT=$((DRIFT + 1))
  fi
done
[[ $DRIFT -eq 0 ]] && echo "  ✅ All checksums match."

echo ""

# ── 4. Check: pending reviews ─────────────────────────────────
echo "── Pending reviews ──────────────────────────────────────"
PENDING=$(psql "$SUPABASE_DB_URL" -tAc \
  "SELECT version || ' | ' || name || ' | ' || COALESCE(description, '')
   FROM migration_tools.migration_registry
   WHERE review_status = 'pending_review'
   ORDER BY version" 2>/dev/null)

P_COUNT=0
while IFS= read -r row; do
  [[ -z "$row" ]] && continue
  echo "  🔍 $row"
  P_COUNT=$((P_COUNT + 1))
done <<< "$PENDING"
[[ $P_COUNT -eq 0 ]] && echo "  ✅ No pending reviews."

echo ""
TOTAL=$((ISSUES + MISS_COUNT + DRIFT + P_COUNT))
if [[ $TOTAL -eq 0 ]]; then
  echo "🎉 Everything in sync."
else
  echo "⚠️  ${TOTAL} issue(s) found. Review above."
fi

