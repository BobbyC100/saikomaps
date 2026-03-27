---
doc_id: ARCH-ENTITY-STATE-MODEL-V1
status: IMPLEMENTING
owner: Bobby
created: 2026-03-20
last_updated: 2026-03-20
layer: Concept Doc (Layer 1)
supersedes: ARCH-ENTITY-LIFECYCLE-CLOSURE-V1
related_docs:
  - docs/architecture/entity-classification-framework-v1.md
  - docs/architecture/entity-type-problem-definition-v1.md
  - docs/architecture/entity-maintenance-policy-v1.md
---

# Entity State Model

> **Status:** IMPLEMENTING — Concept approved by Bobby. Phase 1 (dual-write) and Phase 2 (Coverage-Ops read migration) shipped 2026-03-26. Lane-first enrichment (lane-first-enrichment-v1.md) shipped 2026-03-26 — `enrichmentStatus` transitions are now policy-driven via `isEntityEnriched()`, four-layer completion gate live (Identity, Access, Offering, Interpretation). Phase 3 (remove implicit CANDIDATE→OPEN promotion) and Phase 4 (legacy status read deprecation) planned.
> **Layer:** Concept Doc (Layer 1).
> **Scope:** Defines how Saiko models entity state across three independent concerns. Supersedes `entity-lifecycle-and-closure-v1.md` for state modeling. The closure-as-a-claim model, status claims ledger, and Reference Confidence Model from that earlier doc remain valid as evidence-flow mechanisms.

---

## 1. Purpose

This document defines how Saiko models entity state across three independent concerns:

1. **Operating Status** (`operatingStatus`) — what is happening with the business in the real world
2. **Enrichment Status** (`enrichmentStatus`) — where the entity is in Saiko's Identity and Enrichment Pipeline
3. **Publication Status** (`publicationStatus`) — whether the entity record appears on Saiko surfaces

These three concerns are intentionally modeled as independent axes and must not be collapsed into a single field.

Previously, entity state was represented by a single `PlaceStatus` enum (`OPEN`, `CLOSED`, `PERMANENTLY_CLOSED`, `CANDIDATE`). That enum mixed real-world business status with internal pipeline state, used legacy "place" terminology, and overloaded "open/closed" in a way that collided with hours-of-operation language.

This document replaces `entity-lifecycle-and-closure-v1.md` as the canonical reference for entity state modeling. The closure-as-a-claim model, status claims ledger, and Reference Confidence Model defined in that earlier doc remain valid — they describe how evidence flows *into* operating status decisions, not what the states are. This doc defines the states themselves.

---

## 2. Operating Status

**Field name:** `operatingStatus`

**What it represents:** The real-world operating state of the business. This is an observable fact about the entity, not an internal Saiko designation.

Operating status has nothing to do with hours of operation. A restaurant that is closed on Mondays is still OPERATING. A bar that closes at midnight is still OPERATING. Daily and weekly hours are tracked separately in the `hours` field. Operating status describes whether the business is functioning as a going concern.

### Values

**SOFT_OPEN** — The business exists and is serving people on a limited, controlled basis. This is the pre-launch phase: invitation-only, reservation-only, reduced menu, limited hours, staff training in a live setting. The business has not yet had its official public opening. This phase typically lasts days to weeks.

**OPERATING** — The business has officially opened to the public and is running at its intended capacity. This is the steady state. The grand opening has happened. Normal operations.

**TEMPORARILY_CLOSED** — The business has stopped operating but intends to reopen. Reasons include renovation, seasonal closure, fire or disaster recovery, health department action, or ownership transition. The entity record and all its data are preserved. Temporarily closed refers to a prolonged interruption — weeks or months, not hours or a single day. Event-based closures (private buyouts, pop-ups, special events) are a scheduling concern, not an operating status change. A restaurant that's closed next Tuesday for a private event is still OPERATING. Communicating those short-term exceptions to users is a product goal, but it's handled through event and schedule data, not through this field. While event-based closures do not change operating status, they may produce signals that trigger temporary UI overrides on product surfaces — so a user doesn't show up to a restaurant that's closed for a private buyout that evening. The signal is transient; the operating status remains OPERATING.

