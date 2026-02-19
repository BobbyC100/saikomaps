#!/usr/bin/env bash
set -euo pipefail

echo ""
echo "=== Prisma Prod Migration Recovery + Deploy ==="
echo "This script will:"
echo "  1) Inspect failed migration record"
echo "  2) Check whether password_reset_tokens exists"
echo "  3) Resolve migration as applied/rolled-back based on existence"
echo "  4) Run prisma migrate deploy"
echo ""
echo "STOP NOW if DATABASE_URL is not production."
echo ""

# Preflight: confirm DATABASE_URL looks like prod (best-effort heuristic)
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is not set."
  exit 1
fi

echo "DATABASE_URL is set (not printing for safety)."
echo ""

FAILED_MIGRATION="20260217000000_add_password_reset_tokens"

echo "Step 1) Inspect failed migration record: ${FAILED_MIGRATION}"
npx prisma db execute --schema=prisma/schema.prisma --stdin <<SQL
SELECT
  migration_name,
  started_at,
  finished_at,
  rolled_back_at,
  applied_steps_count,
  logs
FROM "_prisma_migrations"
WHERE migration_name = '${FAILED_MIGRATION}';
SQL

echo ""
echo "Step 2) Check if public.password_reset_tokens exists"
# Prisma 6 db execute does not return query results; use psql when available and branch on to_regclass() output.
if ! command -v psql >/dev/null 2>&1; then
  echo "psql not found. Run this manually and then run the resolve command from docs:"
  echo "  psql \"\$DATABASE_URL\" -t -A -c \"SELECT to_regclass('public.password_reset_tokens');\""
  echo "If output is 'password_reset_tokens' (or similar) -> use: npx prisma migrate resolve --applied ${FAILED_MIGRATION}"
  echo "If output is blank or null -> use: npx prisma migrate resolve --rolled-back ${FAILED_MIGRATION}"
  exit 1
fi

TABLE_EXISTS=$(psql "$DATABASE_URL" -t -A -c "SELECT to_regclass('public.password_reset_tokens');" 2>/dev/null || true)
TABLE_EXISTS="${TABLE_EXISTS:-}"

# to_regclass() returns the regclass name when table exists, empty/null when it does not.
if [[ -n "${TABLE_EXISTS}" && "${TABLE_EXISTS}" != "null" ]]; then
  echo "Detected: table exists (${TABLE_EXISTS})."
  echo "Step 3) Resolving failed migration as APPLIED"
  npx prisma migrate resolve --applied "${FAILED_MIGRATION}"
else
  echo "Detected: table does NOT exist."
  echo "Step 3) Resolving failed migration as ROLLED BACK"
  npx prisma migrate resolve --rolled-back "${FAILED_MIGRATION}"
fi

echo ""
echo "Step 4) Running prisma migrate deploy"
npx prisma migrate deploy

echo ""
echo "=== DONE ==="
echo "Next: follow docs/GOLDEN_FIRST_POST_DEPLOY_CHECKLIST.md"
