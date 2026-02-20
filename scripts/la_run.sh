#!/usr/bin/env bash
set -euo pipefail

echo "=== 1) db:smoke ==="
npm run db:smoke
echo

echo "=== 2) regen LA gold + eval ==="
npm run eval:tag-scores:neon:la:v1:regen
echo

echo "=== 3A) LA scope count (expect 5) ==="
./scripts/db-neon.sh psql -Atc "select count(*) from public.v_places_la_bbox_golden;"
echo

echo "=== 3B) confidence gate (expect yes for all; confidence typically 0.7) ==="
./scripts/db-neon.sh psql -Atc "SELECT p.slug, pts.version, pts.confidence, CASE WHEN pts.confidence >= 0.6 THEN 'yes' ELSE 'no' END AS high_conf_gate FROM public.v_places_la_bbox_golden v JOIN public.places p ON p.id=v.id JOIN public.place_tag_scores pts ON pts.place_id=p.id AND pts.version='tags_v1' ORDER BY p.slug;"
echo

echo "LA sanity OK"
