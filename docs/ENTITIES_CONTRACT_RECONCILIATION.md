# Entities Contract Reconciliation

**Status:** Analysis Complete — No Schema Changes Applied  
**Owner:** Bobby  
**Executor:** Cursor (Cortez)  
**Date:** 2026-03-09  
**Scope:** `entities` table — schema reality, field classification, dependency audit, cleanup plan

---

## Executive Summary

The `entities` table has accumulated four distinct responsibilities that were never formally separated:

1. **Routing shell** — `id`, `slug`, `primary_vertical`, `status`, `businessStatus`, `entity_type`
2. **Canonical data** — name, address, coordinates, contact info (now partially migrated to `canonical_entity_state`)
3. **Editorial content** — taglines, pull quotes, tips (now partially migrated to `interpretation_cache`)
4. **Operational pipeline state** — `enrichment_stage`, `last_enriched_at`, `needs_human_review`, `category_enrich_attempted_at`

Two DEFERRED migrations exist in migration history that would strip categories 2–4 from entities, leaving only the routing shell. They cannot be applied yet because downstream read paths have not been fully migrated. This document establishes the contract, audits all dependencies, classifies every field, and proposes a staged cleanup plan.

---

## Deliverable 1 — Entities Contract Definition

### Intended Purpose

`entities` is the **canonical identity anchor** of the Saiko data model. Every place that exists in the system has exactly one row in `entities`. Its primary function is to serve as the stable FK target that all downstream tables — enrichment outputs, interpretation caches, scoring engines, membership lists, review queues — point to.

In its **final intended state** (after the deferred migrations are applied), `entities` should contain only:

| Field | Reason |
|---|---|
| `id` | Primary key — FK target for all downstream tables |
| `slug` | Routing key — URL-safe canonical identifier |
| `primary_vertical` | Used for routing, filtering, display scoping |
| `status` | `PlaceStatus` enum: `OPEN / CLOSED / PERMANENTLY_CLOSED` |
| `businessStatus` | From Google — operational closure signal (`CLOSED_PERMANENTLY` gates page display) |
| `entity_type` | `venue / activity / public` |
| `created_at` | Immutable provenance timestamp |
| `updated_at` | Lifecycle tracking |

All other data belongs in specialized downstream tables.

### What Belongs in entities (After Cutover)

- **Identity anchors only**: `id`, `slug`, `primary_vertical`, `status`, `businessStatus`, `entity_type`
- **Lifecycle timestamps**: `created_at`, `updated_at`
- **No data-carrying fields** of any kind — these belong in `canonical_entity_state`, `interpretation_cache`, or `derived_signals`

### What Does NOT Belong in entities

| Category | Examples | Correct home |
|---|---|---|
| Canonical data | name, address, lat/lng, phone, website, hours | `canonical_entity_state` |
| Editorial content | tagline, pull_quote, tips | `interpretation_cache` |
| Operational pipeline state | `enrichment_stage`, `last_enriched_at`, `needs_human_review`, `category_enrich_attempted_at` | `place_coverage_status` or dedicated ops table |
| Confidence/scoring | `confidence`, `overall_confidence`, `confidence_updated_at` | `canonical_sanctions` + `canonical_entity_state` |
| Description enrichment metadata | `description_source`, `description_confidence`, `description_reviewed` | `canonical_sanctions` |
| Legacy/deprecated fields | `restaurantGroupId`, `adUnitOverride`, `chef_recs`, `intentProfile`, `prlOverride`, `marketSchedule`, `transitAccessible`, `thematicTags`, `contextualConnection`, `curatorAttribution` | Nowhere — retire |
| Hierarchy | `parentId` | Evaluate: `place_actor_relationships` or dedicated hierarchy table |
| Category FK | `categoryId` | `canonical_entity_state.category` (string) |

### Downstream Consumers (Current State)

**API Routes:**
- `app/api/places/[slug]/route.ts` — Primary consumer; uses a dual-read strategy (canonical_state primary, legacy entities fallback). Will become routing-shell-only after slim-entities migration.
- `app/api/admin/places/search/route.ts` — Queries entities for admin search
- `app/api/maps/public/[slug]/route.ts` — Reads map_places → entities
- `app/api/admin/photo-eval/[placeId]/route.ts` — Reads entities for admin
- `app/api/admin/actors/candidates/[candidateId]/attach/route.ts` — Reads entities
- `app/api/search/route.ts` — Queries entities
- `app/api/user/saved-places/route.ts` — Reads via viewer_bookmarks → entities
- Several other routes via relation joins

