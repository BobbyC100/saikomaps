# Saiko Maps — Active Products & Features

**Purpose:** Quick reference for humans and AI: what Saiko Maps is and what it does. Each item has a two-sentence max explanation.

---

## Product

**Saiko Maps** — A curated map platform for creating and sharing editorial-style lists of places (restaurants, wine bars, shops, etc.). Think “Spotify playlists but for places”; maps live at shareable URLs and each place gets a merchant profile with photos, hours, and curator notes.

---

## Active Features & Products

### 1. Map creation and management
Users create custom maps/lists, add places via Google Place ID or search, set order and curator descriptors, and control access (public, password-protected, or private). Maps have status (draft → ready → published/archived) and organizing logic (time, neighborhood, route, purpose).

**Sample data:**
- **List (DB):** `title`, `slug`, `description`, `organizingLogic` (e.g. `NEIGHBORHOOD` | `TIME_OF_DAY` | `ROUTE` | `PURPOSE`), `status` (`DRAFT` | `READY` | `PUBLISHED` | `ARCHIVED`), `templateType` (`field-notes`), `accessLevel`, `published`, `publishedAt`.
- **Create map body:** `POST /api/maps` → `{ "title": "Silver Lake Natural Wine", "template": "field-notes" }` → response includes `id`, `slug` (e.g. `silver-lake-natural-wine-a1b2c3d4`).
- **Map list response:** `GET /api/maps` → `{ success: true, data: [{ id, title, slug, published, locationCount, viewCount, createdAt, updatedAt }] }`.

### 2. Public map view (Field Notes template)
Public maps at `/map/[slug]` use the Field Notes template: cover/header map with hydrology styling, scrollable place cards, and expanded full-screen map with marker clustering. Smart bounds use IQR-based outlier detection so the viewport fits the main cluster; desktop is split view (map + cards), mobile toggles list/map.

**Sample data:**
- **Public map API:** `GET /api/maps/public/silver-lake-natural-wine` → `{ success: true, data: { id, title, slug, description, mapPlaces: [{ orderIndex, descriptor, places: { id, slug, name, address, latitude, longitude, tagline, vibeTags, ... }, place_personality, price_tier }], creatorName, isOwner } }`.
- **Example slugs:** `/map/silver-lake-natural-wine`, `/map/venice-coffee-shops`, `/map/dtla-lunch-spots`.

### 3. Place (merchant) pages
Standalone place pages at `/place/[slug]` show hero photo, AI tagline, vibe tags, tips, pull quotes, hours, contact, and “Also on” coverage. Data degrades gracefully when fields are missing; the API is `/api/places/[slug]`.

**Sample data:**
- **Place API response (excerpt):** `GET /api/places/covell` → `data.location`: `{ id, slug: "covell", name, address, latitude, longitude, phone, website, instagram, description, category, neighborhood, cuisineType, priceLevel, photoUrl, photoUrls, hours, googlePlaceId, curatorNote, vibeTags: ["Standing room", "Surf crowd"], tips: ["Go early for a seat", "Cash only"], tagline: "Low-key wine bar with natural selections", pullQuote, pullQuoteSource, pullQuoteAuthor, prl: 3, scenesense: { ... }, appearsOn: [{ id, title, slug, creatorName }], guide: { id, title, slug, creatorName } }`.
- **Example slugs:** `covell`, `seco`, `budonoki`, `tabula-rasa-bar`, `psychic-wines`.

### 4. Voice Engine (AI content generation)
Claude-powered generation of taglines, vibe tags, tips, and pull quotes for places. Scripts and pipelines backfill and refresh this content; it feeds place cards and merchant pages.

**Sample data:**
- **Tagline:** `"Low-key wine bar with natural selections"`.
- **Vibe tags:** `["Standing room", "Surf crowd"]`.
- **Tips:** `["Go early for a seat", "Cash only"]`.
- **Pull quote:** `"The room has a bubbly energy as it fills up with creative directors who part-time in Lisbon..."` with `pullQuoteSource: "The Infatuation"`, `pullQuoteAuthor`.

### 5. Google Places enrichment
Backfill of address, hours, phone, website, types, price level, photos (as refs), and reverse-geocoded neighborhood from Google Place ID. Powers place data and PRL/materialization.

**Sample data:**
- **Stored fields:** `address`, `latitude`, `longitude`, `phone`, `website`, `priceLevel` (0–4), `googlePhotos` (array of refs or `{ name, photoReference }`), `hours` (openingHours JSON), `neighborhood` (reverse-geocoded), `placesDataCachedAt`.
- **Google Place ID example:** `ChIJK1i52rK_woARSal9_H7GrGc` (used for Place Details and photo URLs).

