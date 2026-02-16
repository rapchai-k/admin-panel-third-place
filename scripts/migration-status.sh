#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# migration-status.sh — Pretty-print the migration registry
#
# Usage:
#   ./scripts/migration-status.sh [--pending | --applied | --all]
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

if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
  echo "ERROR: SUPABASE_DB_URL is not set." >&2
  exit 1
fi

FILTER="${1:---all}"

echo "══════════════════════════════════════════════════════════════"
echo "  Migration Registry — $(date '+%Y-%m-%d %H:%M')"
echo "══════════════════════════════════════════════════════════════"
echo ""

case "$FILTER" in
  --pending)
    WHERE="WHERE applied = false OR review_status = 'pending_review'"
    echo "  Showing: pending / needs-review only"
    ;;
  --applied)
    WHERE="WHERE applied = true"
    echo "  Showing: applied migrations only"
    ;;
  --all|*)
    WHERE=""
    echo "  Showing: all migrations"
    ;;
esac

echo ""

SQL=$(cat <<EOF
SELECT
  version,
  CASE WHEN applied THEN '✅' ELSE '❌' END AS applied,
  source_repo AS repo,
  COALESCE(review_status, '—') AS review,
  LEFT(name, 40) AS name
FROM migration_tools.migration_registry
${WHERE}
ORDER BY version;
EOF
)

psql "$SUPABASE_DB_URL" -c "$SQL" 2>&1

# Summary counts
echo ""
echo "── Summary ──────────────────────────────────────────────────"
psql "$SUPABASE_DB_URL" --quiet -tAc \
  "SELECT
     'Total: '     || COUNT(*) ||
     ' | Applied: ' || COUNT(*) FILTER (WHERE applied) ||
     ' | Pending: ' || COUNT(*) FILTER (WHERE NOT applied) ||
     ' | Review: '  || COUNT(*) FILTER (WHERE review_status = 'pending_review')
   FROM migration_tools.migration_registry" 2>&1
echo ""