**Views:**
- `v_places_la_bbox` — Selects ~35 columns directly from entities (will break after slim-entities migration)
- `v_entity_launch_readiness_v0` — Scores entities against a readiness rubric; references columns that will be dropped AND references stale table names (`entity_appearances`, `entity_photo_eval`) that no longer exist

**Enrichment Scripts** (writing operational fields):
- `lib/website-enrichment/write-rules.ts` — Writes `last_enriched_at`, `needs_human_review` to entities
- `scripts/run-website-enrichment.ts` — Queries entities by `last_enriched_at`
- `scripts/seco-derived-reset.ts` — Reads and resets `last_enriched_at`, `needs_human_review`, `enrichment_stage` on entities

**FK Dependents** (tables pointing to `entities.id`):
`map_places`, `person_places`, `viewer_bookmarks`, `energy_scores`, `place_tag_scores`, `place_photo_eval`, `place_coverage_status`, `gpid_resolution_queue`, `place_actor_relationships`, `operator_place_candidates`, `place_appearances`, `merchant_enrichment_runs`, `merchant_signals`, `coverage_sources`, `merchant_surface_scans`, `merchant_surfaces`, `menu_fetches`, `canonical_entity_state`, `observed_claims`, `derived_signals`, `interpretation_cache`, `FieldsMembership`, `TraceSignalsCache`

---

## Deliverable 2 — Dependency / Touch Audit

### enrichment_stage

| Location | Type | Detail |
|---|---|---|
| `prisma/migrations/20260226120000_merchant_website_enrichment/migration.sql` | Origin | Added as `TEXT` column to `places` table (since renamed to `entities`) |
| `prisma/migrations/20260305200000_drop_entities_vibe_tags/migration.sql` | Read | Included in `v_places_la_bbox` view SELECT list |
| `prisma/migrations/20260306200000_slim_entities_fields_v2/migration.sql` | Deferred drop | `DROP COLUMN IF EXISTS enrichment_stage` |
| `lib/website-enrichment/write-rules.ts` | Write (avoided) | Explicitly omitted from update: `// enrichment_stage omitted: the DB column is an EnrichmentStage enum but the Prisma schema maps it as String?` |
| `scripts/seco-derived-reset.ts` | Raw SQL write | `enrichment_stage = NULL` via raw SQL (bypasses Prisma enum issue) |
| `scripts/backfill-donnas-golden-link.ts` | Comment | Notes the `enrichment_stage coercion issue` as reason to use raw SQL |
| `scripts/backfill-donnas-prl.ts` | Comment | `Use raw SQL to avoid Prisma's enrichment_stage enum mismatch (P2032 pre-existing schema drift)` |
| `scripts/backfill-donnas-menu-wine.ts` | Comment | Notes enrichment_stage as unrelated field causing Prisma issue |

**Type Drift Finding:** The DB column `enrichment_stage` was created as `text` by migration `20260226120000`, but somewhere between creation and now it became a native PostgreSQL enum type `EnrichmentStage`. The Prisma schema maps it as `String?`, which causes Prisma to fail on round-trip reads (`P2032`). This is confirmed by three independent backfill scripts documenting workarounds. **The Prisma schema is out of sync with the database on this field.**

### last_enriched_at

| Location | Type | Detail |
|---|---|---|
| `lib/website-enrichment/write-rules.ts:116` | Write | `last_enriched_at: new Date()` on successful enrichment run |
| `scripts/run-website-enrichment.ts:78` | Read (query filter) | Selects entities where `last_enriched_at` is null or older than 180 days |
| `scripts/seco-derived-reset.ts:40,111,215` | Read + Write | Reads then resets to NULL via raw SQL |
| `prisma/schema.prisma:314` | Index | `@@index([last_enriched_at])` on entities |
| `prisma/migrations/20260306200000_slim_entities_fields_v2/migration.sql:79` | Deferred drop | Scheduled for removal |

### needs_human_review

