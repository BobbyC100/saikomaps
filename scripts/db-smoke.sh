#!/usr/bin/env bash
# Guardrail smoke test: verify local and neon wrappers + views.
# Exit non-zero if any command fails.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"

echo "=== LOCAL ==="
OUT=$(./scripts/db-local.sh psql -Atc "SELECT current_database(), current_user;" 2>/dev/null | tail -1)
if [[ "$OUT" == *"neondb"* ]]; then
  echo "Local smoke failed: psql connected to neondb instead of local. Got: $OUT"
  exit 1
fi
npm run db:whoami:local
./scripts/db-local.sh psql -c "SELECT count(*) FROM public.places;"
./scripts/db-local.sh psql -c "SELECT count(*) FROM public.v_places_la_bbox;"

echo ""
echo "=== NEON ==="
OUT=$(./scripts/db-neon.sh psql -Atc "SELECT current_database(), current_user;" 2>/dev/null | tail -1)
if [[ "$OUT" != *"neondb"* ]] || [[ "$OUT" != *"neondb_owner"* ]]; then
  echo "Neon smoke failed: expected neondb|neondb_owner. Got: $OUT"
  exit 1
fi
npm run db:whoami:neon
./scripts/db-neon.sh psql -c "SELECT count(*) FROM public.places;"
./scripts/db-neon.sh psql -c "SELECT count(*) FROM public.v_places_la_bbox;"

echo ""
echo "db:smoke OK"
