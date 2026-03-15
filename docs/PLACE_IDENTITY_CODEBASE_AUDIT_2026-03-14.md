---
doc_id: SAIKO-PLACE-IDENTITY-CODEBASE-AUDIT-2026-03-14
doc_type: reference
status: active
owner: Bobby Ciccaglione
created: '2026-03-14'
last_updated: '2026-03-14'
project_id: SAIKO
systems:
  - identity
  - entities
  - fields-v2
related_docs:
  - docs/PLACE_IDENTITY_SYSTEM_FEATURE_OVERVIEW.md
  - docs/architecture/identity-scoring-v1.md
summary: >-
  Implementation truth-check audit of the place identity system — schema,
  API routes, and scripts as they exist in the current codebase.
category: engineering
tags: [identity, places, ui]
source: repo
---

# Place Identity Codebase Audit

Date: 2026-03-14
Scope: Current repository schema + active API/scripts (implementation truth check)

## 1) Canonical Identity Table

### What table currently represents canonical place identity?

Current app-facing canonical place identity is `entities`.

- table: `entities`
- primary key: `id` (`@id`)
- unique constraints:
  - `slug` (`@unique`)
  - `google_place_id` (`googlePlaceId @unique`)
- slug field: `slug` (unique routing key used by place page routes)

### What replaced `golden_records`?

In current schema definitions, `golden_records` is removed and documented as replaced by:
- `canonical_entity_state` (sanctioned current state)
- `derived_signals` (computed non-canonical signals)

Important transitional note:
- Place page API currently reads from `entities` columns directly, with comments indicating deferred cutover steps.
- Deferred migration files still reference final legacy table drops, so runtime behavior remains hybrid/transitional.

## 2) Identity Resolution Pipeline

### Current practical flow (active)

`admin intake input (JSON/CSV or assisted resolve)`  
→ `dedupe heuristics (exact anchors + fuzzy fallback)`  
→ `entities (match existing or create CANDIDATE)`  
→ `optional GPID resolver queue`  
→ `human decision applies/rejects GPID`  
→ `entities` updated

### Resolver files (active)

- `app/api/admin/intake/route.ts`
- `app/api/admin/intake/resolve/route.ts`
- `app/api/admin/tools/seed-gpid-queue/route.ts`
- `lib/gpid-resolution-queue.ts` (human-in-loop apply/reject/ambiguous)

### Additional Fields v2 signal path (coexisting)

`observed_claims`  
→ sanctioning  
→ `canonical_entity_state`  
→ `derived_signals` / `interpretation_cache`

## 3) Entities vs Places

### Relationship between these tables

Current schema has `entities` as canonical place identity model. There is no active Prisma model named `places`.

Migration evidence:
- `20260228100000_places_to_entities` renames `places` table to `entities` and rewires child FK column names from `place_id` to `entity_id`.

### Cardinality

- Current canonical identity cardinality is 1 row in `entities` per place identity.
- A separate `places` identity table is not part of current Prisma schema state.

### Foreign keys

Current child tables FK into `entities.id` via `entityId`/`entity_id` (examples: `map_places`, `coverage_sources`, `gpid_resolution_queue`, `merchant_surfaces`, `observed_claims`, `instagram_accounts`).

### Which table powers the public place page?

`entities` powers public place page reads today (`app/api/places/[slug]/route.ts` uses `db.entities.findUnique({ where: { slug } })`).

## 4) Matching Signals

### Fields used for identity matching (confirmed in active resolver paths)

- `google_place_id` exact match
- website domain exact match (derived from `website`, not stored separately)
- Instagram handle exact match
- slug exact match
- normalized/fuzzy name similarity (Jaro-Winkler / token-sort thresholds)
- coordinate-aware nearby candidate matching (haversine + radius in GPID queue seeding)
- address used as search context for candidate retrieval

## 5) Confidence / Completion

### Confidence

Yes, confidence exists in multiple layers:

- `entities.confidence` (JSON field-level confidence object)
- `entities.overall_confidence` + `confidence_updated_at`
- `merchant_enrichment_runs.confidence`
- `identity_enrichment_runs.identity_confidence`
- resolver candidate similarity/score fields (e.g., GPID queue `similarity_score`)

### Completion

No single canonical `completion` field is active on `entities` in current schema.

Legacy `data_completeness` appears in older/legacy flows and scripts, but not as a current canonical `entities` field in active schema.

## 6) Closure Tracking

### Where open/closed status is stored

- `entities.status` (`OPEN`, `CLOSED`, `PERMANENTLY_CLOSED`, `CANDIDATE`)
- `entities.business_status` (Google business status; e.g., `CLOSED_PERMANENTLY`)

### Historical closure records?

No dedicated entity lifecycle closure-history table is currently modeled for status transitions (for example, no `closed_at` history table for entity lifecycle state changes).

There are `closure`-type operational overlays/signals, but those are operational overlays and not a complete lifecycle history ledger for entity status changes.

## 7) External Identity Anchors

### Anchors currently stored

On canonical identity/state layers:
- `google_place_id`
- `website`
- `instagram`
- `tiktok`

Additional social anchor table:
- `instagram_accounts.instagram_user_id` (+ username/canonical Instagram URL)

Raw ingestion anchor form:
- `raw_records.external_id` scoped by `source_name`

### Anchors not found as first-class fields

- `yelp_id` (not present)
- `website_domain` (derived in resolver logic, not persisted as its own canonical column)

## Drift/Truthfulness Notes

The repo contains transitional and legacy naming in comments/docs/scripts (`places`, `golden_records`) alongside current `entities`-first runtime paths. For feature docs and technical specs, trust active schema + active routes first, and treat older references as historical unless they are still invoked by live code paths.