**PERMANENTLY_CLOSED** — The business has ceased operations with no intent to return. The entity record is retained for data integrity, historical reference, and to prevent re-ingestion as a new entity.

### Transition Rules

A typical progression is SOFT_OPEN → OPERATING → PERMANENTLY_CLOSED. But transitions are not strictly linear. An OPERATING entity can become TEMPORARILY_CLOSED and return to OPERATING. A SOFT_OPEN entity could go directly to PERMANENTLY_CLOSED if the business fails before launching. TEMPORARILY_CLOSED can resolve to either OPERATING (reopened) or PERMANENTLY_CLOSED (never came back).

Operating status transitions are evidence-based. External signals (Google Places, website checks, social media, editorial reporting, field observation) generate status claims. Claims are reviewed before canonical operating status is updated. The claims model is defined in the closure-as-a-claim framework from the original lifecycle doc.

---

## 3. What Operating Status Is Not

Operating status describes one thing: whether the business is functioning in the real world. To prevent this field from becoming a dumping ground for unrelated concerns, here is what it does not represent.

**Not hours of operation.** A restaurant that closes at midnight or is closed on Mondays is OPERATING. Daily and weekly schedules are tracked in the `hours` field. Operating status is about the business, not the door.

**Not event-driven availability.** A coffee shop that closes for a private event next Saturday is OPERATING. Short-term schedule exceptions are a data concern handled through event and signal ingestion, not through operating status.

**Not internal pipeline state.** Whether Saiko has ingested, enriched, or quality-checked the entity has no bearing on operating status. A freshly ingested candidate that hasn't been through enrichment still has an operating status in the real world — we may just not know it yet. Pipeline state is defined in Section 4.

**Not publication status.** Operating status does not control whether the entity record appears on Saiko surfaces. A SOFT_OPEN restaurant might be published. A TEMPORARILY_CLOSED restaurant might remain visible with a banner. An OPERATING restaurant with incomplete data might not be shown at all. Publication status is an independent decision defined in Section 5.

**Not a curation decision.** Curation happens at intake — the decision to include an entity in Saiko. Operating status describes what's happening with the business after that decision has been made.

**Not a data quality assessment.** Whether the entity has enough data to support a credible entity record is a completeness and standard concern, not an operating status concern.

**Not legal or regulatory standing.** Operating status reflects observable real-world activity — is the business serving people? It does not reflect business licensing, tax status, health permits, or any other legal/regulatory designation. Saiko is not a regulatory body and does not verify legal standing.

---

## 4. Identity and Enrichment Pipeline State

Identity and Enrichment Pipeline state describes where an entity is in Saiko's Identity and Enrichment Pipeline. It is entirely separate from operating status. A freshly ingested entity has an enrichment status (new, unprocessed) and may also have an operating status in the real world — we just might not know it yet.

**Field name:** `enrichmentStatus`

### What It Tracks

An entity enters Saiko because someone selected it for inclusion. That's the curation decision. From there, the entity moves through the Identity and Enrichment Pipeline: identity resolution, enrichment, data quality checks. Enrichment status answers the question: *where does this entity stand relative to the pipeline?*

### Values

**INGESTED** — The entity has been imported into the system but has not been through the Identity and Enrichment Pipeline. This is the entry state. Entities may sit here while operators review them for duplicates, data quality, or other issues before kicking off enrichment. Replaces the legacy `CANDIDATE` value from the old `PlaceStatus` enum.

**ENRICHING** — The entity is currently being processed by the Identity and Enrichment Pipeline. Identity resolution and/or enrichment steps are in progress. This prevents other processes from operating on the same entity concurrently.

**ENRICHED** — The entity has been through the Identity and Enrichment Pipeline. The pipeline has done its work. How complete or high-quality the resulting data is — which tiers are filled, what percentage of expected fields exist — is a separate completeness concern, not an enrichment status question.

### Relationship to enrichment_stage

Enrichment status is the high-level state: has the pipeline touched this entity? The existing `enrichment_stage` field tracks the more granular position within the pipeline — which specific step the entity is on or has completed. These complement each other. `enrichmentStatus` tells you the big picture; `enrichment_stage` tells you the detail.

