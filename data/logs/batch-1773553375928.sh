#!/bin/bash
set -e
cd "/Users/bobbyciccaglione/code/saiko-maps"

SLUGS="amoeba-music
supervinyl
as-the-record-turns
headline-records
going-underground-records
sick-city-records
rockaway-records
mount-analog
record-safari
cosmic-vinyl-cafe
gimme-gimme-records
permanent-records-roadhouse
the-artform-studio
on-maritime
pop-overbite
de-la-playa
record-surplus
angel-city-records
endless-noise
canterbury-records
poo-bah-record-shop
battery-books-and-music
freakbeat-records
atomic-records
the-midnight-hour
counterpoint-records-and-books
hiphop-philosophy
jacknife-records-and-tapes
world-famous-vip-records
foot-work
fingerprints-music
twelves
licorice-pizza-records
rubycon-records-and-tapes
deadly-wax
avalon-vintage
run-out-groove-records
salt-box-records"

echo "[batch-enrich] Starting batch of 38 slugs at $(date)" >> "/Users/bobbyciccaglione/code/saiko-maps/data/logs/enrich-batch-1773553375928.log"

for slug in $SLUGS; do
  echo "[batch-enrich] Enriching $slug at $(date)" >> "/Users/bobbyciccaglione/code/saiko-maps/data/logs/enrich-batch-1773553375928.log"
  node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/enrich-place.ts --slug="$slug" >> "/Users/bobbyciccaglione/code/saiko-maps/data/logs/enrich-batch-1773553375928.log" 2>&1 || {
    echo "[batch-enrich] FAILED: $slug" >> "/Users/bobbyciccaglione/code/saiko-maps/data/logs/enrich-batch-1773553375928.log"
  }
  echo "[batch-enrich] Finished $slug at $(date)" >> "/Users/bobbyciccaglione/code/saiko-maps/data/logs/enrich-batch-1773553375928.log"
done

echo "[batch-enrich] Batch complete at $(date)" >> "/Users/bobbyciccaglione/code/saiko-maps/data/logs/enrich-batch-1773553375928.log"
