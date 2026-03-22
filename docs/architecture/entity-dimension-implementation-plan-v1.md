---
doc_id: ARCH-ENTITY-DIMENSION-IMPLEMENTATION-PLAN-V1
doc_type: architecture
status: draft
title: "Entity Dimension Model — Implementation Plan v1"
owner: Bobby Ciccaglione
created: "2026-03-21"
last_updated: "2026-03-21"
project_id: SAIKO
systems:
  - fields-data-layer
  - enrichment
  - entity-model
  - data-pipeline
related_docs:
  - docs/architecture/entity-type-problem-definition-v1.md
  - docs/architecture/entity-classification-framework-v1.md
  - docs/architecture/entity-type-taxonomy-v1.md
  - docs/architecture/entity-classification-layers-v1.md
  - docs/architecture/identity-scoring-v1.md
  - docs/architecture/enrichment-strategy-v1.md
  - docs/ENTITIES_CONTRACT_RECONCILIATION.md
  - docs/features/markets/SPEC_v1.2.md
summary: "Phased implementation plan for the four-dimension entity classification model. Covers schema migration, data backfill, enrichment routing, admin tooling, and page rendering changes. Three phases: Schema + Audit, Enrichment Routing, and Consumer Surface Updates."
---

# Entity Dimension Model — Implementation Plan v1

**Status:** DRAFT — Ready for Bobby's review and approval before any schema work begins.

## Scope

This plan implements the four-dimension entity classification model defined in the Entity Classification Framework v1. It is designed to be additive, reversible, and phased.

The four dimensions:
1. **location_type** — fixed / mobile / contained / civic
2. **schedule_type** — regular / market / route / open_access / date_bounded
3. **identity_anchor** — gpid / social / operator / parent / coordinates
4. **containment_type** — independent / contained / host

## What already exists in the schema

The entities model already has infrastructure that anticipates this work:

- `entityType` (PlaceType enum: venue / activity / public) — current single-axis type
- `parentId` — self-referential FK for containment. Zero records use it on entities directly.
- `marketSchedule` (jsonb) — event/market scheduling. 5 records use it.
- `ParkFacilityRelationship` model — spatial containment for parks. Separate from parentId.
- `PrimaryVertical` enum — 13 verticals including PARKS. Independent from entity type.
- `confidence` (jsonb) — field-level confidence system already in place.

## Open decisions (must resolve before Phase 1)

These are the open questions from the Classification Framework doc that gate schema work:

| # | Question | Recommendation | Impact |
|---|----------|---------------|--------|
| 1 | Columns on entities vs. separate dimension table? | **Columns on entities.** Four nullable enum columns. Simpler reads, no joins. Dimension table adds complexity for no clear benefit at this scale. | Schema shape |
| 2 | How to handle multi-location-type entities? | **Primary dimension wins.** A chef who runs a restaurant and a pop-up has two entity records. Each has its own dimension values. | Identity model |
| 3 | Confidence threshold for contained entity with no parent? | **Same as independent entity.** Absence of parent_id is informational, not blocking. Child can publish independently. | Publication rules |
| 4 | Reconcile PlaceType with dimension model? | **Coexist independently in v1.** PlaceType stays as-is. New dimensions are additive. Reconciliation is a future phase. | Migration risk |

---

## Phase 1: Schema + Corpus Audit (Week 1-2)

### 1A. Add dimension columns to entities

Add four nullable enum columns. All existing records default to null. No existing data is modified.

**New enums:**

```
enum LocationType {
  fixed
  mobile
  contained
  civic
}

enum ScheduleType {
  regular
  market
  route
  open_access
  date_bounded
}

enum IdentityAnchorType {
  gpid
  social
  operator
  parent
  coordinates
}

enum ContainmentType {
  independent
  contained
  host
}
```

**New columns on entities:**

```
locationTypeD        LocationType?    @map("location_type")
scheduleTypeD        ScheduleType?    @map("schedule_type")
identityAnchorTypeD  IdentityAnchorType? @map("identity_anchor_type")
containmentTypeD     ContainmentType? @map("containment_type")
```

Note: The `D` suffix on Prisma field names avoids collision with existing fields (e.g. `entityType`). The DB column names use clean snake_case via `@map`.

**Migration steps:**
1. Run `node scripts/check-schema.js` — verify clean baseline
2. Add enums and columns to schema.prisma
3. Run `node scripts/check-schema.js` — verify no conflicts
4. Generate migration: `npx prisma migrate dev --name add_entity_dimensions`
5. Verify migration SQL is purely additive (CREATE TYPE + ALTER TABLE ADD COLUMN)
6. Apply to dev, verify with `npx prisma db pull`

**Rollback:** Drop the four columns and four enums. No existing data touched.

### 1B. Full corpus audit script

Build a script that classifies every active entity across the four dimensions using heuristics:

```
scripts/audit-entity-dimensions.ts
```

**Heuristic rules:**

| Signal | → location_type | → schedule_type | → identity_anchor | → containment_type |
|--------|----------------|-----------------|-------------------|-------------------|
| primary_vertical = PARKS, no address, no GPID | civic | open_access | coordinates | host (if parent name pattern) or independent |
| Name contains "truck", "cart", "mobile" | mobile | route or regular | social (if instagram, no GPID) | independent |
| parentId is set OR ParkFacilityRelationship child | contained | inherit from parent | parent | contained |
| Has GPID + address + hours | fixed | regular | gpid | independent |
| market_schedule populated | contained or fixed | market | gpid or social | contained or independent |
| Instagram only, no GPID | (inspect) | (inspect) | social | independent |
| No GPID, no Instagram | (inspect) | (inspect) | coordinates | independent |

