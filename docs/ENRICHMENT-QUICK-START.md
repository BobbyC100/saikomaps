# Enrichment Quick Start

## 1. Verify Environment

```bash
# Check that .env has the Google Places API key
grep GOOGLE_PLACES_API_KEY .env
```

If missing, add to `.env` or `.env.local`:

```
GOOGLE_PLACES_API_KEY=your_api_key_here
```

## 2. Pre-Backfill Duplicate Cleanup

**Do this BEFORE running `backfill:google`** to avoid unique constraint errors:

```bash
# Find potential collisions
npm run find:backfill-duplicates

# Preview cleanup (shows what would be deleted)
npm run cleanup:backfill-duplicates

# Execute cleanup (keeps highest-scored, deletes rest)
npm run cleanup:backfill-duplicates -- --execute

# Now safe to backfill (LA County curated only)
npm run backfill:google -- --la-county
```

The cleanup script auto-scores duplicates (maps > bookmarks > enrichment > age) and keeps the best one.

## 3. Pre-Enrichment Audit

```bash
npm run enrich:audit:curated
```

Example output:

```
Total Places: 1,645

Field Coverage:
─────────────────────────────────────
Photos (googlePhotos):    612 / 37%
Hours:                  1,130 / 69%
Phone:                  1,169 / 71%
Website:                1,106 / 67%
```

## 4. Test Run (10 places)

**Always do this first** to verify everything works:

```bash
npm run enrich:test
```

Look for: ✅ success, ⚠️ no data, ❌ failures.

## 5. Production Run

### Full enrichment (recommended)

```bash
npm run enrich:all
```

Runs photos + hours + contact. Estimated: 2–3 hours for ~1,000 places.

### Targeted enrichment

```bash
npm run enrich:photos    # Photos only
npm run enrich:hours     # Hours only
npm run enrich:contact   # Phone + website
```

## 6. Monitor Progress

```
[1/1033] Processing: Guelaguetza
[1/1033] ✅ Guelaguetza - Updated: googlePhotos
```

Or tail logs:

```bash
tail -f logs/enrichment.log
```

## 7. Post-Enrichment Audit

```bash
npm run enrich:audit
```

Target coverage: Photos 90%+, Hours 95%+, Phone 95%+, Website 85%+.

## 8. Spot Check

```bash
npm run enrich:samples
```

Or view merchant pages in the browser.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `GOOGLE_PLACES_API_KEY not found` | Add to `.env`, restart terminal |
| `REQUEST_DENIED` | Enable Places API in Google Cloud Console |
| Too many failures | Check billing, wait 1 hour, re-run (script resumes) |

## One-Line Workflow

```bash
npm run enrich:workflow
```

Runs: audit → enrich all → audit.
