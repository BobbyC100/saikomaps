---
doc_id: PI-CONCEPT-V1
status: DRAFT
owner: Bobby
last_updated: 2026-03-16
layer: Concept Doc (Layer 1)
---

# SAIKO FIELDS — Place Identity Concept Document

> **Status:** DRAFT — Not Canon. Pending verification items below.
> **Layer:** Concept Doc (Layer 1) — Feature docs must reference this, not redefine it.
> **Scope:** Place identity only. Does not cover user identity, operator identity, or auth.
> PlaceIdentity may relate to actors (chefs, sommeliers, etc.) and organizations (restaurant groups, parent companies) through separate relationship models not defined here.

---

## 1. Why This Doc Exists

Saiko Fields models places as structured entities. Identity is the most foundational concept in that model — it determines what a place IS, how it is resolved, what makes it unique, and how it persists over time.

Without a canonical definition, identity gets defined differently across features, pipelines, and surfaces. That drift compounds.

This document defines Place Identity as a system concept.

All feature docs, pipeline specs, and admin tools must reference this document rather than redefine identity independently.

---

## 2. What Is a Place Identity

A Place Identity is the canonical representation of a real-world place within Saiko Fields.

It is the stable, authoritative record that aggregates evidence from multiple sources and exposes a single truth to all downstream consumers.

### A Place Identity is NOT

- A raw ingestion record or source import
- A Google Places entry
- A user-submitted listing
- A search result or ranking artifact

### A Place Identity IS

- The resolved, editorial-controlled record of what a place is
- The owner of all canonical field values
- The anchor point for all enrichment, tagging, and editorial work
- The record that Traces and all consumer products read from

---

## 3. Core Principles

These are invariants. They do not bend for feature convenience.

| Principle | What It Means |
|---|---|
| Editorial authority over algorithmic inference | Google Places data never directly sets identity classifications (e.g. cuisine type). Saiko maintains editorial control over all subjective identity fields. |
| Source evidence is append-only; canonical values update through sanctioning | `observed_claims` records are immutable. `canonical_entity_state` values are updated when new claims are sanctioned, with full audit trail via `canonical_sanctions`. History is preserved in the claims layer, not in the canonical record itself. |
| No algorithmic identity assignment | Pipelines surface candidates. Humans (or explicitly approved automation) make the final call on identity fields. |
| Source evidence vs canonical truth are separate | `observed_claims` holds raw evidence. `canonical_entity_state` holds the sanctioned truth. Features read from canonical, never from source tables directly. |
| One canonical record per real-world place | Duplicate entities must be resolved, not tolerated. The system has a resolution mechanism for this. |
| Identity is time-aware | A place can change. Identity fields carry provenance and can be updated, but history is preserved in the claims layer. |
| Entity type is a behavioral governor `[planned]` | Entity type is not just a classification label. It will actively govern pipeline logic, generation models, coverage requirements, and rendering rules. |

### 3a. Identity vs Location (Governing Principle)

A PlaceIdentity is not the same thing as a coordinate, address, or operating footprint.

Location is evidence about a place. Identity is the conceptual entity that occupies that location.

Implications:

- A place may move while retaining identity.
- Multiple identities may share the same address (ghost kitchens).
- A single identity may operate across multiple locations or footprints over time.

Location is therefore a property of identity, not the definition of identity itself.

---

## 4. Canonical Identity Fields

Fields marked \* are required for a record to exit CANDIDATE status.

### Core Identity Fields

| Field | Definition | Status |
|---|---|---|
| id \* | Internal UUID. Immutable after creation. | implemented |
| slug \* | Human-readable URL identifier. Auto-generated from name + neighborhood. Immutable after first publish. | implemented |
| name \* | The canonical display name of the place. Editorial source wins over Google. | implemented |
| status \* | Lifecycle state: CANDIDATE, OPEN, CLOSED, PERMANENTLY_CLOSED | implemented |
| neighborhood | Canonical neighborhood assignment | implemented |
| googlePlaceId | Identity anchor | implemented |
| instagram | Identity anchor (handle stored without @) | implemented |
| tiktok | Social identity field | implemented |
| website | Identity anchor | implemented |
| enrichment_stage | Current ERA pipeline stage | implemented |
| last_enriched_at | Timestamp of last enrichment run | implemented |
| primary_vertical | Operational domain (EAT, etc.) | implemented |
| category / cuisineType | Granular content classifiers | implemented |
| tagline | Editorial identity sentence. API reads from `interpretation_cache` first, falls back to `entities.tagline`. | implemented |
| entity_type | Structural class (venue, public, mobile, etc.) | `[planned]` |
| cuisine_posture | Editorial offering classification. Stored in `derived_signals`. | implemented |
| service_model | Operational structure. Stored in `derived_signals`. | implemented |
| successor_of | ID of prior entity (brand evolution tracking) | `[planned]` |
| predecessor_of | ID of successor entity | `[planned]` |
| identity_note | Editorial continuity rationale | `[planned]` |

