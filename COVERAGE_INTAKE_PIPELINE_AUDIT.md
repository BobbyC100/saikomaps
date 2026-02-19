# Coverage Intake → Dedup → Canonicalization → Insert Pipeline — Audit Report

**Date:** February 17, 2025  
**Scope:** Existing infrastructure only. No new code or refactors.

---

## 1. Existing Data Intake Scripts

### 1.1 CSV Imports

| Artifact | Purpose | Target | Notes |
|----------|---------|--------|--------|
| **`scripts/ingest-editorial-csv.ts`** | Editorial CSV → `raw_records` | `raw_records` | Expected columns: Name, Neighborhood, Category, Address, Source, SourceURL; optional: Phone, Website, Instagram, Latitude, Longitude, GooglePlaceID. Uses geocoding stub (not implemented). Computes H3 index from lat/lng. Upserts by `(source_name, external_id)`. npm: `ingest:csv`. |
| **`scripts/sgv-intake-dedup-phase1.ts`** | CSV labeling only (no DB writes) | N/A (writes back to CSV) | Reads `saiko_sgv_chinese_intake_phase1.csv`, queries `golden_records` (ACTIVE), assigns "Exact Match" / "Probable Duplicate" / "New" / "Needs Manual Review" and "Existing Place ID". Output: updated CSV. npm: `sgv-intake:dedup`. |
| **`app/api/import/add-to-list/route.ts`** | CSV upload → find-or-create Place → MapPlace | `places`, `map_places` | Parses CSV (Title/Name, Address, URL, Comment). Resolves via Google Place ID from URL or `searchPlace`; find-or-create by `googlePlaceId` then `places.create`; creates `map_places`. **Does not touch `raw_records` or `golden_records`.** |
| **`app/api/import/process/route.ts`** | Admin import: create list + locations with Google enrichment | `lists`, `locations`, `import_jobs` | Creates list and `locations` (list-bound), not `places`. Enriches via Google Places. |
| **Legacy CSV → places scripts** | Many one-off imports | `places`, `map_places`, `lists` | Pattern: read CSV (name, address, comment, url) → Google Places search/details → dedupe by name or `googlePlaceId` → `places.create` + `map_places.create`. Examples: `import-sgv-dim-sum-v2.ts`, `import-sgv-master.ts`, `import-westside-neighborhoods.ts`, `import-master-with-dedupe.ts`, `import-eater38-with-dedupe.ts`, `import-la-michelin.ts`, `import-long-beach.ts`, `import-santa-monica.ts`, `import-venice.ts`, `import-south-bay-beach.ts`, `import-san-fernando-valley.ts`, `import-south-la-south-bay.ts`, `import-pasadena-michelin.ts`, `import-latimes-missing-places.ts`. CSV paths and list slugs often hardcoded. |

**Summary:** Two intake paths exist in parallel:

- **MDM path:** CSV → `ingest-editorial-csv.ts` → `raw_records` → resolver → `entity_links` / `review_queue` → golden_records (and optionally `sync-golden-to-places`).
- **Legacy path:** CSV → import-* scripts or add-to-list API → `places` (+ `map_places` / `lists`). No `raw_records` or `golden_records`.

### 1.2 Google Places Ingestion

| Artifact | Purpose | Notes |
|----------|---------|--------|
| **`lib/google-places.ts`** | Search + place details | `searchPlace()`, `getPlaceDetails()`, `parseNeighborhood()`, `getNeighborhoodFromPlaceDetails()`, `getNeighborhoodFromCoords()`. Used by import scripts and add-to-list. Requires `GOOGLE_PLACES_ENABLED=true` and `GOOGLE_PLACES_API_KEY`. |
| **`scripts/backfill-google-places.ts`** | Backfill existing places with Google data | Targets `places` table. |
| **`scripts/backfill-google-ids.ts`** | Backfill Google Place IDs | Targets `places`. |
| **`scripts/enrich-google-places.ts`**, **`enrich-google-places-v2.ts`** | Enrich places with Google data | Legacy `places` and/or golden_records usage. |
| **Import scripts** | Resolve name/address via Google, then create place | All legacy import-* scripts call `searchPlace` / `getPlaceDetails` before creating `places`. |