| Location | Type | Detail |
|---|---|---|
| `lib/website-enrichment/write-rules.ts:117` | Write | `needs_human_review: needsReview` (true when blocked or low confidence) |
| `scripts/seco-derived-reset.ts:41,112` | Read + Write | Reads then resets to `false` |
| `prisma/schema.prisma:315` | Index | `@@index([needs_human_review])` on entities |
| `prisma/migrations/20260306200000_slim_entities_fields_v2/migration.sql:81` | Deferred drop | Scheduled for removal |

### Views with Stale Dependencies

#### v_places_la_bbox

- **Current definition**: Created in `20260228100000_places_to_entities` and last recreated in `20260305200000_drop_entities_vibe_tags`
- **Selects**: ~35 columns directly from `entities`, including all columns that will be dropped by the slim-entities migration
- **Ghost columns referenced**: `last_enrichment_attempt_at`, `last_enrichment_error`, `enrichment_retry_count` — these appear in the view's SELECT list but are **not in the Prisma schema**. They either exist in the database but were never added to Prisma, or the view is currently broken.
- **After slim-entities migration**: This view will be invalid and must be rebuilt to read from `canonical_entity_state`

#### v_entity_launch_readiness_v0

- **Current definition**: Created in `20260305200000_drop_entities_vibe_tags` (last recreation)
- **References stale table names**:
  - `entity_appearances` — current schema name is `place_appearances`
  - `entity_photo_eval` — current schema name is `place_photo_eval`
- **Status**: **Likely broken in the database right now** (references tables that do not exist under those names)
- **Also references**: `entities.pull_quote`, `entities.tagline`, `entities.google_photos`, `entities.hours`, `entities.places_data_cached_at` — all scheduled for removal by slim-entities migration

### The EntityActorRelationship FK Ambiguity

The Prisma schema shows `EntityActorRelationship` pointing to `golden_records`:
```
entity golden_records @relation(fields: [entityId], references: [canonical_id], ...)
```

But migration `20260221000000_add_saiko_fields_trace_v02` FKs it to `entities.id`. And migration `20260306300000_drop_legacy_tables_fields_v2` (DEFERRED) drops the FK from `golden_records` entirely. The intended final state is that `EntityActorRelationship.entityId` points to `entities.id`, but **the Prisma schema has not been updated to reflect this**. The Prisma schema is inconsistent with the migration intent.

---

## Deliverable 3 — Field Classification Audit

All fields currently present in the `entities` model in `prisma/schema.prisma`:

