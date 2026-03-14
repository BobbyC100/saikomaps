---
doc_id: SAIKO-FIELDS-V2-TARGET-ARCHITECTURE
doc_type: architecture
status: active
owner: Bobby Ciccaglione
created: 2026-03-10
last_updated: 2026-03-12
project_id: SAIKO
systems:
  - fields-data-layer
  - database
related_docs:
  - docs/PLATFORM_DATA_LAYER.md
  - docs/PROVENANCE_SYSTEM.md
  - docs/architecture/fields-era-overview-v1.md
  - docs/ENTITIES_CONTRACT_RECONCILIATION.md
  - docs/DEFERRED_MIGRATION_GATES.md
summary: Defines the four-layer Fields v2 architecture — entities routing shell, canonical_entity_state, interpretation_cache, and place_coverage_status — with anti-drift rules and current migration status.
---

# Saiko Fields v2 — Target Architecture Spec

**Status:** Reference / Enforced
**Purpose:** Anti-drift alignment for the Fields v2 migration completion
**Last Updated:** 2026-03-12

---

## Core Principle

Fields v2 separates entity identity, canonical current-state data, editorial/interpretive output, and operational workflow state into four distinct layers.

Each layer has:
- a clear purpose
- a clear lifecycle
- a clear owner
- minimal overlap with adjacent layers

**The anti-drift rule:** If a field is proposed for `entities`, it must justify why it belongs to the routing shell and cannot live in one of the other three layers. Default to no.

---

## Target Layer Model

```
                 ┌──────────────────────┐
                 │       entities       │
                 │  routing shell only  │
                 └──────────┬───────────┘
                            │ entity_id
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌─────────────────┐ ┌────────────────────┐ ┌──────────────────────┐
│canonical_entity_│ │ interpretation_    │ │ place_coverage_      │
│state            │ │ cache              │ │ status               │
│                 │ │                    │ │                      │
│ factual truth   │ │ editorial /        │ │ operational workflow │
│ current state   │ │ derived outputs    │ │ state                │
└─────────────────┘ └────────────────────┘ └──────────────────────┘
```

---

## Layer A — entities

**Role:** Routing shell / durable entity anchor

### What it is
`entities` is the thin, stable shell used to identify and route to an entity across the system. Every place that exists in Saiko has exactly one `entities` row. All downstream tables FK to `entities.id`.

### Allowed fields (target final state)

| Field | Justification |
|-------|---------------|
| `id` | Primary key — durable FK anchor for all downstream tables |
| `slug` | URL-safe routing key — must never change once set |
| `primary_vertical` | Type classification required for routing, filtering, display scoping |
| `status` | PlaceStatus: OPEN / CLOSED / PERMANENTLY_CLOSED — product-facing status |
| `businessStatus` | From Google — CLOSED_PERMANENTLY gates page display at the routing layer |
| `entity_type` | venue / activity / public — base classification |
| `created_at` | Immutable provenance timestamp |
| `updated_at` | Lifecycle tracking |

### What does NOT belong here

| Category | Examples | Correct layer |
|----------|----------|---------------|
| Canonical data | name, address, coordinates, phone, website, hours | `canonical_entity_state` |
| Editorial content | tagline, pull_quote, tips, descriptions | `interpretation_cache` |
| Operational pipeline state | enrichment stages, retry counts, review flags | `place_coverage_status` |
| Confidence/scoring | confidence scores, sanction metadata | `canonical_sanctions` |
| Enrichment metadata | description_source, last_enriched_at | `place_coverage_status` |
| Legacy / deprecated | restaurantGroupId, adUnitOverride, chef_recs, prlOverride | Retire — no new home |

### Lifecycle
Very stable. Should be low-churn. An `entities` row is created once and rarely changes. The routing shell should not be the subject of enrichment pipelines.

---

## Layer B — canonical_entity_state

**Role:** Canonical current-state entity data

### What it is
`canonical_entity_state` holds the best current structured truth about an entity. Values here are sanctioned — they are backed by a row in `canonical_sanctions` that records which observed claim won and why.

This is the table that answers: **What is currently true about this entity?**

### Allowed fields (representative examples)
- `name`, `google_place_id`
- `address`, `neighborhood`
- `latitude`, `longitude`
- `phone`, `website`, `instagram`
- `hours_json`, `price_level`
- `reservation_url`, `menu_url`, `winelist_url`
- `description`, `cuisine_type`, `category`, `tips`
- `google_photos`, `google_places_attributes`
- `last_sanctioned_at`, `sanctioned_by`