Google Places is used for: (1) resolving CSV rows to a place (name/address → placeId/details), (2) deduplication by `googlePlaceId`, (3) backfill/enrichment. It is **not** a standalone “ingestion pipeline” into `raw_records`; editorial CSV ingestion does not require Google IDs (optional column).

### 1.3 Menu / Wine List Ingestion

| Artifact | Purpose | Target | Notes |
|----------|---------|--------|--------|
| **`scripts/scrape-menus-from-websites.ts`** | Scrape menu + winelist from place websites | `golden_records` | Updates `menu_url`, `menu_raw_text`, `winelist_url`, `winelist_raw_text`, `about_copy`, `scraped_at`, `scrape_status` on `golden_records`. Uses website crawler; **only operates on golden_records** (not `places`). |
| **`lib/signals/upsertMenuSignals.ts`** | AI analysis of `menu_raw_text` → structured signals | `menu_signals` | Reads `golden_records.menu_raw_text`; writes/updates `menu_signals` (payload, evidence, confidence). Skip if same `source_scraped_at` and status ok. |
| **`lib/signals/upsertWinelistSignals.ts`** | AI analysis of `winelist_raw_text` → structured signals | `winelist_signals` | Same pattern as menu. |
| **`scripts/analyze-menu-winelist-signals.ts`** | Batch run menu/winelist signal extraction | `menu_signals`, `winelist_signals` | Processes `golden_records` with `menu_raw_text` or `winelist_raw_text`. |
| **`scripts/extract-identity-signals.ts`** | Identity signals from scraped content | `golden_records` (identity fields) | Updates `cuisine_posture`, `service_model`, `price_tier`, `wine_program_intent`, `place_personality`, `identity_signals` on golden_records. |
| **`scripts/monitor-and-extract.ts`**, **`check-pipeline-progress.ts`** | Monitor scrape + extraction progress | N/A | Counts scraped vs total, ready-to-extract, etc. |

Menu/wine ingestion is **post-canonical**: it runs on `golden_records` (and optionally syncs to `places` via `sync-golden-to-places`). There is no separate “menu intake” that creates places or raw records.

### 1.4 Other Place-Creation Logic

| Artifact | Purpose | Target |
|----------|---------|--------|
| **`scripts/export-to-resolver.ts`** | One-time migration: `places` → `raw_records` + `entity_links` | `raw_records`, `entity_links` |
| **`scripts/sync-golden-to-places.ts`** | Copy ACTIVE `golden_records` → `places` (create or update) | `places` |
| **`scripts/add-test-places.ts`** | Create test golden records (and optionally links) | `golden_records` |
| **`scripts/ensure-validation-linkage.ts`** | Create missing `places` or `golden_records` for validation | `places`, `golden_records` |
| **`app/api/lists/[slug]/locations/route.ts`** | Add location to list (Google resolve → find-or-create Place) | `places`, `locations` (list-bound) |

**Summary:** New “places” are created in two ways: (1) **Legacy:** import scripts or add-to-list → `places` (+ map_places/locations). (2) **MDM:** `raw_records` → resolver or review → `golden_records` → optionally `sync-golden-to-places` → `places`.

---

## 2. Existing Deduplication / Normalization Logic

### 2.1 Name Normalization Utilities

Multiple **inconsistent** implementations; no single shared module.

