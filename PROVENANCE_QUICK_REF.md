# Provenance System - Quick Reference

## ✅ SYSTEM IS ACTIVE

All 1,320 places now have provenance records proving Bobby added them!

## Run an audit anytime

```bash
npm run audit
```

## When Adding New Places

Currently, new places get provenance automatically during backfill, but here's how to add them manually if needed:

### After running the resolver for a new batch:

```bash
# Example: After adding San Fernando Valley expansion
npm run ingest:csv -- data/sfv-places.csv sfv_expansion
npm run resolver:run

# Then create provenance for new golden records
npm run provenance:backfill
```

The backfill script is smart - it only creates provenance for golden_records that don't have one yet.

## Current Status

```
Total places:        1,320
With provenance:     1,320
Without provenance:  0

👤 All added by: bobby_bulk_import
📚 Source types: google_saves (673), editorial (647)
```

## Important

- Run `npm run audit` before any major changes
- Run `npm run audit` periodically to catch any issues
- If audit fails, investigate immediately

## Batch Tracking

All places are tracked by their `import_batch`:
- `saiko_seed` - Original 673 seed places
- `beach_cities_expansion` - 49 places
- `southeast_la_expansion` - 59 places  
- `harbor_area_expansion` - 100 places
- `saiko_instagram_test` - 430 Instagram backfills

## Next Steps

When you run SFV expansion:
1. Generate CSV with Claude
2. Run `npm run ingest:csv -- data/sfv-places.csv sfv_expansion`
3. Run `npm run resolver:run`
4. Run `npm run provenance:backfill` (creates provenance for new places)
5. Run `npm run audit` (verify everything is good)

Done! 🎉