### What Needs to Be True

- Enrichment status must be independent of operating status. An INGESTED entity might be OPERATING in the real world.
- Enrichment status must not gate publication status by itself. Whether an entity record is shown on Saiko surfaces is a publication decision, not a pipeline decision. Enrichment status informs that decision but doesn't make it.
- The transition out of INGESTED should not require overwriting operating status. Today, promoting an entity from CANDIDATE sets it to OPEN, which means we lose the ability to say "this entity is in soft-open" because OPEN is the only post-candidate state. In the new model, moving from INGESTED to ENRICHING changes only enrichment status — operating status remains whatever it is.

### Legacy Mapping

The current `CANDIDATE` value in `PlaceStatus` maps to `enrichmentStatus: INGESTED`. The codebase uses CANDIDATE primarily as a filter to exclude unprocessed entities from product surfaces — that filtering responsibility moves to `publicationStatus: UNPUBLISHED` in the new model.

---

## 5. Publication Status

Publication status controls whether the entity record appears on Saiko surfaces. It is an independent decision, not derived from operating status or Identity and Enrichment Pipeline state.

**Field name:** `publicationStatus`

### What It Represents

Has Saiko decided to show this entity record to users? Publication status is an explicit, controlled decision — not something that falls out of other fields.

### Canonical Term: Entity Record

The consumer-facing, published representation of an entity is called an **entity record**. An entity record is the composed output of Saiko's Identity and Enrichment Pipeline — identity resolved, data sanctioned, signals interpreted. When an entity is PUBLISHED, its entity record is live on Saiko surfaces.

### Initial Values

**PUBLISHED** — The entity record is visible on Saiko surfaces.

**UNPUBLISHED** — The entity record is not visible on Saiko surfaces.

These are the starting values. The model intentionally leaves room for additional publication states as the product evolves. For example, there may be future scenarios where an unpublished entity record is visible to internal operators, to a select group for preview, or shared with a restaurant owner for review before going live. The principle is that publication status is its own axis — how many values it eventually holds is a product decision, not an architecture constraint.

### Why Publication Status Is Independent

Any combination of operating status and publication status should be expressible. Examples:

- OPERATING + PUBLISHED — normal steady state. The restaurant is open, its entity record is on Saiko.
- OPERATING + UNPUBLISHED — the restaurant is open in the real world, but Saiko isn't showing its entity record yet. Maybe the data isn't ready. Maybe it was removed from the surface for editorial reasons.
- SOFT_OPEN + PUBLISHED — the restaurant is doing invite-only previews and Saiko is featuring its entity record.
- SOFT_OPEN + UNPUBLISHED — we know about the soft open but haven't published the entity record yet.
- TEMPORARILY_CLOSED + PUBLISHED — the restaurant is closed for renovation, but Saiko keeps the entity record visible with appropriate messaging so users know it exists and will return.
- TEMPORARILY_CLOSED + UNPUBLISHED — closed and pulled from surfaces.
- PERMANENTLY_CLOSED + UNPUBLISHED — business is gone, entity record is retained internally but not shown.

Today, publication is an emergent property of multiple things: status not being CANDIDATE, status not being PERMANENTLY_CLOSED, having a `FieldsMembership` row without a `removedAt`, and having no open `entity_issues` with `blocking_publish`. There is no single field that says "this entity record is published." This makes it hard to reason about, hard to override, and impossible to express cases like "this entity meets all the criteria but we don't want to show it right now."

### What Needs to Be True

- Publication status must be explicitly controlled, not implied by the absence of blockers.
- Publication status must be independent of operating status. Any operating status can be PUBLISHED or UNPUBLISHED.
- Publication status must be independent of Identity and Enrichment Pipeline state. Pipeline completeness may inform the decision, but it doesn't make the decision.
- Changing publication status should be a deliberate action, not a side effect of enrichment or issue resolution.

### Design Decision (Deferred)

The exact storage mechanism is not defined in this document. The existing `FieldsMembership` table already tracks inclusion/removal with timestamps and curator attribution — it may be the right home for this, formalized as the canonical publication control. Alternatively, a simple field on the entity may be sufficient. This will be defined in a follow-up spec.

---