| Field | DB Column | Category | Recommendation |
|---|---|---|---|
| `id` | `id` | **Routing Shell** | Keep permanently |
| `slug` | `slug` | **Routing Shell** | Keep permanently |
| `primary_vertical` | `primary_vertical` | **Routing Shell** | Keep permanently |
| `status` | `status` | **Routing Shell** | Keep permanently |
| `businessStatus` | `business_status` | **Routing Shell** | Keep permanently |
| `entityType` | `entity_type` | **Routing Shell** | Keep permanently |
| `createdAt` | `created_at` | **Routing Shell** | Keep permanently |
| `updatedAt` | `updated_at` | **Routing Shell** | Keep permanently |
| `name` | `name` | **Canonical Data** (transitional) | Move to `canonical_entity_state` — drop after slim-entities migration |
| `address` | `address` | **Canonical Data** (transitional) | Move to `canonical_entity_state` — drop after slim-entities migration |
| `latitude` | `latitude` | **Canonical Data** (transitional) | Move to `canonical_entity_state` — drop after slim-entities migration |
| `longitude` | `longitude` | **Canonical Data** (transitional) | Move to `canonical_entity_state` — drop after slim-entities migration |
| `phone` | `phone` | **Canonical Data** (transitional) | Move to `canonical_entity_state` — drop after slim-entities migration |
| `website` | `website` | **Canonical Data** (transitional) | Move to `canonical_entity_state` — drop after slim-entities migration |
| `instagram` | `instagram` | **Canonical Data** (transitional) | Move to `canonical_entity_state` — drop after slim-entities migration |
| `hours` | `hours` | **Canonical Data** (transitional) | Move to `canonical_entity_state.hours_json` — drop after slim-entities migration |
| `description` | `description` | **Canonical Data** (transitional) | Move to `canonical_entity_state` — drop after slim-entities migration |
| `googlePhotos` | `google_photos` | **Canonical Data** (transitional) | Move to `canonical_entity_state` — drop after slim-entities migration |
| `googleTypes` | `google_types` | **Canonical Data** (transitional) | Move to `canonical_entity_state` or drop — not referenced in v2 read paths |
| `priceLevel` | `price_level` | **Canonical Data** (transitional) | Move to `canonical_entity_state` — drop after slim-entities migration |
| `neighborhood` | `neighborhood` | **Canonical Data** (transitional) | Move to `canonical_entity_state` — drop after slim-entities migration |
| `category` | `category` | **Canonical Data** (transitional) | Move to `canonical_entity_state` — drop after slim-entities migration |
| `googlePlaceId` | `google_place_id` | **Canonical Data** (transitional) | Move to `canonical_entity_state` — drop after slim-entities migration |
| `placesDataCachedAt` | `places_data_cached_at` | **Canonical Metadata** (transitional) | Move to `canonical_entity_state.last_sanctioned_at` or drop — drop after slim-entities migration |
| `cuisineType` | `cuisine_type` | **Canonical Data** (transitional) | Move to `canonical_entity_state` — drop after slim-entities migration |
| `reservationUrl` | `reservation_url` | **Canonical Data** (transitional) | Move to `canonical_entity_state` — drop after slim-entities migration |
| `googlePlacesAttributes` | `google_places_attributes` | **Canonical Data** (transitional) | Move to `canonical_entity_state` — drop after slim-entities migration |
| `tagline` | `tagline` | **Editorial Content** (transitional) | Move to `interpretation_cache` (TAGLINE) — drop after slim-entities migration |
| `taglineCandidates` | `tagline_candidates` | **Editorial Content** (transitional) | Move to `interpretation_cache` — drop after slim-entities migration |
| `taglineGenerated` | `tagline_generated` | **Editorial Metadata** (transitional) | Drop after slim-entities migration |
| `taglinePattern` | `tagline_pattern` | **Editorial Metadata** (transitional) | Move to `interpretation_cache.content` JSON — drop after slim-entities migration |
| `taglineSignals` | `tagline_signals` | **Editorial Metadata** (transitional) | Move to `interpretation_cache.content` JSON — drop after slim-entities migration |
| `pullQuote` | `pull_quote` | **Editorial Content** (transitional) | Move to `interpretation_cache` (PULL_QUOTE) — drop after slim-entities migration |
| `pullQuoteAuthor` | `pull_quote_author` | **Editorial Content** (transitional) | Move to `interpretation_cache.content` JSON — drop after slim-entities migration |
| `pullQuoteSource` | `pull_quote_source` | **Editorial Content** (transitional) | Move to `interpretation_cache.content` JSON — drop after slim-entities migration |
| `pullQuoteType` | `pull_quote_type` | **Editorial Content** (transitional) | Move to `interpretation_cache.content` JSON — drop after slim-entities migration |
| `pullQuoteUrl` | `pull_quote_url` | **Editorial Content** (transitional) | Move to `interpretation_cache.content` JSON — drop after slim-entities migration |
| `tips` | `tips` | **Editorial Content** (transitional) | Move to `canonical_entity_state.tips` — drop after slim-entities migration |
| `last_enriched_at` | `last_enriched_at` | **Operational Pipeline** | Deprecate after enrichment pipeline migrates to `place_coverage_status` |
| `enrichment_stage` | `enrichment_stage` | **Operational Pipeline** + **Type Drift** | Retire; type drift makes it unreliable; pipeline state belongs in `place_coverage_status` |
| `needs_human_review` | `needs_human_review` | **Operational Pipeline** | Deprecate; move to `place_coverage_status` or a dedicated review queue |
| `category_enrich_attempted_at` | `category_enrich_attempted_at` | **Operational Pipeline** (throttle) | Deprecate after slim-entities migration |
| `confidence` | `confidence` | **Confidence v1** (transitional) | Replaced by `canonical_sanctions`; drop after slim-entities migration |
| `overall_confidence` | `overall_confidence` | **Confidence v1** (transitional) | Replaced by `canonical_entity_state.last_sanctioned_at`; drop after slim-entities migration |
| `confidence_updated_at` | `confidence_updated_at` | **Confidence v1** (transitional) | Drop after slim-entities migration |
| `description_source` | `description_source` | **Enrichment Metadata** (transitional) | Replaced by `canonical_sanctions.sanction_method`; drop after slim-entities migration |
| `description_confidence` | `description_confidence` | **Enrichment Metadata** (transitional) | Replaced by `canonical_sanctions`; drop after slim-entities migration |
| `description_reviewed` | `description_reviewed` | **Enrichment Metadata** (transitional) | Replaced by `canonical_sanctions`; drop after slim-entities migration |
| `editorialSources` | `editorial_sources` | **Deprecated** | No active write paths; drop with slim-entities migration |
| `adUnitOverride` | `ad_unit_override` | **Deprecated** | Drop with slim-entities migration |
| `adUnitType` | `ad_unit_type` | **Deprecated** | Drop with slim-entities migration |
| `transitAccessible` | `transit_accessible` | **Deprecated** | Drop with slim-entities migration |
| `thematicTags` | `thematic_tags` | **Deprecated** | Drop with slim-entities migration |
| `contextualConnection` | `contextual_connection` | **Deprecated** | Drop with slim-entities migration |
| `curatorAttribution` | `curator_attribution` | **Deprecated** | Drop with slim-entities migration |
| `chefRecs` | `chef_recs` | **Deprecated** | Replaced by `PlaceActorRelationship`; drop with slim-entities migration |
| `restaurantGroupId` | `restaurant_group_id` | **Deprecated** | Comment in schema: "DEPRECATED: use place_actor_relationships"; drop with slim-entities migration |
| `intentProfile` | `intent_profile` | **Deprecated** | Drop with slim-entities migration |
| `intentProfileOverride` | `intent_profile_override` | **Deprecated** | Drop with slim-entities migration |
| `prlOverride` | `prl_override` | **Deprecated** | Replaced by `interpretation_cache` (SCENESENSE_PRL); drop with slim-entities migration |
| `marketSchedule` | `market_schedule` | **Deprecated** | Drop with slim-entities migration |
| `parentId` | `parent_id` | **Hierarchy** | Evaluate: keep as entity-level hierarchy OR migrate to `place_actor_relationships`; drop with slim-entities migration per deferred plan |
| `categoryId` | `category_id` | **Classification FK** (transitional) | Being replaced by `canonical_entity_state.category`; drop with slim-entities migration |

