---
doc_id: SAIKO-DATA-PIPELINE-QUICK-START
doc_type: reference
status: active
owner: Bobby Ciccaglione
created: '2026-03-10'
last_updated: '2026-03-17'
project_id: SAIKO
systems:
  - data-pipeline
summary: 'Quick-start guide for entity intake and enrichment. Start here if you have a list of place names to add.'
---
# Data Pipeline — Quick Start

You have a list of restaurant/bar/cafe names. Here's how to get them into Saiko and enriched.

---

## Fastest path: Smart Enrich

Give it names, it does the rest. Finds the website, Instagram, neighborhood, and coordinates — cheapest path first.

```bash
# One name
npm run enrich:smart -- --name="Bavel"

# A list
npm run enrich:smart -- --names="Bavel,Bestia,Republique,Kismet,Sushi Park"

# From a file (one name per line)
npm run enrich:smart -- --file=data/new-places.txt

# Cheap mode — just web search + scrape, no Google API (~$0.01/entity)
npm run enrich:smart -- --file=data/new-places.txt --cheap
```

Smart enrich handles dedup (won't create duplicates), intake (creates CANDIDATE entities), discovery (finds website + IG via Haiku), surface scraping (free), and gap fill (Google Places only if needed).

---

## What it does per entity

| Phase | Cost | What happens |
|---|---|---|
| 1. Discover | ~$0.01 | Claude Haiku + web search → finds website, Instagram, neighborhood |
| 2. Scrape | FREE | Fetches the website, discovers menu/about/contact pages |
| 3. Parse | FREE | Extracts structured data from scraped HTML |
| 4. Gap fill | ~$0.03 | Google Places for coords/hours — only if still missing after scraping |

Total: $0.01–0.04 per entity. At 100 entities: ~$1–4.

---

## If you need deep enrichment

After smart enrich, entities have identity (website, IG, coords, GPID). For AI-generated signals and taglines, run the full pipeline:

```bash
# Full pipeline on entities that already exist
npm run enrich:place -- --batch=50 --concurrency=5
```

This adds: AI identity signals (chef, cuisine, vibe), menu/reservation URL extraction, and generated taglines. Costs ~$0.06–0.08 more per entity (Claude Sonnet calls).

---

## Bulk intake from CSV

For structured data (with columns like Google Place ID, website, neighborhood):

```bash
# Via API
curl -X POST localhost:3000/api/admin/intake \
  -F "file=@data/new-places.csv"
```

CSV columns: `Name, Google Place ID, Website, Instagram Handle, Neighborhood`

The intake endpoint handles dedup automatically — GPID match, domain match, IG match, then fuzzy name match. Ambiguous matches go to the intake review queue.

---

## Check what needs work

```bash
# See all data quality issues
curl "localhost:3000/api/admin/tools/scan-issues?detail=true" | jq '.issues | length'

# Or use the Coverage Ops dashboard
open http://localhost:3000/admin/coverage-ops
```

---

## Full command reference

See `docs/PIPELINE_COMMANDS.md` for the complete operator reference.
