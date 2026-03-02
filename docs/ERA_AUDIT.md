# Entity Record Awareness (ERA) Audit

**Goal:** Document how the system currently becomes aware of a place. Fact-finding only — no refactors, opinions, or proposals.

---

## 1. ERA Entry Paths

| Path | User Action | Tables Written | Immediate vs Deferred | GPID Guaranteed? |
|------|-------------|----------------|------------------------|------------------|
| **Map UI: Search** | User searches, selects result, clicks Add | `entities`, `map_places` | Immediate | Yes |
| **Map UI: Google Link** | User pastes Google Maps URL, selects place, clicks Add | `entities`, `map_places` | Immediate | Yes |
| **Map UI: CSV Upload** | User drops/selects CSV in AddLocationModal | `entities`, `map_places` | Immediate | No |
| **Import: Add-to-List** | CreaSKAI-WO-ENT-TIER1-002
Title: Tier 1 Field Backfill — Website, Category, Phone
Owner: Saiko Maps
Stage: Entity Pipeline → Tier 1 Completion
Status: Ready for execution

Objective:
Backfill Tier 1 completeness fields on entities that are already identified
(google_place_id present), using existing Google Places data only.

Scope:
- entities table only
- records with google_place_id IS NOT NULL
- NO new Google API calls unless explicitly required by existing scripts
- NO inference or guessing

Tier 1 Fields:
- website
- category (fallback to primary_vertical if needed)
- phone

Rules:
1. Only write a field if it is currently NULL or empty.
2. Only copy values that exist in Google payloads.
3. Do not overwrite existing human-edited values.
4. Do not attempt enrichment beyond Tier 1.
5. If Google does not provide the field, leave it NULL.

Execution Plan:
1. Identify entities with google_place_id and missing Tier 1 fields.
2. For each field:
   - website → copy from Google place details if present
   - phone → copy from Google place details if present
   - category → map from Google types to internal category if deterministic;
     otherwise leave blank.
3. Persist updates to entities.
4. Record updated_at on touched rows.

Validation:
Before:
- Count entities missing website
- Count entities missing category
- Count entities missing phone

After:
- Re-run same counts
- Confirm only expected residuals remain (parks, regions, non-point entities)

Out of Scope:
- Human review
- Tier 2 enrichment
- Golden record changes
- Re-identification
- Confidence recalculation

Success Criteria:
- Tier 1 coverage ≥ 95% for entities with google_place_id
- No regression in existing populated fields
- No increase in orphaned or ambiguous recordstor uploads CSV to existing map via AddLocationModal | `entities`, `map_places` | Immediate | No |
SKAI-WO-ENT-TIER1-002
Title: Tier 1 Field Backfill — Website, Category, Phone
Owner: Saiko Maps
Stage: Entity Pipeline → Tier 1 Completion
Status: Ready for execution

Objective:
Backfill Tier 1 completeness fields on entities that are already identified
(google_place_id present), using existing Google Places data only.

Scope:
- entities table only
- records with google_place_id IS NOT NULL
- NO new Google API calls unless explicitly required by existing scripts
- NO inference or guessing

Tier 1 Fields:
- website
- category (fallback to primary_vertical if needed)
- phone

Rules:
1. Only write a field if it is currently NULL or empty.
2. Only copy values that exist in Google payloads.
3. Do not overwrite existing human-edited values.
4. Do not attempt enrichment beyond Tier 1.
5. If Google does not provide the field, leave it NULL.

Execution Plan:
1. Identify entities with google_place_id and missing Tier 1 fields.
2. For each field:
   - website → copy from Google place details if present
   - phone → copy from Google place details if present
   - category → map from Google types to internal category if deterministic;
     otherwise leave blank.
3. Persist updates to entities.
4. Record updated_at on touched rows.

Validation:
Before:
- Count entities missing website
- Count entities missing category
- Count entities missing phone

After:
- Re-run same counts
- Confirm only expected residuals remain (parks, regions, non-point entities)

Out of Scope:
- Human review
- Tier 2 enrichment
- Golden record changes
- Re-identification
- Confidence recalculation

