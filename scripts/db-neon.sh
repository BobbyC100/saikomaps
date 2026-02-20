#!/usr/bin/env bash
# Run a command against Neon DB. Usage: ./scripts/db-neon.sh <cmd> [args...]
# Example: ./scripts/db-neon.sh psql -c "SELECT 1"
set -euo pipefail
ENV_FILE=".env.db.neon"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"
if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE. Copy from .env.db.example and set DATABASE_URL to your Neon URL."
  exit 1
fi
export SAIKO_DB_FROM_WRAPPER=1
DATABASE_URL=$(grep '^DATABASE_URL=' "$ENV_FILE" 2>/dev/null | cut -d= -f2- | tr -d '"' | tr -d "'" || true)
export DATABASE_URL
if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL not set in $ENV_FILE. Add DATABASE_URL=postgresql://..."
  exit 1
fi
# Parse host, db, user for banner (postgresql://user:pass@host:port/db)
BANNER=$(node -e "
  const u = process.env.DATABASE_URL || '';
  const m = u.match(/@([^\/]+)\/([^?]+)/);
  const userMatch = u.match(/\/\/([^:]+):/);
  const host = m ? m[1] : '?';
  const db = m ? m[2] : '?';
  const user = userMatch ? userMatch[1] : '?';
  console.log('[SAIKO DB] target=neon host=' + host + ' db=' + db + ' user=' + user);
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
