#!/usr/bin/env bash
# Run a command against DB using v3.0 config (.env.local).
# Uses DATABASE_URL_DIRECT (admin) by default. No raw DATABASE_URL reads.
#
# Usage: ./scripts/db-shell.sh <cmd> [args...]
# Example: ./scripts/db-shell.sh psql -c "SELECT 1"
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"

if [ ! -f ".env.local" ]; then
  echo "Missing .env.local. Add DATABASE_URL_POOLED, DATABASE_URL_DIRECT, DB_ENV (v3.0)."
  exit 1
fi

# Load .env.local and export DATABASE_URL from DATABASE_URL_DIRECT (admin/direct)
eval "$(node -e "
  require('dotenv').config({ path: '.env.local' });
  const u = process.env.DATABASE_URL_DIRECT || '';
  if (!u) {
    console.error('DATABASE_URL_DIRECT not set in .env.local');
    process.exit(1);
  }
  // Escape for bash export
  const escaped = u.replace(/\\\\/g, '\\\\\\\\').replace(/'/g, \"'\\\\''\");
  console.log(\"export DATABASE_URL='\" + escaped + \"'\");
")"

export SAIKO_DB_FROM_WRAPPER=1

# Parse host, db, user for banner (URL from DIRECT; no DATABASE_URL fallback)
BANNER=$(node -e "
  const u = process.argv[1] || '';
  if (!u) { console.error('DATABASE_URL_DIRECT not set'); process.exit(1); }
  const m = u.match(/@([^\/]+)\/([^?]+)/);
  const userMatch = u.match(/\/\/([^:]+):/);
  const host = m ? m[1].split(':')[0] : '?';
  const db = m ? m[2] : '?';
  const user = userMatch ? userMatch[1] : '?';
  console.log('[SAIKO DB] v3.0 host=' + host + ' db=' + db + ' user=' + user);
" "$DATABASE_URL")
echo "$BANNER"

if [[ "${1:-}" =~ ^(psql|prisma|node|npm)$ ]]; then
  psql "$DATABASE_URL" -Atc "SELECT current_database(), current_user, inet_server_addr(), inet_server_port();" 2>/dev/null || true
fi

if [ "${1:-}" = "psql" ]; then
  shift
  exec psql "$DATABASE_URL" "$@"
fi
exec "$@"
