#!/usr/bin/env bash
# Run a command against Neon DB. Wrapper around db-shell.sh (v3.0).
# Uses .env.local and DATABASE_URL_DIRECT (v3.0). No raw env reads.
#
# Usage: ./scripts/db-neon.sh <cmd> [args...]
# Example: ./scripts/db-neon.sh psql -c "SELECT 1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$SCRIPT_DIR/db-shell.sh" "$@"
