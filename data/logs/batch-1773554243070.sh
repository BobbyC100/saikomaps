#!/bin/bash
set -e
cd "/Users/bobbyciccaglione/code/saiko-maps"

SLUGS="pa-ord-noodle
heng-heng-chicken-rice
crispy-pork-gang
ekkamai
sawtelle-tuk-tuk
pink-pepper
spicy-sugar-thai"

echo "[batch-enrich] Starting batch of 7 slugs at $(date)" >> "/Users/bobbyciccaglione/code/saiko-maps/data/logs/enrich-batch-1773554243070.log"

for slug in $SLUGS; do
  echo "[batch-enrich] Enriching $slug at $(date)" >> "/Users/bobbyciccaglione/code/saiko-maps/data/logs/enrich-batch-1773554243070.log"
  node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/enrich-place.ts --slug="$slug" >> "/Users/bobbyciccaglione/code/saiko-maps/data/logs/enrich-batch-1773554243070.log" 2>&1 || {
    echo "[batch-enrich] FAILED: $slug" >> "/Users/bobbyciccaglione/code/saiko-maps/data/logs/enrich-batch-1773554243070.log"
  }
  echo "[batch-enrich] Finished $slug at $(date)" >> "/Users/bobbyciccaglione/code/saiko-maps/data/logs/enrich-batch-1773554243070.log"
done

echo "[batch-enrich] Batch complete at $(date)" >> "/Users/bobbyciccaglione/code/saiko-maps/data/logs/enrich-batch-1773554243070.log"
