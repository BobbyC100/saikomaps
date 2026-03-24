---
doc_id: AUDIT-TERMINOLOGY-MIGRATION-2026-03
status: ACTIVE
owner: Bobby
created: 2026-03-20
last_updated: 2026-03-20
triggered_by: ARCH-ENTITY-STATE-MODEL-V1
---

# Terminology Migration Audit — March 2026

> **Purpose:** Tracks the migration from legacy "place" terminology to "entity" terminology and the transition from the single `PlaceStatus` enum to the three-axis Entity State Model defined in `entity-state-model-v1.md`.
>
> **This document is a living audit.** Items should be checked off as they are completed. New findings should be appended.

---

## 1. What Changed

The Entity State Model (ARCH-ENTITY-STATE-MODEL-V1) established three independent axes for entity state:

1. **Operating Status** (`operatingStatus`): SOFT_OPEN, OPERATING, TEMPORARILY_CLOSED, PERMANENTLY_CLOSED
2. **Enrichment Status** (`enrichmentStatus`): INGESTED, ENRICHING, ENRICHED. CANDIDATE maps to INGESTED.
3. **Publication Status** (`publicationStatus`): PUBLISHED, UNPUBLISHED

This replaces the single `PlaceStatus` enum (OPEN, CLOSED, PERMANENTLY_CLOSED, CANDIDATE) which conflated real-world business status, internal pipeline state, and publication decisions into one field.

Additionally, "entity" is the canonical term for a business/place/point of interest in Saiko. "Entity record" is the canonical term for the consumer-facing published representation. Legacy "place" terminology must be migrated.

---

## 2. Terminology Rules

| Legacy Term | Canonical Term | Notes |
|---|---|---|
| place | entity | System-wide rename |
| place page | entity page | Consumer-facing page |
| place profile | entity record | The published representation |
| PlaceStatus | operatingStatus + enrichmentStatus + publicationStatus | Three separate fields |
| OPEN | OPERATING | Real-world business status |
| CLOSED | TEMPORARILY_CLOSED | Prolonged interruption |
| PERMANENTLY_CLOSED | PERMANENTLY_CLOSED | No change |
| CANDIDATE | INGESTED (enrichmentStatus) | Not an operating status |
| place type | entity type | Classification |
| place card | entity card | UI component |

**Exception:** References to Google's Places API should retain "place" where it refers to Google's terminology (e.g., `google_place_id`, `GooglePlaceData`). These are external API references, not Saiko domain terms.

---

## 3. Schema Migration Inventory

### Enums to Rename

| Current Enum | New Name | Values Change | Priority |
|---|---|---|---|
| `PlaceStatus` | Decompose into three fields | See Entity State Model | HIGH |
| `PlaceType` | `EntityType` | Values unchanged | MEDIUM |
| `PlaceAppearanceStatus` | `EntityAppearanceStatus` | Values unchanged | MEDIUM |
| `PlacePhotoEvalTier` | `EntityPhotoEvalTier` | Values unchanged | LOW |
| `PlacePhotoEvalType` | `EntityPhotoEvalType` | Values unchanged | LOW |
| `PersonPlaceRole` | `PersonEntityRole` | Values unchanged | MEDIUM |
| `OperatorPlaceCandidateStatus` | `OperatorEntityCandidateStatus` | Values unchanged | LOW |

### Tables/Models to Rename

| Current Model | Database Table | New Name | Priority |
|---|---|---|---|
| `place_appearances` | `place_appearances` | `entity_appearances` | MEDIUM |
| `place_photo_eval` | `place_photo_eval` | `entity_photo_eval` | LOW |
| `place_tag_scores` | `place_tag_scores` | `entity_tag_scores` | LOW |
| `place_coverage_status` | `place_coverage_status` | `entity_coverage_status` | MEDIUM |
| `place_job_log` | `place_job_log` | `entity_job_log` | LOW |
| `OperatorPlaceCandidate` | `operator_place_candidates` | `OperatorEntityCandidate` | LOW |
| `map_places` | `map_places` | `map_entities` | MEDIUM |
| `person_places` | `person_places` | `person_entities` | MEDIUM |

### Fields to Rename