Success Criteria:
- Tier 1 coverage ≥ 95% for entities with google_place_id
- No regression in existing populated fields
- No increase in orphaned or ambiguous records| **Import: Process** | Admin/creator creates new map from CSV (setup flow) | `lists`, `locations`, `import_jobs` | Immediate (locations); deferred (enrichment) | No |
| **CLI: import-curated-csv-to-golden** | Manual: `--file` + `--batch` + `--apply` | `golden_records`, `raw_records`, `entity_links` | Immediate | Optional (can create without GPID) |
| **CLI: ingest-editorial-csv** | Manual: CSV path + source name | `raw_records` | Immediate | Optional |
| **CLI: import-* scripts** | Manual: various regional/editorial imports | `entities`, `map_places` | Immediate | Optional (varies by script) |
| **CLI: sync-golden-to-places** | Manual: sync golden → entities | `entities`, `map_places` | Immediate | From golden |
| **CLI: promote-orphans-to-golden** | Manual: promote entities → golden | `golden_records`, then sync | Immediate | Yes (only orphans with GPID) |

---

## 2. Map Creation UI (Specifics)

### Add Place via Search or Google Link

- **Trigger:** User selects a place from search results or pasted Google Maps link, then clicks Add.
- **API:** `POST /api/lists/[slug]/locations` with `placeId` (required).
- **Flow:**
  1. `addLocationSchema` requires `placeId` (min 1 char).
  2. `getPlaceDetails(googlePlaceId)` is called; 404 if not found.
  3. Find existing entity by `googlePlaceId`; if none, create entity.
  4. Create `map_place` linking entity to list.

- **Entity creation:** Yes, immediate. Find-or-create by `googlePlaceId`.
- **Bypass ERA / direct Golden?** No. Writes only to `entities` and `map_places`. Does not touch `golden_records`.
- **Minimum fields at creation:** `id`, `slug`, `googlePlaceId`, `name`, `address`, `latitude`, `longitude`, `phone`, `website`, `googleTypes`, `priceLevel`, `neighborhood`, `cuisineType`, `category`, `primary_vertical`, `googlePhotos`, `hours`, `placesDataCachedAt`. All from Google Place Details.

---

## 3. CSV Upload

### Add-to-List (`/api/import/add-to-list`)

- **Required columns:** `Title` or `Name` or `name` (at least one non-empty).
- **Optional columns:** `Address`/`address`, `URL`/`url`, `Comment`/`Note`/`comment`.
- **Resolve strategy:** URL → extract GPID → `getPlaceDetails`; else `searchPlace(name + address)` → first result → `getPlaceDetails`.
- **Duplicates:** Resolved at ingest. Find by `googlePlaceId` when present; if not found, create new entity. No GPID → no dedupe by GPID; each row can create a new entity.
- **Entities without GPID:** Yes. When URL has no GPID and search fails, entity is created with `googlePlaceId: undefined`, `name` from CSV (or "Untitled Place"), `address` from CSV if valid.
- **CSV-sourced marking:** None. No `sources`, `editorialSources`, or provenance field set for add-to-list entities.

### Import Process (`/api/import/process`)

- **Creates:** `locations` (list-bound), not `entities`. Different table. Map editor reads `map_places` → `entities`; lists created by this flow have 0 map_places until `migrate-locations-to-places.ts` is run.
- **Enrichment:** Sync (first 30) + async background. Updates `locations` with `googlePlaceId`, coords, etc. when Google resolves.
- **Migration:** `migrate-locations-to-places.ts` converts `locations` → `entities` + `map_places`. Can create entities without GPID if location has no GPID.

### import-curated-csv-to-golden

- **Target:** `golden_records` directly. Does not create `entities`; sync script creates entities later.
- **Required:** `name` (or `title`). Optional: `google_place_id`, `url`, `neighborhood`, `category`, `website`, `latitude`, `longitude`.
- **GPID:** Optional. Can create golden records without GPID; GPID extracted from URL when possible.

---

