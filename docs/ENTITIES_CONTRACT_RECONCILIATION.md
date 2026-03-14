---
doc_id: SAIKO-ENTITIES-CONTRACT-RECONCILIATION
doc_type: architecture
status: active
owner: Bobby Ciccaglione
created: 2026-03-12
last_updated: 2026-03-12
project_id: SAIKO
systems:
  - fields-data-layer
  - database
related_docs:
  - docs/FIELDS_V2_TARGET_ARCHITECTURE.md
  - docs/DEFERRED_MIGRATION_GATES.md
  - docs/PLATFORM_DATA_LAYER.md
summary: Field-level audit and decision log for the entities table — what belongs, what migrates, and what is retired as part of the Fields v2 architecture.
---

# Entities Contract Reconciliation

**Purpose:** Field-level audit and decision log for the `entities` table.
Defines which fields belong on `entities`, which migrate to downstream layers, and which are retired.

---

## Governing Principle

`entities` is a routing shell. It is not a data store.

Every field on `entities` must justify its presence as a routing or identity anchor. Fields that fail that test belong elsewhere or are retired.

See `docs/FIELDS_V2_TARGET_ARCHITECTURE.md` for the full four-layer model.

---

## Field Disposition Table

### Keep on `entities` (routing shell justified)

| Field | Justification |
|-------|---------------|
| `id` | Primary key — durable FK anchor for all downstream tables |
| `slug` | URL-safe routing key — must never change once set |
| `primary_vertical` | Required for routing, filtering, display scoping |
| `status` | PlaceStatus: OPEN / CLOSED / PERMANENTLY_CLOSED — product-facing gate |
| `businessStatus` | From Google — CLOSED_PERMANENTLY gates page display at routing layer |
| `entity_type` | venue / activity / public — base classification |
| `created_at` | Immutable provenance timestamp |
| `updated_at` | Lifecycle tracking |

---

### Migrate to `canonical_entity_state`

| Field | Reason |
|-------|--------|
| `name` | Canonical factual data — not routing |
| `google_place_id` | Identity anchor but lives in canonical state, not routing shell |
| `address` | Factual data |
| `neighborhood` | Factual data |
| `latitude` / `longitude` | Factual data |
| `phone` | Factual data |
| `website` | Factual data |
| `instagram` | Factual data |
| `hours_json` | Factual data — high churn, belongs in canonical state |
| `price_level` | Factual data |
| `reservation_url` | Factual data |
| `menu_url` | Factual data |
| `winelist_url` | Factual data |
| `description` | Factual/editorial — canonical state |
| `cuisine_type` | Factual data |
| `category` | Factual data |
| `tips` | Editorial — canonical state |
| `google_photos` | Factual reference data |
| `google_places_attributes` | Factual reference data |

---

### Migrate to `place_coverage_status`

| Field on `entities` | Target field | Source value |
|---------------------|-------------|--------------|
| `last_enriched_at` | `last_success_at` | `source = 'WEBSITE_ENRICHMENT'` |
| `needs_human_review` | `needs_human_review` | — |
| `category_enrich_attempted_at` | `last_attempt_at` | `source = 'CATEGORY_ENRICH'` |
| `enrichment_stage` | Retire | Type-drifted, not consumed by v2 paths |

---

### Migrate to `interpretation_cache`

| Field | Reason |
|-------|--------|
| `tagline` | AI-generated interpretive output — not factual |
| `pull_quote` | Editorial interpretive output |
| `tips` (AI-generated variant) | Interpretive — if AI-generated, belongs here not canonical state |

---

### Retire (no new home)

| Field | Reason |
|-------|--------|
| `restaurantGroupId` | Legacy relationship model — superseded by actor relationships |
| `adUnitOverride` | Legacy product feature — not part of v2 |
| `chef_recs` | Legacy — superseded by actor relationship model |
| `prlOverride` | Legacy — superseded by interpretation_cache + confidence system |
| `enrichment_stage` | Type-drifted — not consumed by any v2 path |

---

## Migration Status

| Migration | Status |
|-----------|--------|
| Slim entities (remove non-routing fields) | Deferred — migration `20260306200000_slim_entities_fields_v2` |
| Drop legacy tables | Deferred — migration `20260306300000_drop_legacy_tables_fields_v2` |
| `canonical_entity_state` population | In progress — `scripts/populate-canonical-state.ts` |
| `place_coverage_status` operational fields | Not yet migrated |
| EntityActorRelationship FK rewire | In progress |
| FieldsMembership FK rewire | Done |
| TraceSignalsCache FK rewire | Done |

---

## Decision Log

**2026-03-09:** Fields v2 four-layer model locked. `entities` defined as routing shell only.
All field dispositions in this document derive from that architectural decision.
See `docs/FIELDS_V2_TARGET_ARCHITECTURE.md` Anti-Drift Rules 1–4.