### Classification Fields [partially planned]

Three classification layers govern different downstream behaviors.

| Field | Role | Status |
|---|---|---|
| entity_type | Structural class | `[planned]` — not yet in schema |
| primary_vertical | Operational domain | implemented |
| category / cuisineType | Granular content classifiers | implemented |

Example (illustrating future entity_type behavior):

| Place | entity_type | primary_vertical | category | cuisine_type |
|---|---|---|---|---|
| Donna's | venue | EAT | restaurant | Italian |
| Griffith Park Tennis Courts | public | EXPERIENCE | tennis_courts | null |

### Entity Tagline — Generation Model

ERA Stage 7 generates the tagline via a single model today (no entity-type dispatch).

Pattern-weighted selection:

| Pattern | Selected When |
|---|---|
| food | cuisine signals strongest |
| neighborhood | location signals strongest |
| energy | atmosphere signals strongest |
| authority | editorial coverage strongest |

Stored in `interpretation_cache` with `prompt_version`: `voice-v2-{pattern}`

Read path: `interpretation_cache` (ERA output) -> `entities.tagline` (legacy fallback) -> null

Future direction: dispatch by entity_type once that field exists.

---

## 5. Identity Lifecycle

| Status | Meaning | In Schema |
|---|---|---|
| CANDIDATE | Created but not enriched | yes |
| OPEN | Pipeline run at least once (promoted from CANDIDATE on first enrich) | yes |
| CLOSED | Permanently closed | yes |
| PERMANENTLY_CLOSED | Permanently closed (Google-sourced) | yes |
| PUBLISHED | Meets all identity requirements, visible to end users | `[planned]` |
| TEMP_CLOSED | Temporarily closed, expected to reopen | `[planned]` |

Transitions: CANDIDATE → OPEN is operator-initiated only, triggered via either the enrich route (`/api/admin/enrich/[slug]`) or the enrich-stage tool route (`/api/admin/tools/enrich-stage`). Both are manual operator actions — no background job or cron promotes CANDIDATE automatically. There is no PUBLISHED gate today — OPEN entities are served to users if they have a slug.

Closure and status changes are claim-based, not automatic. Signals suggesting closure generate entries in a `status_claims` ledger. Human review determines whether the claim updates canonical status. Canonical lifecycle state is never mutated directly by an external signal. The status_claims ledger and Reference Confidence Model are defined in `entity-lifecycle-and-closure-v1.md`.

---

## 6. Identity Resolution

### Resolution precedence

| Field | Source Priority |
|---|---|
| Name | Editorial > Google |
| Location | Google > Editorial |
| Description | Editorial > AI > Google |
| Instagram | Editorial > AI (discover-social tool) |

### Confidence thresholds [verify against implementation]

| Score | Action |
|---|---|
| >= 90% | Auto-link |
| 70-89% | Review Queue (GPID queue) |
| < 70% | Separate entities |

### 6b. Identity Anchors

Three anchors establish identity. They are **weighted, not equal** in the current scoring model:

| Anchor | Weight | Notes |
|---|---|---|
| Google Place ID | Resolves alone | Reliable structural anchor; sufficient by itself |
| Website URL | 3 pts | Root domain normalized |
| Instagram Handle | 2 pts | Platform-enforced uniqueness |
| TikTok Handle | 2 pts | Social identity signal |

Resolution threshold: 4 points. GPID alone resolves immediately. Without GPID, a combination of other anchors must reach threshold (e.g. website + Instagram = 5 pts). See `issue-scanner.ts:114-130` and `ARCH-IDENTITY-SCORING-V1` for the full model.

> **Design intent:** The concept-level goal is that no single anchor type is privileged — a taco cart with only an Instagram handle is as identifiable as a restaurant with a GPID. The weighted model is the current implementation of that intent. Weights may be adjusted as the system matures.

Rules:

- Any one anchor sufficient for identity uniqueness
- Multiple agreeing anchors increase resolver confidence
- Anchor conflicts trigger Review Queue
- Name + proximity used only when all anchors are absent

### 6c. Successor / Predecessor — Brand Evolution [planned]

Ship of Theseus rules:

| Scenario | Result |
|---|---|
| Name change only | Same entity |
| Concept change, same operator | Same entity |
| Closure + new ownership | New entity |
| Soft rebrand | Same entity |

Note: `successor_of` and `predecessor_of` fields are not yet in the schema. Today, brand evolution is handled by manual entity editing.

### 6d. Ghost Kitchens — One Address, Multiple Identities

Rules:

- Separate PlaceIdentity per brand
- Shared address allowed
- Anchors must be unique
- Proximity rules overridden when anchors differ

### 6e. Place Type / Location Behavior [planned]

Not all places relate to location in the same way. Location behavior is a separate dimension of identity, governed by the future `entity_type` field.

| Place Type | Location Behavior |
|---|---|
| Establishment | Fixed permanent venue |
| Mobile Vendor | Moves but has consistent operating area |
| Street Vendor | Area-based operation |
| Pop-up | Temporary residency (modeled today via Appearances) |
| Shared Kitchen Brand | Multiple brands at one location |

This concept explains why identity cannot rely solely on coordinates or addresses.

---

## 7. Ownership

| Concern | Owner |
|---|---|
| Canonical identity record | Saiko Fields |
| Editorial field values | Bobby / operators |
| Enrichment pipeline | ERA pipeline |
| Source evidence | Ingestion layer (observed_claims) |
| Consumer read contracts | Product API (place-page.ts) |

---

## 8. What This Doc Does Not Cover

- User identity
- Operator identity
- Authentication
- SceneSense tagging (see SS-FW-001 through SS-FW-004)
- TimeFOLD
- Full ERA pipeline spec (see enrichment-strategy-v1.md)
- Entity lifecycle state management, closure claims, and Reference Confidence Model (see entity-lifecycle-and-closure-v1.md)
- Actor identity and organization relationship models

---

## 9. Verification Items — Must Be Confirmed Before Canon

- [x] "Create Anyway" sets status CANDIDATE — CONFIRMED `intake/route.ts:194`
- [x] Issue scanner skips CANDIDATE entities — CONFIRMED `issue-scanner.ts:383` WHERE `status != 'CANDIDATE'`
- [x] CANDIDATE→OPEN transition — CONFIRMED but note: triggered by enrich route AND enrich-stage tool (not sole trigger). `enrich/[slug]/route.ts:66-72`, `tools/enrich-stage/route.ts:73`
- [x] enrichment_stage and last_enriched_at null on creation — CONFIRMED `schema.prisma:286-287` optional, no default
- [x] Slug has @unique constraint — CONFIRMED `schema.prisma:205`. Immutability is convention, not DB-enforced.
- [x] Separate canonical/source tables — CONFIRMED `canonical_entity_state` exists `schema.prisma:1544`. Sources via `observed_claims` + `canonical_sanctions`.
- [x] Confidence thresholds 90/70 — CONFIRMED in intake route `intake/route.ts:32-33` `AUTO_MATCH_THRESHOLD=0.90`, `AMBIGUOUS_THRESHOLD=0.70`
- [x] Anchors are NOT tier-equivalent — identity scoring uses weighted model: GPID alone = resolved; website=3pts, IG=2pts, TikTok=2pts, threshold=4pts. See `issue-scanner.ts:114-130`. GPID is not sole-required but has special weight.
- [x] successor_of, predecessor_of, identity_note — CONFIRMED not in schema. Planned.
- [x] location_type — CONFIRMED not in schema. Planned.
- [x] instagram_handle/website have NO unique DB constraint — CONFIRMED `schema.prisma:217-219`. Convention only.
- [x] CANDIDATE excluded from duplicate scanner — CONFIRMED `duplicate-scanner.ts:147-148`
- [ ] entity_type field — not yet in schema. Design confirmed in ARCH-ENTITY-CLASSIFICATION-LAYERS-V1.
- [ ] PUBLISHED status — not yet in PlaceStatus enum. Current enum: OPEN, CLOSED, PERMANENTLY_CLOSED, CANDIDATE.
- [ ] TEMP_CLOSED status — not yet in PlaceStatus enum. Operational workflow not yet defined.
- [ ] TEMP_CLOSED monthly recheck queue — not yet built.
- [ ] CLOSED/TEMP_CLOSED excluded from resolver pool — policy only today. No resolver code enforces this.

---

## 10. Promotion Criteria

Document moves to ACTIVE when:

- Verification items confirmed
- Bobby approval
- Added to architecture registry
- Feature docs updated to reference this doc

---

*Saiko Fields · Place Identity Concept Doc · Draft March 2026 · Not Canon*