**Output:** CSV report with columns: entity_id, name, current_entity_type, inferred_location_type, inferred_schedule_type, inferred_identity_anchor, inferred_containment_type, confidence, reasoning.

**This answers the open question from Doc 3:** "How many non-permanent entities actually exist in the corpus today?"

### 1C. Backfill dimension values

After Bobby reviews the audit CSV and approves the heuristic mappings:

```
scripts/backfill-entity-dimensions.ts
```

- Writes dimension values based on approved heuristic output
- Idempotent, retry-safe
- Logs every write with entity_id, old value (null), new value
- Dry-run mode by default

**Acceptance criteria for Phase 1:**
- [ ] Four new enum types exist in schema
- [ ] Four new nullable columns exist on entities
- [ ] Audit CSV produced and reviewed
- [ ] Backfill applied to dev environment
- [ ] No existing fields modified
- [ ] check-schema.js passes
- [ ] TypeScript build passes

---

## Phase 2: Enrichment Routing (Week 3-4)

### 2A. Enrichment router reads dimension values

The enrichment pipeline currently assumes GPID-anchored, fixed-address entities. Add dimension-aware routing:

**Files to modify (inspection needed to confirm):**
- Enrichment pipeline entry point (likely in `scripts/` or `lib/enrichment/`)
- Google Places enrichment scripts — skip or deprioritize when `identity_anchor_type != 'gpid'`
- Social enrichment scripts — prioritize when `identity_anchor_type == 'social'`

**Routing logic:**

```
if identity_anchor_type == 'gpid':
    → standard Google Places enrichment (existing pipeline, unchanged)

if identity_anchor_type == 'social':
    → social profile enrichment (Instagram, TikTok)
    → skip or deprioritize Google Places

if identity_anchor_type == 'parent':
    → inherit coordinates + neighborhood from parent
    → skip independent enrichment

if identity_anchor_type == 'coordinates':
    → reverse geocode for address
    → manual review queue
```

### 2B. Identity scoring integration

The Identity Scoring model (ARCH-IDENTITY-SCORING-V1) already supports non-GPID anchors. Wire the dimension values into the scoring weights:

- `identity_anchor_type = 'social'` → boost Instagram/TikTok anchor weights
- `identity_anchor_type = 'parent'` → derive confidence from parent entity score
- `identity_anchor_type = 'coordinates'` → require manual verification for publication

### 2C. Coverage dashboard updates

The coverage dashboard should reflect dimension-aware status:

- Add dimension columns to entity list views
- Filter by location_type, containment_type
- Show enrichment path recommendations per entity based on anchor type

**Acceptance criteria for Phase 2:**
- [ ] Enrichment pipeline routes differently based on identity_anchor_type
- [ ] Social-anchored entities get social enrichment, not Google Places
- [ ] Parent-anchored entities inherit coordinates when own are null
- [ ] Coverage dashboard shows dimension values
- [ ] No regression on existing GPID-anchored enrichment

---

## Phase 3: Admin + Consumer Surface Updates (Week 5-6)

### 3A. Admin entity profile

The Entity Profile page (/admin/entity/[id]) should:

- Display the four dimension values in a summary card
- Allow manual override of dimension values
- Show derived entity pattern (e.g. "Mobile entity", "Civic parent") based on the dimension combination
- Warn when dimension values are inconsistent (e.g. containment_type = 'contained' but no parentId)

### 3B. Park facility hierarchy activation

With the containment model in place, activate the dormant park hierarchy:

- Create parent park entities (Griffith Park, Alondra Park, etc.)
- Set containment_type = 'host' on parents, containment_type = 'contained' on facilities
- Populate parentId on child facilities
- Consider consolidating ParkFacilityRelationship into the entities.parentId pattern (or keep both with clear ownership)

### 3C. Place page rendering (scope TBD)

This is flagged as out of scope in the Classification Framework doc. When ready:

- Derive page shape from dimension values
- Mobile entities: show last-known location, social links prominent, hours de-emphasized
- Civic parents: show child facilities list, coordinates-based map, no hours block
- Contained entities: show parent link, inherited location context

**Acceptance criteria for Phase 3:**
- [ ] Admin profile shows dimension values
- [ ] Manual dimension override works
- [ ] At least one park hierarchy fully wired (parent + children)
- [ ] No changes to place page rendering without explicit approval

---

## Migration safety checklist

Before each phase:
- [ ] `node scripts/check-schema.js` passes
- [ ] Prisma migration is purely additive
- [ ] No existing column meanings changed
- [ ] No existing enum values removed
- [ ] Rollback path documented
- [ ] TypeScript build succeeds
- [ ] Dev environment tested before staging/prod

## Risk register

| Risk | Mitigation |
|------|-----------|
| Heuristic misclassification in audit | CSV review before any backfill. Dry-run mode. |
| PlaceType / dimension conflict | Coexist independently in v1. No reconciliation yet. |
| Enrichment regression for GPID entities | identity_anchor_type = 'gpid' routes to existing pipeline unchanged. |
| ParkFacilityRelationship vs parentId duplication | Document clear ownership. Don't consolidate in v1. |
| Large blast radius if dimensions are wrong | All columns nullable. Null = unmigrated, not broken. |

## Not in scope

- Changing the PlaceType enum (venue / activity / public)
- Changing the PrimaryVertical enum
- Place page rendering changes (Phase 3C is flagged for future)
- Multi-entity operators (a chef with both a restaurant and a pop-up)
- Depth > 1 containment (grandparent relationships)