| Location | Behavior | Used by |
|----------|----------|--------|
| **`scripts/sgv-intake-dedup-phase1.ts`** | Lowercase, trim, `&`→`and`, strip punctuation, collapse spaces, strip trailing `(Location)`, strip suffix tokens (restaurant, cafe, kitchen, etc.) at end | SGV intake CSV labeling vs golden_records |
| **`scripts/ingest-editorial-csv.ts`** | Lowercase, trim, remove the/a/an, quotes, collapse spaces, remove restaurant/cafe/bar/grill/kitchen/eatery/bistro, non-word chars | raw_records `name_normalized` on ingest |
| **`scripts/resolver-pipeline.ts`** | Same as ingest-editorial-csv (the/a/an, quotes, spaces, restaurant/cafe/…, non-word) | Resolver (not used for DB write; raw_records already have name_normalized from ingest) |
| **`scripts/export-to-resolver.ts`** | Same pattern as ingest (the/a/an, quotes, spaces, + brasserie) | Export places → raw_records |

**Risk:** Any new intake that does its own normalization will diverge from these unless a single shared function is used.

### 2.2 Slug Generation

| Artifact | Purpose | Used for |
|----------|---------|----------|
| **`lib/place-slug.ts`** | `generatePlaceSlug(name, neighborhood?)` → URL-safe slug; `ensureUniqueSlug(base, exists)` → append random suffix if collision | Legacy `places`: import scripts, add-to-list API, migrate-locations-to-places, lists locations API |
| **`lib/utils.ts`** | `generateSlug(text)` (generic) | List slugs in import scripts (e.g. `generateSlug(listTitle)-${Date.now()}`) |
| **`scripts/sgv-intake-dedup-phase1.ts`** | `slugFromName(name)` inline: lowercase, `&`→`and`, strip punctuation, spaces→hyphens, trim hyphens | Comparison only; not used for DB |
| **`lib/survivorship.ts`** | `generateUniqueSlug(name, neighborhood?)` using `slugify` + collision check on `golden_records` | Golden record slug on survivorship upsert |

So: **places** use `lib/place-slug` (+ `ensureUniqueSlug` against `places`). **Golden records** use survivorship’s own `generateUniqueSlug` (slugify + collision on `golden_records`). SGV intake has a third, local slug-like string for match only.

### 2.3 Golden Record Matching

| Artifact | Logic | Notes |
|----------|--------|--------|
| **`scripts/resolver-pipeline.ts`** | (1) Google Place ID exact: unprocessed raw with `google_place_id` → find already-linked raw with same ID → auto-link to same canonical. (2) Placekey exact: group by placekey → create one golden + link all. (3) H3 blocking + Jaro–Winkler name + address similarity; thresholds AUTO_LINK 0.90, REVIEW 0.70. | Creates `entity_links`; for “no candidates” or “kept separate” creates minimal golden + link. Does **not** call `updateGoldenRecord()` after auto-link. |
| **`scripts/sgv-intake-dedup-phase1.ts`** | Exact match: raw name, normalized name, or slug. Probable duplicate: normalized match + raw name similarity. Else New or Needs Manual Review. Substring/ambiguous → Manual Review. | CSV-only; no DB writes; compares to `golden_records` only. |
| **Legacy import scripts** | Dedupe by exact name or by `googlePlaceId` against existing `places`; then create new `places` if not found. | No golden_records; no raw_records. |

There is **no** single “golden record matching” service used by both MDM and legacy paths; resolver is for raw→golden, SGV intake is for CSV vs golden only.

### 2.4 Lifecycle Status Handling

- **Schema:** `golden_records.lifecycle_status` enum: `ACTIVE`, `LEGACY_FAVORITE`, `FLAG_FOR_REVIEW`, `ARCHIVED`, `CLOSED_PERMANENTLY`. Optional `archive_reason`, `archived_at`, `archived_by`.
- **Usage:** Scripts and UI filter with `lifecycle_status: 'ACTIVE'` (e.g. sgv-intake-dedup-phase1, sync-golden-to-places, coverage, export scripts, audit-golden-profile). `app/api/admin/places/[id]/close/route.ts` sets `lifecycle_status` (e.g. CLOSED_PERMANENTLY / ARCHIVED). `audit-aging.ts` and `check-dead-websites.ts` suggest or set FLAG_FOR_REVIEW / LEGACY_FAVORITE / ARCHIVED.
- **places table:** `status` enum OPEN / CLOSED / PERMANENTLY_CLOSED; no direct coupling to golden lifecycle in code (sync-golden-to-places does not sync lifecycle_status to places).

