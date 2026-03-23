---
doc_id: ARCH-ENTITY-CLASSIFICATION-LAYERS-V1
doc_type: architecture
status: active
owner: Bobby Ciccaglione
created: '2026-03-14'
last_updated: '2026-03-14'
project_id: SAIKO
systems:
  - fields-data-layer
  - coverage-operations
  - place-page
related_docs:
  - docs/architecture/vertical-taxonomy-v1.md
  - docs/architecture/coverage-tiers-v1.md
  - docs/FIELDS_V2_TARGET_ARCHITECTURE.md
  - docs/architecture/entity-type-problem-definition-v1.md
  - docs/architecture/entity-classification-framework-v1.md
  - docs/architecture/entity-type-taxonomy-v1.md
summary: Plain-language explanation of entity classification layers in the current schema — entityType vs primary_vertical vs category vs cuisine_type — including operational authority and usage guidance.
---

# Entity Classification Layers

## Purpose

This document explains how Saiko currently classifies entities across schema and product logic, and which field is authoritative for each decision type.

---

## The Four Classification Fields

| Field | Meaning | Typical values |
|------|---------|----------------|
| `entities.entityType` (`entity_type`) | Coarse structural kind of entity | `venue`, `activity`, `public` |
| `entities.primary_vertical` | Primary domain classifier | `EAT`, `COFFEE`, `WINE`, `DRINKS`, `STAY`, ... |
| `entities.category` | Human-readable category label | `restaurant`, `wine bar`, `hotel`, ... |
| `entities.cuisineType` (`cuisine_type`) | Cuisine-specific subtype | `Mexican`, `Italian`, `Thai`, ... |

---

## Why Both `entityType` and `primary_vertical` Exist

They solve different problems:

- `entityType` tells the system what broad class of entity it is dealing with.
- `primary_vertical` tells the system what domain-specific operational logic should apply.

In practice, `entityType` is too coarse for operational rules like "should this place have a menu URL?" or "should reservations be expected?".

---

## Which Field Is Authoritative For What

### Structural decisions

Use: `entityType`

Examples:
- coarse API behavior for venue/activity/public branching
- generic admin search payloads that include entity kind

### Operational applicability and scanner gating

Use: `primary_vertical` (authoritative)

Examples from current repo reality:
- Tier 2 Coverage Ops scanner gates `missing_price_level`, `missing_menu_link`, and `missing_reservations` by `primary_vertical` in `lib/coverage/issue-scanner.ts`.
- Website enrichment category-only mode excludes lodging-like entities using `primary_vertical != STAY` in `scripts/run-website-enrichment.ts`.

### Display and descriptive identity

Use: `category` and `cuisine_type`

Examples:
- place-page output renders display category fallback using `primary_vertical` display mapping with category fallback in `app/api/places/[slug]/route.ts`.
- cuisine remains a descriptive identity signal, not the primary operational classifier.

---

## Operational Rule of Thumb

When building scanner rules, coverage tiers, or automation applicability:

1. use `primary_vertical` for domain gating
2. use `entityType` only for coarse structural branching
3. use `category`/`cuisine_type` for identity description and UI semantics

---

## Relationship to Coverage Tiers

- Tier 1 (Identity & Classification) includes category/cuisine identity semantics.
- Tier 2 (Visit Facts) uses `primary_vertical` to decide which visit facts should exist for which entities.
- Tier 3 (Experience / Interpretation) sits above both and uses enriched signals.

See `docs/architecture/coverage-tiers-v1.md` for the tier model.
