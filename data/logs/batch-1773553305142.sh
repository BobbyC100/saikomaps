#!/bin/bash
set -e
cd "/Users/bobbyciccaglione/code/saiko-maps"

SLUGS="ahead-stereo
gryphon-audio
audio-specialist
george-meyer-av
british-audio-guys
scott-walker-audio
high-end-by-oz
common-wave-hi-fi
destination-hifi
optimal-enchantment
venice-audio
the-source-av
hi-fi-project
a-sound-decision
audio-element
analogue-haven
rewind-audio
valencia-hi-fi
the-voice-of-vintage
pro-audio-la
audio-video-services
audiovisual-architects
video-and-audio-center"

echo "[batch-enrich] Starting batch of 23 slugs at $(date)" >> "/Users/bobbyciccaglione/code/saiko-maps/data/logs/enrich-batch-1773553305142.log"

for slug in $SLUGS; do
  echo "[batch-enrich] Enriching $slug at $(date)" >> "/Users/bobbyciccaglione/code/saiko-maps/data/logs/enrich-batch-1773553305142.log"
  node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/enrich-place.ts --slug="$slug" >> "/Users/bobbyciccaglione/code/saiko-maps/data/logs/enrich-batch-1773553305142.log" 2>&1 || {
    echo "[batch-enrich] FAILED: $slug" >> "/Users/bobbyciccaglione/code/saiko-maps/data/logs/enrich-batch-1773553305142.log"
  }
  echo "[batch-enrich] Finished $slug at $(date)" >> "/Users/bobbyciccaglione/code/saiko-maps/data/logs/enrich-batch-1773553305142.log"
done

echo "[batch-enrich] Batch complete at $(date)" >> "/Users/bobbyciccaglione/code/saiko-maps/data/logs/enrich-batch-1773553305142.log"