## 4. Awareness vs Canon

### No ERA Path Directly Confers Golden Status

- Map UI (search/link): Writes `entities` + `map_places` only.
- CSV add-to-list: Same.
- Import process: Writes `locations` only.
- `golden_records` is populated by:
  - `import-curated-csv-to-golden` (direct)
  - `ingest-editorial-csv` → `raw_records` → resolver → `entity_links` + `golden_records`
  - `export-to-resolver` (entities → raw + golden + links)
  - `promote-orphans-to-golden` (entities with GPID → golden)

### Golden Promotion Gates

- **`golden_records.promotion_status`:** `PENDING` | `VERIFIED` | `PUBLISHED`.
- **`promote-orphans-to-golden`:** Only entities with non-null, non-empty `google_place_id`.
- **`sync-golden-to-places`:** Creates/updates entities from `golden_records` where `lifecycle_status = ACTIVE`.
- **Survivorship:** `lib/survivorship.ts` — `updateGoldenRecord()` applies rules from linked `raw_records`; no direct ERA → Golden.

### Paths That Implicitly Assume Canonical Status

- Map editor and place pages read from `entities` (and `map_places`). They do not distinguish "awareness" vs "canonical."
- `sync-golden-to-places` creates entities using `golden.canonical_id` as `entity.id` when no entity exists — golden is treated as canonical source.
- Place page (`/place/[slug]`) resolves by `entities.slug`; no explicit check for Golden linkage in the main read path.

---

## 5. Failure / Drift Vectors

### Entities Without GPID

| Path | Can Create? |
|------|-------------|
| Map UI (search/link) | No |
| CSV add-to-list | Yes (when URL/search fails) |
| Import process → migrate | Yes (when location has no GPID after enrichment) |
| import-* scripts | Yes (e.g. `import-south-la-south-bay`, `import-sgv-master` use `googlePlaceId ?? undefined`) |
| sync-golden-to-places | Only when golden has GPID; creates entity with that GPID |

### Entities Without Normalized Slug/Name

- **Slug:** All entity creation paths use `generatePlaceSlug` + `ensureUniqueSlug`. Slug is always set.
- **Name:** CSV add-to-list can create with `cleanName` from CSV (including "Untitled Place") when search fails. Scripts use `finalName` from placeDetails or CSV fallback — possible non-normalized names.

### Paths Contributing to Canonical Drift

1. **CSV add-to-list without GPID:** Creates entities that cannot be deduped by GPID; same physical place can become multiple entities.
2. **import-* scripts with optional GPID:** Same risk when Google search fails.
3. **locations → entities migration:** Locations without GPID become entities without GPID; no GPID-based dedupe.
4. **Dual write paths:** `entities` (Map UI, add-to-list) and `golden_records` (curated CSV, resolver) are independent; sync is manual/scripted. Orphan entities (no golden) and orphan golden (no entity) can accumulate.
5. **promote-orphans-to-golden:** Only promotes entities with GPID; entities without GPID remain orphans.

---

## Summary: ERA Path → Tables → Guaranteed Fields → Known Risks

| ERA Path | Tables Written | Guaranteed Fields | Known Risks |
|----------|----------------|-------------------|-------------|
| Map UI search/link | `entities`, `map_places` | GPID, slug, name, address, lat/lng, category, etc. | None for this path |
| CSV add-to-list | `entities`, `map_places` | slug, name (min) | GPID optional; duplicates when search fails; no source marking |
| Import process | `locations`, `import_jobs` | name, address (from CSV) | No entities; locations need migration; GPID from enrichment |
| import-curated-csv-to-golden | `golden_records` (+ raw/links) | name, slug | GPID optional; bypasses entities |
| ingest-editorial-csv | `raw_records` | name | GPID optional; resolver creates golden later |
| import-* scripts | `entities`, `map_places` | Varies | GPID optional; some create without enrichment |
| sync-golden-to-places | `entities`, `map_places` | From golden | Only for golden with data |
| promote-orphans-to-golden | `golden_records` | — | Only entities with GPID; others stay orphaned |
