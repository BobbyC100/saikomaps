---
doc_id: SAIKO-FIELDS-IDENTITY-VERIFICATION-2026-03
doc_type: verification
title: Entity Identity - Implementation Verification
status: active
owner: Bobby Ciccaglione
created: 2026-03-16
last_updated: 2026-03-16
project_id: SAIKO
summary: Repository and Neon DB verification snapshot for place identity implementation state as of 2026-03.
systems:
  - fields-data-layer
  - entity-resolution
related_docs:
  - docs/architecture/entity-identity-concept-v1.md
  - docs/architecture/identity-resolver-spec-v1.md
  - docs/architecture/identity-scoring-v1.md
  - docs/architecture/fields-ingestion-pipeline-v1.md
---

# Entity Identity - Implementation Verification

**Document ID:** SAIKO-FIELDS-IDENTITY-VERIFICATION-2026-03  
**Layer:** Architecture Verification  
**Status:** Active  
**Verified Against:** Repo + Neon DB

---

## Purpose

This document records the current implementation state of Entity Identity relative to the architecture documents.

---

## Confirmed Identity Fields in `entities`

Core fields:

- `id`
- `slug`
- `name`
- `status`
- `neighborhood`
- `google_place_id`
- `website`
- `enrichment_stage`
- `last_enriched_at`

Identity-adjacent:

- `address`
- `latitude`
- `longitude`
- `instagram`
- `tiktok`
- `tagline`

---

## Fields Referenced in Architecture but Missing

- `instagram_handle`
- `website_domain`
- `cuisine_posture`
- `service_model`
- `entity_tagline`
- `successor_of`
- `predecessor_of`
- `identity_note`

---

## Naming Differences

| Concept | Schema |
|---|---|
| instagram_handle | instagram |
| googlePlaceId | google_place_id |
| coordinates | latitude + longitude |
| entity_tagline | tagline |

---

## Lifecycle Status Enum

Schema enum:

- OPEN
- CLOSED
- PERMANENTLY_CLOSED
- CANDIDATE

Current DB counts:

- OPEN - 323
- CANDIDATE - 288
- CLOSED - 1

Not implemented:

- PUBLISHED
- TEMP_CLOSED

---

## Identity Anchor Constraints

Existing:

- `google_place_id` unique
- `slug` unique

Missing:

- `instagram` uniqueness
- `website` uniqueness

---

## Resolver Thresholds in Code

Active:

- `NAME_SIMILARITY_THRESHOLD` ~= 0.85
- `NEARBY_RADIUS` ~= 200m

`90/70` thresholds appear only in a backup script.

---

## Canonical vs Source Separation

Source tables:

- `observed_claims`
- `source_registry`

Canonical tables:

- `canonical_entity_state`
- `canonical_sanctions`

The `entities` table still contains mixed operational fields.
