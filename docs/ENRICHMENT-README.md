# Google Places API Enrichment (Places Table)

Systematic data enrichment for Saiko Maps **places** table using Google Places API.

## What It Does

Fills missing data for places in your database:

- **Photos** (`googlePhotos`): Hero images and gallery from Google Places
- **Hours**: Opening hours and current status
- **Contact**: Phone numbers and websites

## Setup

1. **Environment variable** — Ensure `.env` or `.env.local` has:

   ```
   GOOGLE_PLACES_API_KEY=your_api_key_here
   ```

   Or `GOOGLE_MAPS_API_KEY` / `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (used as fallback).

2. **No extra dependencies** — Uses built-in `fetch` and existing Prisma client.

## Usage

### Audit (before/after)

```bash
npm run enrich:audit
```

Shows field coverage: photos, hours, phone, website, and remaining gaps.

### Test Run (10 places only)

```bash
npm run enrich:test
```

### Dry Run (see what would happen, no database changes)

```bash
npm run enrich:dry-run
```

### Photo Enrichment Only

```bash
npm run enrich:photos
```

Targets places missing `googlePhotos`.

### Hours Enrichment Only

```bash
npm run enrich:hours
```

### Contact Info Only

```bash
npm run enrich:contact
```

Targets phone and website gaps.

### Full Enrichment

```bash
npm run enrich:all
```

Runs all enrichment types in one pass.

### Sample Places

```bash
npm run enrich:samples              # all modes, 20 places
npm run enrich:samples:photos 30   # photos mode, 30 places
npm run enrich:samples:hours
npm run enrich:samples:contact
```

### Full Workflow

```bash
npm run enrich:workflow
```

Runs: audit → full enrichment → audit (before/after comparison).

## What Happens

1. **Query**: Script finds places needing enrichment (must have `googlePlaceId`)
2. **API Calls**: Fetches data from Google Places API (100ms delay between calls)
3. **Update**: Writes to `places` table (`googlePhotos`, `hours`, `phone`, `website`)
4. **Logging**: Progress and errors in `logs/enrichment.log` and `logs/enrichment-errors.log`

## Data Format

- **googlePhotos**: Array of `{ photo_reference: string }` — compatible with `getGooglePhotoUrl()` and merchant pages
- **hours**: `{ weekday_text, openNow, periods }` — compatible with `parseHours()` on place pages

## Rate Limiting

- 100ms delay between API calls
- Batch processing: 50 places per batch
- Estimated time: ~2 hours for 1,000+ places

## Cost Estimate

- **Place Details**: ~$0.017 per request
- **Photos**: Free (served from Google)
- **~1,000 places**: ~$17

## Comparison with Other Scripts

| Script | Target Table | Purpose |
|-------|--------------|---------|
| `enrich-places-enrichment.ts` | `places` | Photos, hours, phone, website for merchant pages |
| `enrich-google-places.ts` | `golden_records` | Entity resolution / MDM enrichment |
