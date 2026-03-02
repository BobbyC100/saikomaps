#!/usr/bin/env bash
set -e

COMMAND="$1"

if [ -z "$COMMAND" ]; then
  echo "Usage: ./scripts/db-use.sh [whoami|psql|check]"
  exit 1
fi

# Load DATABASE_URL + DB_ENV via Node validation (tail -1 to skip dotenv banner on stdout)
ENV_JSON=$(npx tsx -e "import { env } from './config/env'; console.log(JSON.stringify(env))" 2>/dev/null | tail -1)
DATABASE_URL=$(echo "$ENV_JSON" | node -pe "JSON.parse(require('fs').readFileSync(0,'utf8')).DATABASE_URL")
DB_ENV=$(echo "$ENV_JSON" | node -pe "JSON.parse(require('fs').readFileSync(0,'utf8')).DB_ENV")

if [ -z "$DATABASE_URL" ] || [ -z "$DB_ENV" ]; then
  echo "DATABASE_URL or DB_ENV missing"
  exit 1
fi

echo "Connected to: $DB_ENV"

case "$COMMAND" in
  whoami)
    psql "$DATABASE_URL" -c "select current_database() as db, current_user as user, current_schema() as schema, current_setting('search_path') as search_path;"
    ;;
  psql)
    shift
    exec psql "$DATABASE_URL" "$@"
    ;;
  check)
    psql "$DATABASE_URL" -c "select table_schema, table_name from information_schema.tables where table_name = 'places';"
    ;;
  *)
    echo "Invalid command"
    exit 1
    ;;
esac
