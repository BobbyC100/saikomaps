# Saiko Maps — Skate Spot Integration

Implementation of the skate spot layer per the buildable task list.

## Phase 0 — Schema & API ✅

- **Prisma**: `ActivitySpot` model, `LayerType` (SKATE, SURF), `SpotSource` (OSM, CITY_DATA, EDITORIAL, COMMUNITY)
- **Migration**: `prisma/migrations/20260204000000_add_activity_spots/`
- **API**:
  - `GET /api/spots?layer=SKATE&city=Los Angeles&region=venice-westside`
  - `GET /api/spots/geojson?layer=SKATE&bounds=sw_lat,sw_lng,ne_lat,ne_lng`
  - `GET /api/spots/[id]`

**Run migration** (requires DATABASE_URL):
```bash
npx prisma migrate deploy
# or
npx prisma db push
```

## Phase 1 — Data Import ✅

### OSM Import
```bash
npm run import:skate-osm
```
Fetches `leisure=skate_park` from LA County via Overpass API, deduplicates by 50m, writes to DB.

### Editorial CSV Import
```bash
npm run import:skate-editorial
```
Uses `data/input/skate-editorial.csv`. Creates template if missing.

**CSV columns**: name, lat, lng, region, spotType, tags, surface, description

**Regions**: venice-westside, hollywood, downtown, south-bay, san-fernando-valley, east-la, south-la, long-beach, pasadena-sgv, santa-clarita

## Phase 2 — Map Layer ✅

- **Skate toggle**: Top-right of map, persists during session
- **Skate markers**: Blue pins (`/markers/skate.svg`), clustered at low zoom
- **Click**: Opens detail panel

## Phase 3 — Detail Panel ✅

- Spot type badge (Park / Street / Plaza)
- Tags as pills
- Surface, skill level (if present)
- Description (if present)
- Source attribution (OpenStreetMap, etc.)

## LA Region Map

| Region Key | Covers |
|------------|--------|
| venice-westside | Venice, Santa Monica, Mar Vista, Culver City |
| hollywood | Hollywood, Los Feliz, Silver Lake, Echo Park |
| downtown | DTLA, Arts District, Chinatown, Boyle Heights |
| south-bay | Torrance, Hermosa, Redondo, Manhattan Beach, El Segundo |
| san-fernando-valley | NoHo, Burbank, Van Nuys, Chatsworth, Encino |
| east-la | East LA, Montebello, Whittier, El Monte |
| south-la | Inglewood, Compton, Hawthorne, Watts |
| long-beach | Long Beach, Signal Hill, San Pedro |
| pasadena-sgv | Pasadena, Alhambra, Arcadia, Monrovia |
| santa-clarita | Santa Clarita, Valencia, Newhall |

## Post-Import QA Checklist

After running the OSM import, do a visual pass on the map:

- **Duplicate clusters**: Spots within ~50m are deduped; if you see tight clusters, consider lowering the threshold or merging manually
- **Missing names**: OSM sometimes has just "Skatepark" — the import uses `Skate Park {type}-{id}` as fallback when name is empty
- **Boundary bleed**: Check for pins outside LA County (Overpass area query should prevent this, but edge cases exist)
- **Editorial spots**: Seed 10–15 street spots first — they're what make the layer feel like Saiko, not just an OSM mirror

## What's Next

- **City data import**: LA City Parks + County datasets (data.lacity.org, data.lacounty.gov)
- **Surf layer**: Same pipeline, different Overpass tag
- **Viewport-based loading**: Fetch by bounds for 200+ spots
- **"Suggest a spot" flow**: V2 UGC
