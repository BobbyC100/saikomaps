#!/usr/bin/env bash
# Run a command against local Postgres. Usage: ./scripts/db-local.sh <cmd> [args...]
# Example: ./scripts/db-local.sh psql -c "SELECT 1"
# Override DATABASE_URL here for local dev. Falls back to .env.local if not set below.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"

# Local override — change this to your local Postgres URL
LOCAL_DB_URL="postgresql://bobbyciccaglione@localhost:5432/saiko_maps"

export SAIKO_DB_FROM_WRAPPER=1
export DATABASE_URL="$LOCAL_DB_URL"

# Parse host, db, user for banner
BANNER=$(node -e "
  const u = process.env.DATABASE_URL || '';
  const m = u.match(/@([^\/]+)\/([^?]+)/);
  const userMatch = u.match(/\/\/([^:]+):/);
  const host = m ? m[1] : '?';
  const db = m ? m[2] : '?';
  const user = userMatch ? userMatch[1] : '?';
  console.log('[SAIKO DB] target=local host=' + host + ' db=' + db + ' user=' + user);
")
echo "$BANNER"
# Lightweight DB probe when running psql/prisma/node/npm (non-fatal)
if [[ "${1:-}" =~ ^(psql|prisma|node|npm)$ ]]; then
  psql "$DATABASE_URL" -Atc "SELECT current_database(), current_user, inet_server_addr(), inet_server_port();" 2>/dev/null || true
fi
# psql does not read DATABASE_URL; we must pass it explicitly
if [ "${1:-}" = "psql" ]; then
  shift
  exec psql "$DATABASE_URL" "$@"
fi
exec "$@"
