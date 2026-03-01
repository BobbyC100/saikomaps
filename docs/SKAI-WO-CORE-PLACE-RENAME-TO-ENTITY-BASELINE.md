# SKAI-WO-CORE-PLACE-RENAME-TO-ENTITY — Phase 0 Baseline

**Captured:** 2026-02-28

## 1. Root identity table: `places`

- **Row count:** Run `SELECT COUNT(*) FROM places` (or `prisma.places.count()`)
- **Schema:** See `prisma/schema.prisma` model `places` (lines 199–296)

## 2. Tables referencing `places.id` (FK dependencies)

| Table | Column(s) | Notes |
|-------|-----------|-------|
| `map_places` | `place_id` | FK → places.id |
| `person_places` | `place_id` | FK → places.id |
| `categories` | (via relation `places[]`) | Reverse: places.categoryId → categories |
| `merchant_enrichment_runs` | `place_id` | FK → places.id |
| `merchant_signals` | `place_id` | PK, FK → places.id |
| `place_appearances` | `subject_place_id`, `host_place_id` | FK → places.id |
| `restaurant_groups` | (via places.restaurantGroupId) | Reverse relation |
| `viewer_bookmarks` | `place_id` | FK → places.id |
| `place_photo_eval` | `place_id` | FK → places.id |
| `energy_scores` | `place_id` | FK → places.id |
| `place_tag_scores` | `place_id` | FK → places.id |
| `place_coverage_status` | `place_id` | FK → places.id |
| `gpid_resolution_queue` | `place_id` | FK → places.id |
| `operator_place_candidates` | `place_id` | FK → places.id (nullable) |
| `place_actor_relationships` | `place_id` | FK → places.id |
| `places` (self) | `parent_id` | FK → places.id (hierarchy) |

## 3. Identity column rename scope

- **places.place_type** → **entities.entity_type** (PlaceType enum)
- **place_id** → **entity_id** in all FK columns above (except `parent_id`, which stays)

## 4. Out of scope (NOT renaming)

- `place_job_log` table (references `entity_id`/`entity_type` → golden_records, not places)
- Table names: `map_places`, `person_places`, `place_appearances`, `place_photo_eval`, `place_tag_scores`, `place_coverage_status`, `place_actor_relationships`, etc.
- `proposed_signals.place_id`, `operational_overlays.place_id` — these reference golden/identity; TBD if they point at places or golden_records. Schema shows no Prisma relation to places; likely golden/denormalized. **Leave as place_id for now** per “no sweeping rename” rule.

## 5. Raw SQL / files referencing `places` or `place_id`

- `lib/admin/coverage/sql.ts` — multiple queries: `FROM places`, `JOIN places`, `place_id`
- `scripts/backfill-golden-latlng-from-google.ts` — `LEFT JOIN places p`
- `scripts/backfill-google-places-attrs.ts` — `INNER JOIN places p`
- `scripts/probe-google-places-field-coverage.ts` — `INNER JOIN places p`
- `scripts/probe-google-places-raw-response.ts` — `INNER JOIN places p`
- `scripts/sync-db.ts` — `information_schema` check for `places` table
- `scripts/db-whoami.ts` — `information_schema` check for `places` table
- `scripts/sql/gpid-unique-preflight-and-rollout.sql` — `places` table
- `scripts/backfill-primary-vertical.sql` — `places.primary_vertical`

## 6. Prisma model usage

- `prisma.places` → `prisma.entities` (app routes, lib updated; scripts need manual update)
- Model: `places` → `entities`, compound keys: `mapId_placeId` → `mapId_entityId`, `viewerUserId_placeId` → `viewerUserId_entityId`

## 7. Migration status (2026-02-28)

- [x] Phase 0: Baseline documented
- [x] Phase 1: Migration `20260228100000_places_to_entities` applied
- [x] Phase 2: Prisma schema updated (model entities, relations, @@map)
- [x] Phase 3: App routes + lib updated
- [ ] Phase 4: Sanity checks (manual)
- [ ] Phase 5: Scripts bulk update + final grep

**Remaining:** ~60 scripts still use `prisma.places` / `db.places`. Run:
```bash
rg -l 'prisma\.places|db\.places' scripts/ | xargs -I{} sed -i '' 's/prisma\.places/prisma.entities/g; s/db\.places/db.entities/g' {}
```
Then update compound keys: `mapId_placeId` → `mapId_entityId`, `placeId: place.id` → `entityId: place.id` in map_places/viewer_bookmarks calls.
