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
