# Google Places API — Unblock Legacy Text Search

**Use `GOOGLE_PLACES_API_KEY` only.** Do not use `GOOGLE_PLACES_API_KEY_NEW` or other variants.

Use when `backfill-google-place-ids` returns `REQUEST_DENIED`.

## 1) Enable the correct API in GCP

[APIs & Services → Library](https://console.cloud.google.com/apis/library)

Search "Places API" and **Enable** the one **NOT** labeled "(New)" — that's the legacy API for `maps.googleapis.com/maps/api/place/textsearch`.

## 2) Fix API key restrictions

Console → APIs & Services → Credentials → your API key

- **Application restrictions:** None (for validation)
- **API restrictions:** Don't restrict key (for validation)
- Confirm **Billing** is enabled on the project

(Re‑restrict after it works.)

## 3) Env vars

`scripts/load-env.js` loads `.env` then `.env.local` (override). In `.env.local`:

```
GOOGLE_PLACES_ENABLED=true
GOOGLE_PLACES_API_KEY=YOUR_REAL_KEY
```

**Curl example (uses env var, never paste raw key):**

```bash
source .env.local 2>/dev/null || true
curl -s "https://places.googleapis.com/v1/places/ChIJGU5p6ri7woARaCOqe4haSl0" \
  -H "X-Goog-Api-Key: ${GOOGLE_PLACES_API_KEY}" \
  -H "X-Goog-FieldMask: id,displayName"
```

## 4) Proof test

```bash
node -r ./scripts/load-env.js -e "console.log('ENABLED', process.env.GOOGLE_PLACES_ENABLED); console.log('HAS_KEY', !!process.env.GOOGLE_PLACES_API_KEY)"
```

Dry run:

```bash
npm run backfill:google-place-ids:neon -- --la-only --limit 5 --verbose
```

Apply:

```bash
npm run backfill:google-place-ids:neon -- --la-only --apply --limit 25 --verbose
```

## 5) Verify writes

```bash
./scripts/db-neon.sh psql -Atc "SELECT count(*) FROM public.v_places_la_bbox WHERE google_place_id IS NULL OR btrim(COALESCE(google_place_id,''))='';"
./scripts/db-neon.sh psql -c "SELECT slug, name, google_place_id FROM public.v_places_la_bbox ORDER BY name;"
```

## Key/project mismatch

Ensure the API key is in the **same project** where:
- Places API (legacy) is enabled
- Billing is enabled