## 6. Terminology

**Entity** — The canonical term for a business, place, or point of interest in the Saiko system. Replaces legacy "place" terminology.

**Entity Record** — The composed, consumer-facing representation of an entity. The output of the Identity and Enrichment Pipeline — identity resolved, data sanctioned, signals interpreted. This is what gets published on Saiko surfaces.

**Operating Status** (`operatingStatus`) — Real-world business state. Is the business functioning? Values: SOFT_OPEN, OPERATING, TEMPORARILY_CLOSED, PERMANENTLY_CLOSED. Independent of Saiko's internal process and publication decisions.

**Enrichment Status** (`enrichmentStatus`) — Where the entity is in Saiko's Identity and Enrichment Pipeline. Values: INGESTED, ENRICHING, ENRICHED. Independent of real-world operating status.

**Publication Status** (`publicationStatus`) — Whether the entity record is visible on Saiko surfaces. Values: PUBLISHED, UNPUBLISHED (initial set; may expand). Explicitly controlled, independent of both operating status and enrichment status.

**Note on legacy terminology:** The codebase contains references to "places" in type names (`PlaceStatus`, `PlacePageData`, `PlaceCardData`, `PlaceType`), table names, and documentation. These are legacy artifacts and should be migrated to "entity" terminology as part of the implementation of this model.

---

## 7. What This Document Does Not Define

This document establishes the conceptual model and defines the three status fields, their values, and their semantics. The following are deferred to follow-up specs:

- Exact storage mechanism for publication status (dedicated field vs. formalized FieldsMembership pattern)
- Completeness model (subtype-based data coverage assessment)
- Standard gate (minimum threshold for entity record quality)
- Migration path from current `PlaceStatus` enum to the three-field model
- Timeline for legacy "place" terminology cleanup in code and docs

---

---

## 8. Implementation Status

This section tracks the rollout of the three-axis model into the codebase.

### Phase 1 — Dual-Write (Shipped 2026-03-26)

All intake paths now set `enrichmentStatus: INGESTED` and `publicationStatus: UNPUBLISHED` alongside legacy `status: CANDIDATE`. Enrichment trigger sets `enrichmentStatus: ENRICHING` on start. Pipeline completion (stage 7) sets `enrichmentStatus: ENRICHED`. Files touched: `app/api/admin/intake/route.ts`, `app/api/admin/intake/resolve/route.ts`, `lib/smart-enrich.ts`, `scripts/bulk-intake.ts`, `scripts/intake-ramen-places.ts`, `scripts/intake-pizza-places.ts`, `app/api/admin/enrich/[slug]/route.ts`, `app/api/admin/tools/enrich-stage/route.ts`, `scripts/enrich-place.ts`.

### Phase 2 — Coverage-Ops Read Migration (Shipped 2026-03-26)

Issue scanner and coverage dashboard filter on three-axis fields with legacy fallback for pre-migration entities. Pending enrichment count surfaced in dashboard. Files touched: `lib/coverage/issue-scanner.ts`, `lib/coverage/duplicate-scanner.ts`, `app/api/admin/coverage-dashboard/route.ts`, `lib/admin/coverage/dashboard-queries.ts`, `app/admin/coverage/page.tsx`.

### Phase 3 — Remove Implicit CANDIDATE→OPEN Promotion (Planned)

The enrichment trigger currently still sets `status: OPEN` when promoting from CANDIDATE. This phase removes that side effect so enrichment transitions stay on the enrichment axis only. Operating status will be set independently based on evidence (e.g., Google Places business status).

### Phase 4 — Legacy Status Read Deprecation (Planned)

Remaining code that reads `entity.status` will be migrated to the appropriate axis. The legacy `PlaceStatus` enum and `status` field will be marked deprecated.

### Tooling

Validation: `scripts/validate-entity-state-model.ts` — checks that recent entities have non-null three-axis fields.

Backfill: `scripts/backfill-entity-state-model.ts` — one-time migration for pre-dual-write entities. Idempotent (only writes where all three fields are null). Dry-run by default, requires `--apply` for writes.

---

*Saiko Fields · Entity State Model · Updated 2026-03-26 · Phases 1-2 Shipped*