| Model | Current Field | New Field | Notes |
|---|---|---|---|
| entities | `status` (PlaceStatus) | Decompose into three fields | Entity State Model |
| map_places | `scopePlaceTypes` | `scopeEntityTypes` | |
| entities | `placesDataCachedAt` | `googleDataCachedAt` | Clarifies it's Google-specific |

---

## 4. Code Migration Inventory

### TypeScript Types — HIGH Priority

| File | Current Types | New Types |
|---|---|---|
| `lib/contracts/place-page.ts` | `PlacePageData`, `PlacePageLocation`, `PlacePageSceneSense`, `PlacePageOfferingSignals`, `PlacePageCoverageSource`, `PlacePageAppearanceAsSubject`, `PlacePageAppearanceAsHost`, `PlacePageProgramClass`, `PlacePageProgramEntry`, `PlacePageOfferingPrograms`, `PlacePageAppearsOnItem`, `PLACE_PAGE_LOCATION_KEYS`, `PLACE_PAGE_DATA_KEYS`, `assertPlacePageData()` | All rename to `EntityPage*` equivalents |
| `lib/contracts/place-page.identity.ts` | `PlacePageLocation` reference | `EntityPageLocation` |
| `app/explore/types.ts` | `PlaceCardData` | `EntityCardData` |
| `components/search-results/types.ts` | `PlaceCardData`, `PlacePersonality` | `EntityCardData`, `EntityPersonality` |
| `lib/intent-profile.ts` | `PlaceForIntent` | `EntityForIntent` |
| `lib/place-payload.ts` | `PlaceFactsInput`, `PlaceFactsOutput` | `EntityFactsInput`, `EntityFactsOutput` |
| `lib/map-identity-summary.ts` | `PlaceForSummary` | `EntityForSummary` |
| `lib/people-groups.ts` | `PersonPlace` | `PersonEntity` |
| `lib/transformers/placeToCard.ts` | `PrismaPlace` | `PrismaEntity` |

### File Renames — MEDIUM Priority [COMPLETED 2026-03-23]

**Components:**
- [x] `PlaceListItem.tsx` → `EntityListItem.tsx`
- [x] `PlaceCard.tsx` → `EntityCard.tsx`
- [x] `PlaceIndexSection.tsx` → `EntityIndexSection.tsx`
- [x] `PlaceCard1x1.tsx` → `EntityCard1x1.tsx`
- [x] `PlaceCard1x2.tsx` → `EntityCard1x2.tsx`
- [x] `PlaceCard2x1.tsx` → `EntityCard2x1.tsx`
- [x] `PlaceCard2x2.tsx` → `EntityCard2x2.tsx`

**Libraries:**
- [x] `lib/place-job-log.ts` → `lib/entity-job-log.ts`
- [x] `lib/place-payload.ts` → `lib/entity-payload.ts`
- [x] `lib/place-slug.ts` → `lib/entity-slug.ts`
- [x] `lib/transformers/placeToCard.ts` → `lib/transformers/entityToCard.ts`
- [x] `lib/utils/PlacePageLayoutResolver.ts` → `lib/utils/EntityPageLayoutResolver.ts` (+ 4 test files)
- [x] `lib/contracts/place-page.ts` → `lib/contracts/entity-page.ts`
- [x] `lib/contracts/place-page.identity.ts` → `lib/contracts/entity-page.identity.ts`
- [x] `lib/saikoai/generate-place-descriptor.ts` → `lib/saikoai/generate-entity-descriptor.ts`
- [x] `lib/saikoai/prompts/place-enrichment.ts` → `lib/saikoai/prompts/entity-enrichment.ts`
- [x] `lib/saikoai/prompts/place-extraction.ts` → `lib/saikoai/prompts/entity-extraction.ts`

**Tests:**
- [x] `tests/contracts/place-page.contract.test.ts` → `tests/contracts/entity-page.contract.test.ts`
- [x] `tests/ui/place-page.typography.test.ts` → `tests/ui/entity-page.typography.test.ts`
- [x] `lib/utils/PlacePageLayoutResolver*.test.ts` → `EntityPageLayoutResolver*.test.ts` (4 files)

### API Routes — MEDIUM Priority (breaking change considerations)