### 6. PRL and SceneSense (place readiness)
PRL (Place Readiness Level) is computed from materialized inputs (photos, tag/energy signals, reinforcement). SceneSense is assembled from that for the API. Same materializer is used by the cron evaluator and by `/api/places/[slug]` so census and live API stay in sync.

**Sample data:**
- **PRL values:** `1` (minimal) … `4` (full). API returns `data.location.prl` and `data.location.scenesense`.
- **PRL census:** `GET /api/admin/prl-census?limit=200&laOnly=1` (when `ADMIN_DEBUG=true`) → `{ success: true, data: { countsByPRL: { 1: 0, 2: 37, 3: 12, 4: 5 }, blockedFromPRL3: { HAS_ANY_PHOTO: 2, ... }, overriddenCount: 1, sampleSlugsByPRL: { 2: ["alba-los-angeles-...", "baby-bistro-..."], 3: ["covell", "seco", ...] }, generatedAt, limit, laOnly } }`.

### 7. Coverage pipeline
Scripts (`coverage-run`, `coverage-queue`, `coverage-apply`, etc.) audit places for missing data (hours, Google attrs, photos, description, tag signals), select candidates, and apply enrichments. Admin coverage UI and ledger track runs and applied coverage.

**Sample data:**
- **Missing groups:** `NEED_HOURS`, `NEED_GOOGLE_ATTRS`, `NEED_GOOGLE_PHOTOS`, `NEED_DESCRIPTION`, `NEED_TAG_SIGNALS`.
- **Coverage run report (excerpt):** `data/coverage/coverage_run__YYYYMMDD_HHMMSS.json` → `{ run_id, created_at, db_identity: { host, dbname }, params: { limit: 200, la_only: true, ttl_days, retry_backoff_hours }, counts: { total_places, by_prl: { prl_2: 37 }, by_missing_group: { NEED_DESCRIPTION: 13, NEED_HOURS: 3 }, candidates_count: 16, excluded_by_ttl, excluded_by_complete: 21 }, candidates: [{ place_id, slug: "budonoki", name: "Budonoki", google_place_id, dedupe_key, missing_groups: ["NEED_DESCRIPTION"], reason: "Missing: NEED_DESCRIPTION" }], top_20_candidates, duplicate_groups }`.

### 8. Photo evaluation (admin)
Admin UI at `/admin/photo-eval` lets reviewers tag place photos by tier (HERO, GALLERY, REJECT) and type (EXTERIOR, INTERIOR, CONTEXT, FOOD). Results feed PRL materialization (e.g. hero/interior approval) and place display.

**Sample data:**
- **Queue:** `GET /api/admin/photo-eval/queue` → list of `{ place_id, slug, name, google_place_id }`.
- **Place photos:** `GET /api/admin/photo-eval/[placeId]` → `{ place: { id, slug, name, google_place_id }, photos: [{ photo_ref, width_px, height_px, url, aspect?, score? }], portraitFallbackUsed? }`.
- **Save evaluation:** `POST /api/admin/photo-eval` → body `{ place_id, google_place_id, requested_max_width_px?: 1600, photos: [{ photo_ref, width_px, height_px, tier: "HERO"|"GALLERY"|"REJECT", type?: "EXTERIOR"|"INTERIOR"|"CONTEXT"|"FOOD" }] }`.

### 9. Creator dashboard and map editor
Authenticated creators use `/dashboard`, `/maps/new`, `/maps/[mapId]/edit`, and the legacy `/create/[mapId]/locations` and `/create/[mapId]/preview` flows. They create maps, add/order places, set descriptors, and publish; maps API supports CRUD, publish, archive, regenerate description.

**Sample data:**
- **Map detail:** `GET /api/maps/[id]` returns list + `map_places` with `places`; each MapPlace has `orderIndex`, `descriptor`, `notes`, custom photos.
- **Add location:** `POST /api/lists/[slug]/locations` adds a place to a list (resolve by Google Place ID or search → find-or-create Place → create MapPlace with `orderIndex`, `descriptor`).
- **Update map-place:** `PUT /api/map-places/[mapPlaceId]` → `{ descriptor, order, notes }`.

### 10. Import (CSV/JSON to maps)
Upload CSV/JSON at `/import`; preview, process, and add places to lists via `/api/import/*`. Resolves places by Google Place ID or search, find-or-create canonical Place, then creates MapPlace links.

**Sample data:**
- **CSV columns (add-to-list):** `Title` or `Name` (required), `Address`, `URL` (Google Maps URL to extract Place ID), `Comment` or `Note` (curator note). Example row: `Covell,4503 Hollywood Blvd,https://maps.google.com/...?place_id=ChIJ...,Best natural wine on the eastside`.
- **Request:** `POST /api/import/add-to-list` with `formData`: `file` (CSV), `listId` (list id or slug). Max 500 rows per file, 10MB.

