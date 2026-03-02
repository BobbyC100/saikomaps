#!/usr/bin/env bash
# Run a command against local Postgres. Wrapper around db-shell.sh (v3.0).
# Uses .env.local and DATABASE_URL_DIRECT (v3.0). No raw env reads.
#
# Usage: ./scripts/db-local.sh <cmd> [args...]
# Example: ./scripts/db-local.sh psql -c "SELECT 1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$SCRIPT_DIR/db-shell.sh" "$@"