| Current Route | New Route | Notes |
|---|---|---|
| `/api/places/[slug]` | `/api/entities/[slug]` | Consumer-facing — needs redirect strategy |
| `/api/places/details/[placeId]` | `/api/entities/details/[entityId]` | |
| `/api/places/search` | `/api/entities/search` | |
| `/api/admin/places/[id]/close` | `/api/admin/entities/[id]/close` | |
| `/api/admin/places/search` | `/api/admin/entities/search` | |
| `/api/map-places/[mapPlaceId]` | `/api/map-entities/[mapEntityId]` | |
| `/api/user/saved-places` | `/api/user/saved-entities` | |
| `/api/admin/photo-eval/[placeId]` | `/api/admin/photo-eval/[entityId]` | Parameter rename |
| `/api/admin/actors/[actorId]/link-place` | `/api/admin/actors/[actorId]/link-entity` | |

### Consumer-Facing URL — HIGH Priority (breaking change)

| Current URL | New URL | Notes |
|---|---|---|
| `/place/[slug]` | TBD | User-facing URL change — needs redirect strategy and SEO consideration |

### Scripts — LOW Priority (60+ files)

Scripts in `scripts/` directory with "place" in filename or content. These are operational tools, not product code. Can be renamed incrementally. Representative list:

- [ ] `backfill-place-page-fields.ts`
- [ ] `enrich-place.ts`
- [ ] `count-places.ts`
- [ ] `analyze-place-data-coverage.ts`
- [ ] `compute-place-scores.ts`
- [ ] `add-test-places.ts`
- [ ] `link-place-group.ts`
- [ ] `link-person-place.ts`
- [ ] And ~50 more

### Function and Variable Names — LOW Priority (hundreds)

Patterns requiring global search-and-replace within files after structural renames:

- `place` → `entity` (local variables)
- `places` → `entities` (local variables)
- `placeId` → `entityId`
- `placeSlug` → `entitySlug`
- `placeData` → `entityData`
- `getPlace` → `getEntity`
- `findPlace` → `findEntity`
- `fetchPlace` → `fetchEntity`
- `enrichPlace` → `enrichEntity`
- `placeToCard` → `entityToCard`
- `buildPlaceServiceFacts` → `buildEntityServiceFacts`

---

## 5. Documentation Migration Inventory

### HIGH Priority — Directly conflicts with Entity State Model

| Document | Issue | Action |
|---|---|---|
| `entity-lifecycle-and-closure-v1.md` | Superseded by entity-state-model-v1. Uses old PlaceStatus enum. Conflates three concerns into one. | Add "SUPERSEDED" header pointing to entity-state-model-v1. Closure-as-a-claim and RCM sections remain valid as evidence-flow docs. |
| `place-identity-concept-v1.md` | Uses "place" throughout. Core identity doc still referenced by other docs. | Rename to `entity-identity-concept-v1.md`. Global "place" → "entity" terminology update. |
| `enrichment-strategy-v1.md` | Uses CANDIDATE as operating status. Pipeline diagram conflates operating status with publication. | Redraw pipeline. Remove CANDIDATE from operating status references. Clarify pipeline state is separate. |
| `place-identity-implementation-verification-2026-03.md` | Verifies against old PlaceStatus enum (lines 85-104). Lists PUBLISHED and TEMP_CLOSED as "not implemented" additions to single enum. | Rewrite schema verification section against new three-axis model. |

### MEDIUM Priority — Stale terminology, no model conflict

| Document | Issue | Action |
|---|---|---|
| `coverage-ops-dashboard-v1.md` | "Published" logic based on `status = 'OPEN'`. Treats CANDIDATE as a status card. | Update to reflect publication status as independent axis. |
| `fields-era-overview-v1.md` | Uses "place" in body text despite "Entity Record Awareness" title. | Terminology update: "place" → "entity". |
| `docs/traces/place-page-design-v1.md` | Title says "Place Page". Shows "Open/Closed state" in wireframe without specifying which state axis. | Rename to entity-page-design-v1.md. Clarify operating status display. |

### LOW Priority — Minor references