### What does NOT belong here
- Interpretive outputs (taglines, pull quotes) — those go in `interpretation_cache`
- Pipeline state (retry counts, error codes) — those go in `place_coverage_status`
- Claim-level evidence — that lives in `observed_claims`

### Lifecycle
Changes when the current structured truth changes — i.e., when a new sanctioned value supersedes the previous one. Lower churn than `place_coverage_status`, higher churn than `entities`.

---

## Layer C — interpretation_cache

**Role:** Editorial / derived / interpretive outputs

### What it is
`interpretation_cache` holds rendered or derived interpretation that is useful for product surfaces but is not the canonical factual source of truth. These outputs are regenerable and versioned.

This layer answers: **How do we describe or interpret this entity for product use?**

### Allowed output types (InterpretationType enum)

| Type | Description |
|------|-------------|
| `TAGLINE` | Short descriptive tagline for product display |
| `PULL_QUOTE` | Editorial pull quote with attribution |
| `SCENESENSE_PRL` | Place Readiness Level + atmosphere descriptors |
| `VOICE_DESCRIPTOR` | Long-form voice-engine narrative |

### What does NOT belong here
- Factual data (addresses, hours) — those go in `canonical_entity_state`
- Pipeline state — that goes in `place_coverage_status`
- Raw observed claims — those go in `observed_claims`

### Lifecycle
Regenerable. Can be invalidated and rebuilt. Versioned by `prompt_version` and `model_version`. `expires_at` allows time-based invalidation. `is_current` flags the active row per `(entity_id, output_type, prompt_version)`.

---

## Layer D — place_coverage_status

**Role:** Operational workflow state

### What it is
`place_coverage_status` holds machine/process state for ingestion, coverage, retries, failures, and enrichment progress. It is the operational dashboard for each entity's data pipeline status.

This layer answers: **What is the workflow status of enrichment and coverage for this entity?**

### Allowed fields (representative examples)
- `last_success_at`, `last_attempt_at`, `last_attempt_status`
- `last_error_code`, `last_error_message`
- `last_missing_groups`
- `source` — which pipeline produced this status
- `needs_human_review` — flag for human intervention required

### Fields that should migrate here from entities

| `entities` field | Target field in `place_coverage_status` |
|------------------|-----------------------------------------|
| `last_enriched_at` | `last_success_at` (source = `'WEBSITE_ENRICHMENT'`) |
| `needs_human_review` | `needs_human_review` |
| `enrichment_stage` | Retire — type-drifted and not consumed by v2 paths |
| `category_enrich_attempted_at` | `last_attempt_at` (source = `'CATEGORY_ENRICH'`) |

### Lifecycle
High-churn. Changes frequently with machine activity. Designed for rapid read/write from pipeline scripts.

---

## Anti-Drift Rules

**Rule 1: `entities` is closed to new operational fields**
No new pipeline state, enrichment metadata, review flags, or workflow residue may be added to `entities`. Any proposed addition must be justified as a routing shell necessity.

**Rule 2: `canonical_entity_state` is closed to interpretive outputs**
Taglines, pull quotes, narrative descriptions, and AI-generated copy belong in `interpretation_cache`. `canonical_entity_state` holds structured facts only.

**Rule 3: `interpretation_cache` is not a source of truth**
Nothing that requires factual accuracy should be read from `interpretation_cache` alone. Downstream consumers must fall back to `canonical_entity_state` for factual fields.

**Rule 4: Deferred migrations are the plan, not abandoned code**
The two deferred migrations (`20260306200000_slim_entities_fields_v2` and `20260306300000_drop_legacy_tables_fields_v2`) represent the intended final state of this architecture. They are not to be removed. Prerequisites must be completed and gates must be checked before applying.

---

## Current Migration Status

| Layer | Status |
|-------|--------|
| `entities` routing shell | Deferred — blocked by slim-entities prerequisites |
| `canonical_entity_state` population | In progress — `scripts/populate-canonical-state.ts` exists |
| `interpretation_cache` (taglines, pull quotes) | Partially populated — dual-read in API routes |
| `place_coverage_status` (operational fields) | Not yet migrated — `last_enriched_at`, `needs_human_review` still on `entities` |
| EntityActorRelationship FK rewire | In progress — `scripts/migrate-actor-relationships-to-entities.ts` |
| FieldsMembership FK rewire | Done — migration `20260307000000` applied |
| TraceSignalsCache FK rewire | Done — migration `20260307000001` applied |
| Legacy tables drop | Deferred — blocked by Gate 2 prerequisites |