---

## 3. Canonicalization Infrastructure

### 3.1 Golden Record Creation

| Path | How golden is created | Full survivorship? |
|------|------------------------|---------------------|
| **Resolver – placekey prepass** | One golden per placekey group; slug `placekey-${uuid.slice}`, minimal fields. | No; no `updateGoldenRecord` call. |
| **Resolver – no candidates** | One golden per raw; slug `unknown-${uuid.slice}`. | No. |
| **Resolver – kept separate (below REVIEW)** | Same as no candidates. | No. |
| **Resolver – auto-link (above AUTO_LINK)** | Only `entity_links` created; golden already exists. | No; `updateGoldenRecord` is **not** called, so new raw data is not merged into golden. |
| **Review queue – resolution “merged”** | Links created + `updateGoldenRecord(canonicalId)` called. | Yes. |
| **export-to-resolver** | Creates raw_records + entity_links from places; can run `updateGoldenRecord` for migrated canonicals. | Yes for those it updates. |
| **add-test-places.ts** | Direct `golden_records.create` with minimal data. | N/A. |

So: **only the review-queue “merged” resolution and export-to-resolver path** run full survivorship. Resolver-created or resolver-auto-linked goldens can have placeholder slugs and no merged fields from newly linked raws.

### 3.2 Place → Golden Record Relationships

- **Schema:** `entity_links(canonical_id, raw_id, match_confidence, match_method, is_active, linked_by)`; `raw_records` → `entity_links` → `golden_records` (canonical_id). No direct `places` → `golden_records` FK.
- **Sync:** `sync-golden-to-places` copies golden → place by slug; place `id` can be set to `canonical_id` for “easy linking.” So relationship is **derived**: golden_records (source of truth) → sync script → places.
- **Provenance:** `provenance.place_id` references `golden_records.canonical_id` (FK). Tracks added_by, source_type, source_name, source_url, import_batch, etc.

### 3.3 Source-of-Truth Fields

- **Golden record:** name, lat/lng, address_*, neighborhood, category, phone, website, instagram_handle, hours_json, description, vibe_tags, price_level, business_status, etc. `source_attribution` and `provenance_v2` record which source “won” per field.
- **Survivorship:** `lib/survivorship.ts` (priority order per field) and `lib/survivorship-v2.ts` (`pickBestValue` by source quality from `lib/source-registry.ts`) for address, phone, website, hours. Other fields use legacy priority in survivorship.ts.
- **Source registry:** `lib/source-registry.ts` defines `SOURCE_QUALITY` (e.g. editorial_eater 0.95, google_places 0.85). Unknown sources get 0 and lose.

### 3.4 Confidence Logic

- **entity_links.match_confidence:** Decimal 0–1; stored for each link (e.g. resolver, manual_review).
- **entity_links.match_method:** e.g. `placekey_exact`, `google_place_id_exact`, `dedupe_ml`, `manual_review`, `new_entity`.
- **review_queue.match_confidence:** Used when sending to review (between REVIEW and AUTO_LINK thresholds).
- **golden_records:** `data_completeness` (0–1), `source_count`. No single “confidence” field on the golden record itself; confidence is per-link and per-review item.
- **Menu/winelist signals:** `menu_signals` / `winelist_signals` have `confidence` and `status` (ok/partial/failed).

---

## 4. Review Tools

### 4.1 Duplicate-Review UI

