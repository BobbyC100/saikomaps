---
doc_id: ARCH-ENTITY-CLASSIFICATION-LAYERS-V1
doc_type: architecture
status: active
owner: Bobby Ciccaglione
created: '2026-03-14'
last_updated: '2026-03-14'
project_id: SAIKO
systems:
  - fields-v2
  - coverage-pipeline
  - place-pages
related_docs:
  - docs/FIELDS_V2_TARGET_ARCHITECTURE.md
  - docs/system/coverage-tier2-visit-facts-contract-v1.md
summary: Plain-language model for entityType vs primary_vertical vs category/cuisine_type in current schema and operations.
---

# Entity Classification Layers (v1)

## Why this exists

Classification terms are used in multiple places in the codebase and can be
confused. This document defines what each layer means in current main.

## Classification layers

### `entities.entityType`

Coarse structural class (`venue`, `activity`, `public`).

Use cases:

- broad behavior defaults
- base routing semantics
- high-level entity shape

This is not the main operational classifier for coverage applicability.

### `entities.primary_vertical`

Operational domain classifier (`EAT`, `COFFEE`, `WINE`, `DRINKS`, etc.).

Use cases:

- coverage applicability gates (for example, whether menu/reservation checks are relevant)
- downstream filtering and business-logic scoping
- product-level segmentation

In practice, this is the primary operational classifier for coverage workflows.

### `category` and `cuisine_type`

Granular content classification describing what the place is.

Current locations:

- `entities.category`, `entities.cuisineType` (legacy/transition fields)
- `canonical_entity_state.category`, `canonical_entity_state.cuisine_type` (structured canonical layer)

Use cases:

- taxonomy detail
- editorial/context rendering
- search facets

These are not substitutes for `primary_vertical` in operational gating.

## Practical rule of thumb

- Need coarse structural behavior? Use `entityType`.
- Need operational applicability logic? Use `primary_vertical`.
- Need fine-grained descriptive taxonomy? Use `category` and `cuisine_type`.
