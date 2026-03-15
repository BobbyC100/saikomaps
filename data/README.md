---
doc_id: DATA-BATCH-EXTRACTION
doc_type: reference
status: active
owner: Bobby Ciccaglione
created: '2026-02-01'
last_updated: '2026-03-14'
project_id: SAIKO
summary: >-
  Data directory structure and workflow for batch extraction — seed lists
  (places.json, places-curated.json), source collection, AI extraction,
  and output review pipeline.
systems:
  - enrichment-pipeline
  - data-pipeline
related_docs:
  - docs/DATA_PIPELINE_QUICK_START.md
  - docs/PIPELINE_COMMANDS.md
category: engineering
tags: [pipeline, ingestion, enrichment, era]
source: repo
---

# SaikoAI Batch Extraction — Data

## Structure

```
data/
  input/
    places.json           ← main seed list (slug, name, city, category)
    places-curated.json   ← curated tier list (name, category, tier, notes)
    places-curated.csv    ← source CSV for curated list
    sources/
      {slug}.json         ← pre-collected sources per place
  output/
    {slug}.json           ← extraction results (one per place)
```

## Workflow

1. Add places to `input/places.json` (or `places-curated.json` for curated)
2. Run `npm run batch` or `npm run batch:curated` to collect sources
3. Run `npm run extract` or `npx tsx scripts/extract.ts`
4. Review output in `output/{slug}.json`

## Curated batch

```bash
npm run batch:curated                    # all 132 curated places
npm run batch:curated -- --limit 10      # first 10
npm run batch:curated -- --start-at bavel  # resume
```

Log: `data/batch-curated-log.json`