| Document | Issue | Action |
|---|---|---|
| `enrichment-playbook-v1.md` | References Google `businessStatus` — minor clarification needed. | Add note that Google status feeds into operating status via evidence model. |
| `instagram-implementation-v1.md` | One "place page" reference. | Minor terminology fix. |
| `docs/traces/about-description-spec-v1.md` | One "place page" reference. | Minor terminology fix. |

---

## 6. Migration Strategy

### Phase 1 — Foundation (Do First)
- [x] Write Entity State Model doc (entity-state-model-v1.md)
- [x] Write this audit doc
- [ ] Get Bobby approval on Entity State Model
- [x] Add "SUPERSEDED" header to entity-lifecycle-and-closure-v1.md

### Phase 2 — Schema (State Model)
- [ ] Add `operatingStatus` field to entities (new enum: SOFT_OPEN, OPERATING, TEMPORARILY_CLOSED, PERMANENTLY_CLOSED)
- [ ] Add `enrichmentStatus` field to entities (new enum: INGESTED, ENRICHING, ENRICHED)
- [ ] Add `publicationStatus` field to entities (new enum: PUBLISHED, UNPUBLISHED)
- [ ] Backfill: map current PlaceStatus values to new fields:
  - CANDIDATE → enrichmentStatus: INGESTED, publicationStatus: UNPUBLISHED, operatingStatus: NULL (unknown until enrichment resolves it)
  - OPEN → enrichmentStatus: ENRICHED, operatingStatus: OPERATING, publicationStatus: PUBLISHED
  - CLOSED → enrichmentStatus: ENRICHED, operatingStatus: TEMPORARILY_CLOSED, publicationStatus: UNPUBLISHED
  - PERMANENTLY_CLOSED → enrichmentStatus: ENRICHED, operatingStatus: PERMANENTLY_CLOSED, publicationStatus: UNPUBLISHED
- [ ] Migrate all query logic to new fields
- [ ] Deprecate PlaceStatus enum

### Phase 3 — Schema (Terminology)
- [ ] Rename enums (PlaceType → EntityType, etc.)
- [ ] Rename tables (place_appearances → entity_appearances, etc.)
- [ ] Rename fields where needed
- [ ] Run check-schema.js after each migration

### Phase 4 — Code (Types and Contracts) [COMPLETED 2026-03-23]
- [x] Rename contract types (PlacePageData → EntityPageData, etc.)
- [x] Rename component files (PlaceListItem, PlaceCard*, PlaceIndexSection)
- [x] Rename library files (place-*.ts → entity-*.ts, PlacePageLayoutResolver → EntityPageLayoutResolver)
- [x] Update function and variable names (buildPlaceServiceFacts → buildEntityServiceFacts, etc.)
- [x] Rename test files (place-page.contract.test.ts → entity-page.contract.test.ts, etc.)
- [ ] Update API routes (deferred — requires explicit approval for consumer-facing routes)

### Phase 5 — Documentation [COMPLETED 2026-03-23]
- [x] Update HIGH priority docs:
  - entity-lifecycle-and-closure-v1.md (already marked SUPERSEDED)
  - place-identity-concept-v1.md → entity-identity-concept-v1.md (created + renamed)
  - place-identity-implementation-verification-2026-03.md → entity-identity-implementation-verification-2026-03.md (created + renamed)
- [x] Update MEDIUM priority docs:
  - instagram-ingestion-status-v1.md (updated with photo pipeline completion status)
- [ ] Update LOW priority docs

### Phase 6 — Verification [IN PROGRESS]
- [ ] Typecheck passes
- [ ] Build succeeds
- [ ] All tests pass
- [ ] No remaining PlaceStatus references in active code
- [ ] No remaining "place" terminology in types/interfaces (excluding Google API references)

---

## 7. What NOT to Rename

| Term | Reason |
|---|---|
| `google_place_id` | External API reference (Google Places API) |
| `GooglePlaceData` | External API interface |
| `lib/google-places.ts` | External API integration file |
| `searchPlace()` in google-places.ts | External API method |
| `getPlaceDetails()` in google-places.ts | External API method |
| Any Google Places API type/field | These are Google's terms, not ours |

---

*Saiko Fields · Terminology Migration Audit · 2026-03-20*