---

## Deliverable 4 — Decision Log

### Decision 1: The Two Deferred Migrations

**Migrations:**
- `20260306200000_slim_entities_fields_v2` — strips entities to routing shell
- `20260306300000_drop_legacy_tables_fields_v2` — drops golden_records and legacy MDM tables

**Current status:** Both are DEFERRED. They exist in migration history as documented-but-not-applied SQL files. Prisma is unaware of them (they were applied manually in some environments, or not at all).

**The problem this creates:**
1. Prisma's migration history is out of sync with actual DB state in any environment where these have been partially applied
2. The presence of these files implies a design decision that has not been implemented, creating cognitive overhead for anyone reading the codebase
3. Running `prisma migrate deploy` in CI would skip these (they won't be in `_prisma_migrations`) but `prisma migrate status` will show them as "not yet applied"

**Chosen resolution for this analysis:**  
The deferred migrations represent the correct end state. The resolution path is to implement their prerequisites, then apply them. They should NOT be removed from migration history — they are the architectural intent on record. They should have a `_DEFERRED` suffix in their directory names or a `DO NOT APPLY` header (which they already have).

**Recommendation:** Document the prerequisites formally (see Deliverable 5). Do not remove or alter these migrations.

---

### Decision 2: enrichment_stage Type Drift

**Background:**
- Added in `20260226120000_merchant_website_enrichment` as `text` column
- At some later point, the column was converted to (or created as) a native PostgreSQL enum type `EnrichmentStage` in the database
- The Prisma schema maps it as `String?` — inconsistent with the actual DB type
- Three separate backfill scripts document workarounds for Prisma error `P2032` caused by this mismatch

**Options evaluated:**

| Option | Risk | Complexity |
|---|---|---|
| Align Prisma schema to DB enum (`@db.Unsupported("EnrichmentStage")`) | Low — documents reality | Low |
| Convert DB column back to TEXT via migration | Low — aligns with Prisma schema | Low |
| Remove the column entirely (fastest path to clean) | Low — column is already excluded from all v2 write paths | Low |
| Keep as-is | High — ongoing workarounds in backfill scripts | None |

**Chosen path:** Remove the column entirely as part of the slim-entities migration. The column is already functionally dead — write-rules.ts explicitly skips it, and v2 read paths don't consume it. Keeping it creates ongoing maintenance confusion. The type drift makes it unmaintainable via Prisma.

**Before removal:** Confirm via `SELECT DISTINCT enrichment_stage FROM entities WHERE enrichment_stage IS NOT NULL LIMIT 20;` that no active pipeline logic depends on its current values.

---

### Decision 3: Operational Fields on entities

**Fields in question:** `last_enriched_at`, `needs_human_review`, `category_enrich_attempted_at`

**Current reality:** These are active operational fields. `last_enriched_at` drives the enrichment pipeline's query selector (`run-website-enrichment.ts`). `needs_human_review` is written by enrichment and read by reset scripts.

**The question:** Do these belong on `entities`, or should they move to `place_coverage_status`?

**Analysis:** `place_coverage_status` already exists and tracks `last_success_at`, `last_attempt_at`, `last_attempt_status`, `last_error_code`, `last_error_message`. This is precisely the right table for operational pipeline state.

**Chosen path:** These fields should migrate to `place_coverage_status` before the slim-entities migration is applied:
- `last_enriched_at` → `place_coverage_status.last_success_at`
- `needs_human_review` → Add `needs_human_review` column to `place_coverage_status` (or use a new `enrichment_queue` table)
- `category_enrich_attempted_at` → `place_coverage_status.last_attempt_at` (with source='CATEGORY_ENRICH')

The pipeline scripts (`run-website-enrichment.ts`, `write-rules.ts`, `seco-derived-reset.ts`) must be updated to read from and write to `place_coverage_status` before the slim-entities migration drops these columns.

---

### Decision 4: Views with Stale Dependencies

**v_entity_launch_readiness_v0:**

This view references `entity_appearances` and `entity_photo_eval` — table names that no longer exist. The current table names are `place_appearances` and `place_photo_eval`.

**Status: This view is likely currently broken in the database.**

The view was recreated in `20260305200000_drop_entities_vibe_tags` but references stale table names that have since been renamed (the `places_to_entities` migration `20260228100000` renamed the `places` table to `entities` and likely renamed associated tables, but the view was recreated afterward with stale references).

**Chosen path:** Drop this view. It is not referenced by any active API route or Prisma model. If launch-readiness scoring is needed, it should be rebuilt against `canonical_entity_state` after the slim-entities migration.

**v_places_la_bbox:**

This view selects ~35 columns from entities including ghost columns (`last_enrichment_attempt_at`, `last_enrichment_error`, `enrichment_retry_count`) not present in the Prisma schema.

**Chosen path:** Drop and rebuild after slim-entities migration. The rebuilt view should read from `canonical_entity_state` joined to `entities` on `entity_id`.

---

### Decision 5: EntityActorRelationship FK Target Inconsistency

**Finding:** The Prisma schema models `EntityActorRelationship.entityId` as pointing to `golden_records.canonical_id`, but migration `20260221000000` FKs it to `entities.id`. The deferred migration `20260306300000` drops the FK to `golden_records` entirely.

**Chosen path:** The Prisma schema needs to be updated to reflect the correct FK target (`entities.id`). This should happen when the deferred migration is applied. No data migration is needed if `entities.id === golden_records.canonical_id` (which is asserted in comments in the migration file).

---

## Deliverable 5 — Cleanup Plan

This plan is ordered by dependency. Each step has a prerequisite check.

---

### Step 1 — Fix v_entity_launch_readiness_v0 (Immediate)

**Risk:** Low — the view is currently broken and not in active use  
**No schema changes to entities required**

**Actions:**
1. Confirm the view is broken: run `SELECT * FROM v_entity_launch_readiness_v0 LIMIT 1;` and verify the error
2. Drop the view: `DROP VIEW IF EXISTS v_entity_launch_readiness_v0;`
3. Add a migration to record this drop formally
4. If launch-readiness scoring is needed in the future, design the new view against `canonical_entity_state`

---

### Step 2 — Resolve enrichment_stage Type Drift (Before next enrichment deploy)

**Risk:** Low — the column is already functionally excluded from all Prisma write paths  
**No dependency impact — column is not consumed by any v2 read path**

**Actions:**
1. Audit current values: `SELECT DISTINCT enrichment_stage FROM entities WHERE enrichment_stage IS NOT NULL;`
2. If values are useful, snapshot them to a CSV
3. Resolve: either align the Prisma schema to `@db.Unsupported("EnrichmentStage")` (document-only fix), or include `enrichment_stage` in the slim-entities migration DROP list (it is already there)
4. Add a Prisma schema comment on the field documenting the type drift until it is dropped

**Immediate mitigation (no migration needed):** Add a comment to `prisma/schema.prisma` on the `enrichment_stage` field:
```prisma
// ⚠️ TYPE DRIFT: DB column is native enum EnrichmentStage; Prisma maps as String?.
// Prisma cannot round-trip this field (P2032). Do not read this field via Prisma.
// Excluded from all v2 write paths. Scheduled for removal in slim-entities migration.
enrichment_stage  String?   @map("enrichment_stage")
```

---

### Step 3 — Migrate Operational Fields to place_coverage_status

**Prerequisite:** None — can happen before slim-entities migration  
**Risk:** Medium — requires updating active pipeline scripts

**Actions:**
1. Add `needs_human_review` column to `place_coverage_status`:
   ```sql
   ALTER TABLE place_coverage_status ADD COLUMN IF NOT EXISTS needs_human_review BOOLEAN NOT NULL DEFAULT false;
   ```
2. Add a `source` discriminator column if not already present (already exists as `source TEXT`)
3. Backfill: copy `entities.last_enriched_at` → `place_coverage_status.last_success_at` where source = 'WEBSITE_ENRICHMENT'
4. Backfill: copy `entities.needs_human_review` → `place_coverage_status.needs_human_review`
5. Update `lib/website-enrichment/write-rules.ts` to write to `place_coverage_status` instead of entities
6. Update `scripts/run-website-enrichment.ts` to query `place_coverage_status.last_success_at`
7. Update `scripts/seco-derived-reset.ts` to reset `place_coverage_status` fields
8. After verification: the slim-entities migration will drop these columns from entities

---

### Step 4 — Populate canonical_entity_state for All Entities

**Prerequisite:** `scripts/populate-canonical-state.ts` exists and is runnable  
**Risk:** Medium — must verify coverage before proceeding

**Actions:**
1. Run: `SELECT COUNT(*) FROM entities;` — baseline
2. Run: `SELECT COUNT(*) FROM canonical_entity_state;` — coverage check
3. Run `scripts/populate-canonical-state.ts` for all entities not yet covered
4. Gate: do not proceed to Step 5 until `COUNT(*) FROM canonical_entity_state = COUNT(*) FROM entities`

---

### Step 5 — Update API Routes to Read from canonical_entity_state

**Prerequisite:** Step 4 complete (canonical_entity_state fully populated)  
**Risk:** Medium — core product API

**Actions:**
1. `app/api/places/[slug]/route.ts`: Already has dual-read logic. Remove the legacy entity column reads from the SELECT once canonical_state is confirmed populated. The fallback path is already wired.
2. `app/api/admin/places/search/route.ts`: Audit and update to read from `canonical_entity_state`
3. Run integration tests / smoke test place pages
4. Gate: verify place page rendering is correct with no entity column reads

---

### Step 6 — Apply slim-entities Migration

**Prerequisite:** Steps 3, 4, 5 complete  
**Risk:** High — irreversible column drops  

**Pre-flight checks (from migration file):**
```sql
SELECT COUNT(*) FROM canonical_entity_state;   -- must equal entities count
SELECT COUNT(*) FROM canonical_sanctions;       -- must be non-zero
SELECT COUNT(*) FROM derived_signals;           -- must be non-zero
SELECT COUNT(*) FROM interpretation_cache;      -- must be non-zero
```

**Actions:**
1. Take a `pg_dump` backup
2. Drop `v_places_la_bbox` and any views referencing entities data columns
3. Apply: `psql $DATABASE_URL -f prisma/migrations/20260306200000_slim_entities_fields_v2/migration.sql`
4. Rebuild `v_places_la_bbox` reading from `canonical_entity_state`
5. Update Prisma schema to match the routing-shell-only entities model
6. Run `prisma generate`
7. Smoke test all place pages

---

### Step 7 — Apply drop-legacy-tables Migration

**Prerequisite:** Step 6 complete AND all enrichment scripts migrated to observed_claims  
**Risk:** Very high — drops golden_records and other legacy tables permanently

**Pre-flight checks (from migration file):**
```sql
SELECT COUNT(*) FROM canonical_entity_state;  -- should equal entities count
SELECT COUNT(*) FROM canonical_sanctions;     -- should be non-zero
SELECT COUNT(*) FROM derived_signals;         -- should be non-zero
SELECT COUNT(*) FROM interpretation_cache;    -- should be non-zero
\d golden_records                             -- should still exist at this point
```

**Additional check:**
- Ensure all active read paths that reference `golden_records` have been migrated (search `db.golden_records` in codebase; confirm only fallback legacy reads remain)
- Run `migrate-actor-relationships-to-entities.ts` script first (documented in migration file, not yet written)

**Actions:**
1. Take a `pg_dump` backup
2. Run `scripts/migrate-actor-relationships-to-entities.ts`
3. Apply: `psql $DATABASE_URL -f prisma/migrations/20260306300000_drop_legacy_tables_fields_v2/migration.sql`
4. Update Prisma schema to remove `golden_records` model and related tables
5. Run `prisma generate`
6. Full smoke test

---

### Step 8 — Fix EntityActorRelationship FK in Prisma Schema

**Prerequisite:** Step 7 complete (golden_records dropped)

**Actions:**
1. Update `prisma/schema.prisma`: change `EntityActorRelationship.entity` relation from `golden_records` to `entities`
2. Run `prisma migrate dev` to generate a formal migration documenting this FK change
3. Verify FK constraint in DB: `\d "EntityActorRelationship"`

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `v_entity_launch_readiness_v0` is actively queried somewhere undiscovered | Low | Medium | Search all API routes and scripts for this view name before dropping |
| `v_places_la_bbox` ghost columns (`last_enrichment_attempt_at` etc.) exist in DB and break view after slim-entities | Medium | High | Run `SELECT last_enrichment_attempt_at FROM entities LIMIT 1` to confirm existence before proceeding |
| `enrichment_stage` data is being consumed by an undiscovered process | Low | Low | Audit `SELECT DISTINCT enrichment_stage FROM entities` before drop |
| `canonical_entity_state` population is incomplete at time of slim-entities apply | Medium | Very High | Hard gate: require 100% coverage check before Step 6 |
| `migrate-actor-relationships-to-entities.ts` script doesn't exist yet | High | Medium | Must be written before Step 7 |

---

## Summary of Discrepancies Found

| # | Discrepancy | Severity | Status |
|---|---|---|---|
| 1 | `enrichment_stage` is a native DB enum but Prisma maps as String? — P2032 type drift | High | Active workarounds in 3 scripts |
| 2 | `v_entity_launch_readiness_v0` references stale table names (`entity_appearances`, `entity_photo_eval`) | High | View is likely currently broken |
| 3 | `v_places_la_bbox` references columns (`last_enrichment_attempt_at`, `last_enrichment_error`, `enrichment_retry_count`) not in Prisma schema | Medium | View may be broken or these columns exist undocumented in DB |
| 4 | `EntityActorRelationship` FK in Prisma schema points to `golden_records` but migration history intends `entities` | Medium | Will resolve with deferred migration |
| 5 | Two DEFERRED migrations exist with prerequisites not yet met | Medium | Tracked; prerequisites documented above |
| 6 | Operational fields (`last_enriched_at`, `needs_human_review`, `enrichment_stage`) live on entities — wrong architectural layer | Medium | Deferred; resolved as part of slim-entities migration |
| 7 | `scripts/migrate-actor-relationships-to-entities.ts` is referenced in deferred migration but does not exist | Medium | Must be written before Step 7 |

---

*This document is analysis-only. No schema changes, migrations, or data modifications were applied during its production.*