### 11. Search
Search API (`/api/search`) returns places (and optionally maps) with personality/signals; used by typeahead and add-to-map flows. Places search (`/api/places/search`) supports query and lat/lng/radius.

**Sample data:**
- **Search:** `GET /api/search?q=natural+wine` → `{ neighborhoods: [], places: [{ slug, name, neighborhood, category, cuisineType, priceLevel, vibeTags, latitude, longitude, googlePlaceId, googlePhotos, hours, pullQuote, pullQuoteSource, editorialSources, chefRecs, ... }] }` (up to 50, then sorted/sliced for cards).
- **Editorial signals in results:** `eater38`, `latimes101`, `michelin`, `infatuation`, `chefrec` (from `editorialSources` / `chefRecs`).

### 12. Activity spots (skate / surf)
Separate layer for skateparks and surf breaks: `/api/spots`, `/api/spots/geojson`. Display is layer-based (SKATE | SURF), distinct from food/drink places.

**Sample data:**
- **Query:** `GET /api/spots?layer=SKATE&city=Los Angeles&region=venice-westside` → `{ success: true, data: [{ id, name, slug, latitude, longitude, layer_type: "SKATE"|"SURF", city, region, country, spot_type, tags: [], surface, skill_level, exposure, description, seasonality, enabled }], count }`.
- **GeoJSON:** `GET /api/spots/geojson` returns GeoJSON FeatureCollection for map layers.

### 13. Admin review queue
Admin review at `/admin/review` and `/api/admin/review-queue` for comparing raw records, merge/different/skip/flag. Used for dedup and data quality.

**Sample data:**
- **Queue:** `GET /api/admin/review-queue?status=pending&limit=20&offset=0` → `{ items: [...], stats: { pending, ... } }`. Each item has raw record A/B, optional canonical, conflict type; actions: merge, kept_separate, new_canonical, dismissed, flagged.
- **Resolve:** `POST /api/admin/review-queue/[id]/resolve` with `resolution`, `resolutionNotes`. Skip: `POST /api/admin/review-queue/[id]/skip`.

### 14. Admin tooling
Additional admin: coverage dashboard (`/admin/coverage`), Instagram backfill (`/admin/instagram`), place close (`/api/admin/places/[id]/close`), PRL census (`/api/admin/prl-census`), stats, import, and debug routes (env-guarded).

**Sample data:**
- **Close place:** `POST /api/admin/places/[id]/close` (sets golden_record `lifecycle_status` e.g. `CLOSED_PERMANENTLY`, `ARCHIVED`).
- **PRL census:** see bullet 6. Debug routes (e.g. `/api/debug/db`, `/api/debug/env`) only when debug enabled.

### 15. Auth and user
NextAuth.js for login/signup; forgot/reset password; session-based access to dashboard, editor, and import. Map ownership enforced for edit/publish/archive.

**Sample data:**
- **Session:** `getServerSession(authOptions)` → `{ user: { id, name, email, image } }`. Protected routes use `requireUserId()` or `requireOwnership(listId)`.
- **Endpoints:** `POST /api/auth/signup`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`; NextAuth at `/api/auth/[...nextauth]`.

### 16. Share cards and OG
Share cards (e.g. 9:16 stories, 1:1 feed) and OG image generation for maps so shared links show template-matched previews.

**Sample data:**
- **Formats:** 9:16 (Stories/Reels), 1:1 (feed). OG route: `GET /api/og/[mapId]` (or similar) returns dynamic image for map title + preview; template-specific visuals (Field Notes: parchment/charcoal style).

---

## For AI agents

- **Canonical place model:** `Place` (and golden-record style data where used) is the source of truth; `MapPlace` links places to lists with curator-specific fields.
- **Key APIs:** `GET /api/maps/public/[slug]` (public map), `GET /api/places/[slug]` (place + PRL/SceneSense), `POST /api/maps`, `POST /api/import/add-to-list`, `GET /api/search`.
- **Enrichment flow:** Google backfill → Voice Engine (taglines, tags, tips, quotes) → coverage scripts and photo-eval → PRL materialization → API and cron census.
- **Templates:** Field Notes is the active premium template (editorial, hydrology map style); Postcard, Neon, Zine are documented for future use.
- **Sample calls:** `curl -s "https://saikomaps.vercel.app/api/places/covell" | jq '.data.location | { slug, name, tagline, vibeTags, prl, scenesense }'`; `curl -s "https://saikomaps.vercel.app/api/maps/public/silver-lake-natural-wine" | jq '.data | { title, slug, mapPlaces: (.mapPlaces | length) }'`.