| Artifact | Purpose | Data model |
|----------|---------|------------|
| **`app/admin/review/page.tsx`** | Review queue page | Renders `<ReviewQueue />`. |
| **`app/admin/review/components/ReviewQueue.tsx`** | Queue list, keyboard (M/D/S/F/N/P), merge/different/skip/flag | Fetches `/api/admin/review-queue?status=pending&limit=20`. |
| **`app/admin/review/components/ComparisonCard.tsx`**, **ActionBar.tsx**, **QueueHeader.tsx**, **FieldRow.tsx**, **ProximityBadge.tsx** | Compare two raw records, show distance, actions | Hydrated review items (raw A/B, optional existing canonical). |
| **Resolution API** | `POST /api/admin/review-queue/[queueId]/resolve` with resolution (merged, kept_separate, new_canonical, dismissed, flagged) | Calls `resolveReviewQueueItem` from `lib/review-queue.ts`; on “merged” creates entity_links and calls `updateGoldenRecord`. |

This is the **only** duplicate/review UI: raw_record A vs raw_record B (and optional existing golden). It is for **MDM** (raw → golden), not for merging two `places` or two golden records.

### 4.2 Manual Resolution Tools

- **Review queue:** Merge / kept_separate / new_canonical / dismissed / flagged via UI or API; `resolved_by` stored.
- **Scripts:** `merge-duplicate-places.ts` merges **places** (map_places and viewer_bookmarks moved to “keep” place, duplicate place deleted). **Does not touch golden_records or raw_records.** Hardcoded MERGE_OPERATIONS list.
- **find-duplicate-places.ts** finds `places` with duplicate `google_place_id`; **uses `prisma.place`** (see Risks). No UI; script-only.

### 4.3 Admin Panels Related to Place Identity

| Route / artifact | Purpose |
|-------------------|---------|
| **`/admin/review`** | Entity resolution review (raw vs raw, merge into golden). |
| **`/admin/coverage`** | Same content as `/coverage`: coverage audit (total, LA/Orange county, top neighborhoods from **golden_records**). |
| **`/coverage`** (and **CoverageContent.tsx**) | Counts ACTIVE golden_records; LA County, Orange County; top neighborhoods. |
| **`lib/admin/coverage/sql.ts`** | Raw SQL for “overview” and “missing fields” — written against **places** (reachable via map_places, addressable, etc.). Not used by CoverageContent.tsx (which uses Prisma on golden_records). |
| **`app/api/admin/places/[id]/close/route.ts`** | Set golden_record lifecycle_status (e.g. CLOSED_PERMANENTLY / ARCHIVED). |

So: coverage **UI** is golden_records-based; coverage **SQL** is places-based. No admin UI for merging places by hand or for editing golden identity (e.g. slug/name) in one place.

---

## 5. Insert Pathways

### 5.1 How New Places Are Currently Inserted

- **Legacy path (most imports + add-to-list):**  
  Resolve (Google) → `db.places.findUnique({ googlePlaceId })` or name match → if not found, `db.places.create(...)` then `db.map_places.create(...)` (or create locations for process import). Required: id (UUID), slug (unique), name; optional but common: googlePlaceId, address, lat/lng, phone, website, neighborhood, category, hours, etc.

- **MDM path:**  
  `raw_records` (from ingest-editorial-csv or export-to-resolver) → resolver or review → `golden_records` (created by resolver or by review merge + survivorship) → optionally **`sync-golden-to-places`** → `places` created/updated from golden. So “insert” into places for MDM is the sync script, not the resolver itself.

- **Direct golden creation:**  
  `add-test-places.ts`, resolver when creating “new entity” or placekey group — minimal golden record, no survivorship run.

### 5.2 Required Fields

- **places (Prisma):** `id`, `slug` (unique), `name`, `updatedAt`. `googlePlaceId` unique if set. All other fields nullable or have defaults.
- **golden_records:** `canonical_id` (PK), `slug` (unique), `name`, `lat`, `lng`, `source_attribution` (JSON), `cuisines` (array), `vibe_tags`, `signature_dishes`, `pro_tips`; `business_status` default `operational`; `lifecycle_status` default ACTIVE. Survivorship upsert fills many more.
- **raw_records:** `source_name`, `raw_json`; optional but used: `external_id`, `name_normalized`, `lat`, `lng`, `h3_index_r9`, `h3_neighbors_r9`, `is_processed`.

