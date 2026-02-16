#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# migration-register.sh — Register a local migration in the shared registry
#
# Usage:
#   ./scripts/migration-register.sh <migration-file> [description]
#
# Requires:
#   SUPABASE_DB_URL  — Postgres connection string (service_role)
#     or set in .env as SUPABASE_DB_URL
# ─────────────────────────────────────────────────────────────
set -euo pipefail

# ── Config ────────────────────────────────────────────────────
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || REPO_ROOT="."

# Source .env.local first (local dev), fall back to .env (CI/production)
for _env in "$REPO_ROOT/.env.local" "$REPO_ROOT/.env"; do
  if [[ -f "$_env" ]]; then
    # shellcheck disable=SC1090
    source "$_env"
    break
  fi
done

REPO_NAME="${MIGRATION_REPO_NAME:-admin-panel}"   # override in consumer-panel

if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
  echo "ERROR: SUPABASE_DB_URL is not set. Export it or add to .env" >&2
  exit 1
fi

# ── Args ──────────────────────────────────────────────────────
if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <migration-file.sql> [description]" >&2
  exit 1
fi

FILE="$1"
DESCRIPTION="${2:-}"

if [[ ! -f "$FILE" ]]; then
  echo "ERROR: File not found: $FILE" >&2
  exit 1
fi

# ── Parse version + name from filename ────────────────────────
BASENAME="$(basename "$FILE" .sql)"
VERSION="${BASENAME%%_*}"
NAME="${BASENAME#*_}"

# ── Compute SHA-256 checksum ──────────────────────────────────
CHECKSUM="$(shasum -a 256 "$FILE" | cut -d' ' -f1)"

# ── Who is running this ───────────────────────────────────────
APPLIED_BY="${USER:-unknown}"

# ── Upsert into registry ─────────────────────────────────────
SQL=$(cat <<EOF
INSERT INTO migration_tools.migration_registry
  (version, name, source_repo, checksum, applied, applied_by, description)
VALUES
  ('${VERSION}', '${NAME}', '${REPO_NAME}', '${CHECKSUM}', false, '${APPLIED_BY}', '${DESCRIPTION}')
ON CONFLICT (version) DO UPDATE SET
  checksum    = EXCLUDED.checksum,
  description = COALESCE(NULLIF(EXCLUDED.description, ''), migration_tools.migration_registry.description);
EOF
)

psql "$SUPABASE_DB_URL" -c "$SQL" --quiet 2>&1

echo "✅ Registered: ${VERSION}_${NAME} (repo: ${REPO_NAME})"

