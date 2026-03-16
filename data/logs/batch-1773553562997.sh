#!/bin/bash
set -e
cd "/Users/bobbyciccaglione/code/saiko-maps"

SLUGS="book-soup
mystery-pier-books
skylight-books
alias-books-east
chevaliers-books
dark-delicacies
sideshow-books
the-last-bookstore
hennessey-ingalls
now-serving
north-figueroa-bookshop
malik-books
eso-won-books
reparations-club
the-salt-eaters-bookshop
all-power-books
octavias-bookshelf
cafe-con-libros-press
the-ripped-bodice
the-daily-planet
diesel
zibbys-bookshop
childrens-book-world
pages-a-bookstore
the-book-jewel
mystic-journey-bookstore
iliad-bookshop
tia-chuchas-centro-cultural
sunnys-bookshop
vromans-bookstore
flintridge-bookstore
underdog-bookstore
sandpiper-books
philippine-expressions-bookshop
sunken-city-books
gatsby-books
page-against-the-machine
bel-canto-books
kinokuniya-bookstore
secret-headquarters"

echo "[batch-enrich] Starting batch of 40 slugs at $(date)" >> "/Users/bobbyciccaglione/code/saiko-maps/data/logs/enrich-batch-1773553562997.log"

for slug in $SLUGS; do
  echo "[batch-enrich] Enriching $slug at $(date)" >> "/Users/bobbyciccaglione/code/saiko-maps/data/logs/enrich-batch-1773553562997.log"
  node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/enrich-place.ts --slug="$slug" >> "/Users/bobbyciccaglione/code/saiko-maps/data/logs/enrich-batch-1773553562997.log" 2>&1 || {
    echo "[batch-enrich] FAILED: $slug" >> "/Users/bobbyciccaglione/code/saiko-maps/data/logs/enrich-batch-1773553562997.log"
  }
  echo "[batch-enrich] Finished $slug at $(date)" >> "/Users/bobbyciccaglione/code/saiko-maps/data/logs/enrich-batch-1773553562997.log"
done

echo "[batch-enrich] Batch complete at $(date)" >> "/Users/bobbyciccaglione/code/saiko-maps/data/logs/enrich-batch-1773553562997.log"