### 5.3 Schema Constraints

- **places:** `slug` unique, `googlePlaceId` unique, `map_places` unique (mapId, placeId).
- **golden_records:** `slug` unique, `placekey` unique; `provenance.place_id` → golden_records.
- **raw_records:** unique (`source_name`, `external_id`).
- **entity_links:** composite PK (canonical_id, raw_id).

### 5.4 Prisma Models Relevant to Places and Golden Records

- **places:** id, slug, googlePlaceId, name, address, lat/lng, phone, website, instagram, hours, description, googlePhotos, googleTypes, priceLevel, neighborhood, category, status, editorialSources, cuisineType, tagline, vibeTags, chefRecs, restaurantGroupId, intentProfile, reservationUrl, placeType, categoryId, parentId, etc. Relations: map_places, person_places, restaurant_groups, category_rel, parent/children, viewer_bookmarks.
- **golden_records:** canonical_id, placekey, google_place_id, slug, name, name_display, lat, lng, address_*, neighborhood, category, cuisines, price_level, phone, website, instagram_handle, hours_json, description, vibe_tags, signature_dishes, pro_tips, pull_quote*, business_status, lifecycle_status, archive_*, source_attribution, provenance_v2, data_completeness, source_count, menu_*, winelist_*, scraped_at, scrape_status, identity signals, tagline*, energy/formality scores, etc. Relations: entity_links, review_queue, provenance, menu_signals, winelist_signals.
- **raw_records:** raw_id, source_name, external_id, source_url, placekey, h3_index_r9, h3_neighbors_r9, raw_json, name_normalized, lat, lng, observed_at, ingested_at, is_processed. Relations: entity_links_from, review_queue (as A/B).
- **entity_links:** canonical_id, raw_id, match_confidence, match_method, is_active, linked_at, linked_by. Links raw_records to golden_records.
- **provenance:** place_id → golden_records; added_by, source_type, source_name, source_url, import_batch, etc.

---

## 6. Risks

### 6.1 Duplicating Logic / Drift

- **Name normalization:** Four different implementations (sgv-intake, ingest-editorial-csv, resolver, export-to-resolver). New pipelines that normalize names again will diverge unless a single shared utility is used.
- **Slug generation:** Two systems (place-slug for places, survivorship’s generateUniqueSlug for golden). SGV intake uses a third for comparison only. Reusing one for the other without care can cause collisions or inconsistent URLs.
- **Dedup rules:** Resolver uses H3 + Jaro–Winkler + thresholds; SGV intake uses normalized name + slug + substring rules. Legacy imports use exact name or googlePlaceId. Reimplementing “dedup” elsewhere will behave differently unless one strategy is chosen and reused.

### 6.2 Script Conflicts

- **Legacy imports vs sync-golden-to-places:** Legacy scripts create/update `places` only. If the same logical place is later represented as a golden and synced, you can get two rows (different ids/slugs) or overwrite — depending on whether sync uses slug or id. Sync uses slug for lookup and uses `canonical_id` as place `id` when creating; so legacy-created places with different slugs won’t be “merged” by sync, they’ll be separate.
- **ingest-editorial-csv vs resolver:** Ingest sets `is_processed: false`. Resolver processes in batches (e.g. 100). If two ingest runs overlap or resolver and another writer run together, ordering and duplicate raw_records (same source_name + external_id) are handled by upsert, but race on is_processed is possible.
- **Resolver creating goldens without survivorship:** New-entity and placekey goldens have minimal data and placeholder slugs. If something else (e.g. UI) assumes golden slugs are human-readable or complete, it will break. Auto-linked records don’t refresh the golden until someone runs a batch `updateGoldenRecord` or similar (not currently in resolver).

### 6.3 Deprecated or Partially Implemented Systems

- **find-duplicate-places.ts / merge-duplicate-places.ts:** Use **`prisma.place`** (singular). Prisma model is **`places`**. These scripts will throw at runtime unless the project uses a client that exposes `place` (e.g. custom mapping). They are **places**-only; no golden or raw integration.
- **lib/admin/coverage/sql.ts:** All queries target **places** (reachable, addressable, missing fields). The coverage **UI** (CoverageContent) uses **golden_records**. So “coverage” numbers can differ depending on whether you look at SQL-based reports (places) or the UI (golden_records).
- **Geocoding in ingest-editorial-csv:** Commented out; returns null. Rows without Latitude/Longitude won’t get H3, so resolver’s H3 blocking won’t help for those.
- **Provenance.place_id:** Points at golden_records. No FK from places to golden; provenance is golden-centric. Legacy-created places have no provenance entries unless something backfills them.

---

## 7. Recommendations

### 7.1 Reuse

- **MDM path for new coverage intake:** Use `raw_records` + resolver + review queue + survivorship as the canonical path. Ingest CSVs (or future sources) into `raw_records`, then run resolver and review; use `updateGoldenRecord` after any batch of new links (consider adding a post-resolver step or cron that runs survivorship for recently linked canonicals).
- **Single intake into raw_records:** Reuse/extend `ingest-editorial-csv.ts` pattern (or a shared “raw ingest” module) so all intake writes the same shape (source_name, external_id, raw_json, name_normalized, lat, lng, H3) and avoids reimplementing normalization in each script.
- **Review UI:** Keep using `/admin/review` and `lib/review-queue.ts` for human resolution; extend with “batch resolve” or “accept all high-confidence” only if you add the same survivorship refresh after link creation.
- **Survivorship and source registry:** Keep using `lib/survivorship.ts` and `lib/survivorship-v2.ts` plus `lib/source-registry.ts` for golden record field resolution; register any new sources in the registry.
- **Google Places:** Keep using `lib/google-places.ts` for resolve and enrich; ensure intake that needs coordinates/Google ID either gets them in CSV or uses a single geocoding implementation (e.g. in ingest) so H3 and resolver work.

### 7.2 Extend

- **Normalization:** Add one shared module (e.g. `lib/normalize-place-name.ts`) used by ingest-editorial-csv, resolver, export-to-resolver, and sgv-intake-dedup-phase1 (and any new intake). Optionally a shared “slug for matching” helper used only for comparison, distinct from DB slug generation.
- **Resolver post-link step:** After creating entity_links (auto-link or placekey), call `updateGoldenRecord(canonicalId)` so new goldens and updated goldens get full survivorship and proper slugs.
- **Coverage and admin:** Either (a) make coverage SQL and UI both use golden_records (and deprecate places-based coverage), or (b) document clearly that “coverage” in UI = golden_records and “coverage” in SQL = places, and add a small note in the UI.
- **Lifecycle and sync:** If places are still the public-facing table, consider syncing `lifecycle_status` (or a derived status) from golden to places in `sync-golden-to-places` so closed/archived goldens don’t still show as open on the site.

### 7.3 Avoid

- **New one-off import scripts that write only to `places`:** They bypass MDM and create duplicate or inconsistent identity with golden_records. Prefer intake → raw_records → resolver/review → golden → sync.
- **New normalization or slug logic in isolation:** Use or extend the shared module above to avoid drift.
- **Relying on resolver-created goldens without a survivorship pass:** Either run survivorship after resolver or document that “new entity” goldens are placeholders until review or batch update.
- **Using find-duplicate-places / merge-duplicate-places as-is:** Fix Prisma model name to `places` if you keep them; and decide whether duplicate handling should be golden-centric (merge goldens / links) rather than places-only.
- **Adding a second “duplicate review” UI for places without connecting it to golden/raw:** That would perpetuate two notions of identity (places vs golden). Prefer one resolution flow (raw → golden) and one sync to places.

---

*End of audit.*
