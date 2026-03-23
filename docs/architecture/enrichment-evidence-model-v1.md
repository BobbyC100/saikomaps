---
doc_id: ARCH-ENRICHMENT-EVIDENCE-MODEL-V1
doc_type: architecture
status: draft
title: "Enrichment Evidence Model v1 — Presence, Absence, and Interpretation"
owner: Bobby Ciccaglione
created: "2026-03-21"
last_updated: "2026-03-21"
project_id: SAIKO
systems:
  - fields-data-layer
  - enrichment
  - entity-model
related_docs:
  - docs/architecture/enrichment-strategy-v1.md
  - docs/architecture/data-completeness-philosophy-v1.md
  - docs/architecture/enrichment-model-v1.md
  - docs/architecture/entity-classification-framework-v1.md
  - docs/architecture/entity-dimension-implementation-plan-v1.md
  - docs/architecture/entity-awareness-stage-v1.md
  - docs/architecture/source-integration-policy-v1.md
  - docs/architecture/entity-maintenance-policy-v1.md
  - docs/architecture/enrichment-freshness-strategy-v1.md
summary: >
  Establishes the principle that enrichment is the foundation of all downstream
  interpretation. Defines confirmed absence as a first-class signal, source-aware
  staleness cadence, and the rule that entity classification (dimensions) is
  derived from enrichment evidence, not heuristic guessing. Complements the
  existing Enrichment Strategy and Data Completeness Philosophy docs.
---

# Enrichment Evidence Model v1 — Presence, Absence, and Interpretation

**SAIKO FIELDS · INTERNAL**

March 2026 · Draft

## Core Principle

> *Enrichment is the data service. Everything downstream — classification,
> dimensions, page rendering, identity scoring — is a client of that service.
> The richer and more honest the evidence, the more powerful every client becomes.*

Enrichment's job is to accumulate as much high-quality data about an entity as
possible. It does not interpret. It does not decide what an entity "is." It
produces the evidence base from which all interpretation flows.

## What This Document Adds

The Enrichment Strategy (ENRICH-STRATEGY-V1) defines the pipeline, phases,
source ordering, and the evidence → canonical promotion model. The Data
Completeness Philosophy (ARCH-DATA-COMPLETENESS-PHILOSOPHY-V1) defines the
composite identity model and the principle that no single field is sacred.

This document addresses three gaps those docs do not cover:

1. Confirmed absence as a recorded, first-class signal
2. Source-aware staleness and re-check cadence
3. The sequencing rule: enrichment before interpretation

---

## 1. Confirmed Absence Is Data

### The Problem

Today, a null value in a field is ambiguous. `google_place_id = NULL` can mean:

- We checked Google Places and found no match (confirmed absence)
- We never checked (unenriched)
- We checked, found a match, but it was later invalidated (revoked)

These are three fundamentally different states, but they all look the same in
the data. Downstream systems cannot distinguish between them, which means every
inference built on a null is unreliable.

### The Principle

> *Every enrichment check must produce evidence — whether the result is a value
> or the confirmed absence of a value.*

When an enrichment pipeline queries a source for a specific attribute and finds
nothing, that negative result must be recorded with the same rigor as a
positive result:

- **Source:** which source was queried
- **Attribute:** which field was sought
- **Result:** null / not found / no match
- **Confidence:** how confident we are in the negative result
- **Timestamp:** when the check was performed

### How This Maps to Existing Infrastructure

The `observed_claims` table already supports this pattern. A claim is:

- entity_id + source_id + attribute_key + observed_value + confidence + observed_at

A confirmed absence is simply a claim where the observed_value is null and the
confidence is high. The infrastructure exists. The discipline of recording
negative results does not yet.

### Examples

| Entity | Source | Attribute | Result | Confidence | Meaning |
|--------|--------|-----------|--------|------------|---------|
| Bread baker | Google Places | google_place_id | NULL | 0.9 | Confirmed: no Google listing found |
| Leo's Tacos | Google Places | google_place_id | ChIJ_xyz | 0.95 | Confirmed: GPID resolved |
| New intake | Google Places | google_place_id | NULL (no claim) | — | Unknown: never checked |

The first and third rows look identical in the entities table today. They must
be distinguishable in the evidence layer.

### Impact on Downstream Systems

With confirmed absence recorded:

- **Identity scoring** can distinguish "low data" from "genuinely no GPID"
- **Dimension classification** can infer `identity_anchor = social` with
  confidence when GPID absence is confirmed, not just when GPID is null
- **Coverage dashboards** can separate enrichment backlog from entities that
  are fully enriched but sparse by nature
- **Re-enrichment** can target entities that were never checked, not entities
  whose absence is already confirmed

---

## 2. Source-Aware Staleness and Re-Check Cadence

### The Principle

> *Different data points from different sources have different natural
> staleness rates. The system should know how often each type of evidence
> needs to be refreshed.*

A GPID for a brick-and-mortar restaurant is stable for years. An Instagram bio
for a pop-up operator might change weekly. Business hours shift seasonally.
Editorial coverage accumulates over time but individual articles don't expire.

The enrichment timestamp already records *when* a check was performed. What's
missing is a policy for *when to re-check* — a staleness threshold per
source-attribute combination.

### Staleness Tiers (Initial Framework)

These are starting points, not final policy. Bobby refines as needed.

| Source | Attribute | Suggested Re-Check | Rationale |
|--------|-----------|-------------------|-----------|
| Google Places | GPID existence | 6 months | Stable; businesses rarely appear/disappear |
| Google Places | Hours | 3 months | Seasonal shifts, holiday hours |
| Google Places | Business status | 1 month | Closure detection |
| Website | Homepage | 2 months | Menu and hours changes |
| Instagram | Handle existence | 1 month | Handles change, accounts deactivate |
| Instagram | Bio / content | 2 weeks | Pop-ups and operators update frequently |
| Editorial | Coverage search | 3 months | New articles appear over time |
| Coordinates | Lat/lng | Never (unless disputed) | Physical location doesn't move |
| Confirmed absence | Any | Re-check at 2x the positive cadence | Absence might become presence |

### Implementation Approach

The staleness policy should be queryable, not hardcoded in pipeline scripts.
A simple reference table or config mapping `(source, attribute) → re_check_days`
enables:

- Enrichment scheduler queries: "which entities have stale evidence?"
- Dashboard reporting: "how fresh is our data?"
- Cost management: avoid unnecessary paid API calls for recently-confirmed data

### Relationship to Existing Infrastructure

- `merchant_enrichment_runs` tracks enrichment attempts with timestamps
- `observed_claims.observed_at` records when a claim was made
- `place_coverage_status.last_enriched_at` tracks overall enrichment recency

The staleness model extends these by adding the *policy* dimension: not just
"when did we last check?" but "when should we check again?"

---

## 3. Enrichment Before Interpretation

### The Sequencing Rule

> *Entity dimensions, classification labels, and derived patterns are
> downstream of enrichment. They are never the starting point.*

The Entity Dimension Model (ARCH-ENTITY-CLASSIFICATION-FRAMEWORK-V1) defines
four dimensions: location_type, schedule_type, identity_anchor_type,
containment_type. These are the right structural containers. But the values
that go into them must come from enrichment evidence, not from heuristic
guessing based on sparse data.

### Why This Matters

The corpus audit (Phase 1B) demonstrated the problem. Heuristic classification
based on current data produced:

- 95.6% fixed location → but some of those are trucks with commissary addresses
- 100% independent containment → but some entities definitely have host relationships
- 81.7% GPID-anchored → but having a GPID doesn't mean the location is accurate

The heuristics are useful for identifying patterns and gaps, but they are not
trustworthy enough to write dimension values to the database. An entity that
looks like a fixed venue in the data might actually be a roaming operator whose
GPID points to a parking lot.

### The Revised Sequence

The original implementation plan (ARCH-ENTITY-DIMENSION-IMPLEMENTATION-PLAN-V1)
proposed: schema → audit → backfill → enrichment routing. This document revises
the sequencing:

1. **Schema** — dimension columns exist (DONE)
2. **Audit** — heuristic classification reveals patterns and gaps (DONE)
3. **Enrichment depth** — fill evidence gaps, record confirmed absences
4. **Dimension write** — populate dimensions from enrichment evidence, not heuristics
5. **Enrichment routing** — use dimensions to optimize future enrichment paths

Steps 3–5 are iterative. As enrichment improves, dimension values become more
accurate, which makes enrichment routing smarter, which produces better evidence.

### The Data-Tells-Us-What-It-Is Principle

> *Enrich thoroughly. Let the data classify itself.*

If enrichment is complete — GPID checked, address confirmed or denied, Instagram
resolved, parent relationships mapped, schedule data captured — then the
dimension values are self-evident:

- No GPID (confirmed), no fixed address (confirmed), active Instagram, shows
  up at three coffee shops on a rotating schedule → mobile / market / social / contained
- GPID confirmed, address confirmed, regular hours, no parent relationship →
  fixed / regular / gpid / independent
- Coordinates only, public land, seasonal access → civic / open_access / coordinates / host

The enrichment evidence *is* the classification. The dimension columns are just
the structured summary.

### Non-Permanent Entity Patterns

The corpus audit and subsequent review identified a class of entities that
platform data (Google, Yelp) structurally misrepresents because those platforms
force all entities into the same fixed-venue shape:

**Roaming operators** (Leo's Tacos, Kogi) — Have GPIDs that point to commissaries
or most-common spots. Data profile looks identical to a brick-and-mortar
restaurant. Correct classification requires knowing that the GPID address is not
the operating location, which requires enrichment evidence beyond what Google
provides.

**Hosted residencies** (the bread baker at Granada Coffee) — No permanent
location. Identity defined by operator + schedule of host relationships.
Instagram is the primary communication channel. May have no GPID at all.
Correct classification requires relationship data (which hosts, what schedule)
that must be captured through enrichment.

**Farmers market vendors** — Contained within market host entities on a rotating
schedule. Location is derived from the set of markets they attend. Correct
classification requires the parent-child relationships and market schedule data
to be populated.

**Pop-ups** — Temporary by nature. Date-bounded or recurring. Exist inside host
venues. Correct classification requires temporal data and host relationships.

In all cases, the pattern is the same: platform data doesn't carry the signal.
Saiko must capture it through its own enrichment — social monitoring, relationship
mapping, schedule capture — and the classification follows from the evidence.

---

## 4. Accumulative Signal Value

### The Principle

> *Some data points are more valuable in combination than in isolation.
> The system must recognize composite signal patterns, not just individual
> field presence.*

A single Instagram handle is a weak identity signal. But Instagram + confirmed
no-GPID + neighborhood + schedule of host venues = strong composite identity
for a roaming operator. The individual fields are modest; the combination is
definitive.

This aligns with the existing identity scoring model (weighted anchors summing
to a threshold) but extends it to the interpretation layer. Dimension
classification should consider the full evidence profile, not individual fields.

### Source Confidence Hierarchy

Not all sources carry equal weight. The existing model already recognizes this
(ENRICH-STRATEGY-V1, source registry by entity type). For the interpretation
layer, the hierarchy is:

1. **Cross-referenced match** (website + GPID agree on address) — highest confidence
2. **Google Places verified** (GPID with confirmed business status) — very high
3. **Official entity source** (own website, own social) — high
4. **Trusted editorial** (Eater, Michelin, LA Times) — high for certain signals
5. **Social presence** (Instagram, TikTok) — medium, varies by signal type
6. **Inferred** (name pattern matching, reverse geocode) — low, needs corroboration

### Practical Impact

For enrichment: prioritize sources that produce high-confidence evidence, but
don't discard low-confidence signals. They accumulate.

For interpretation: weight the composite evidence, don't threshold on individual
fields. Three medium signals pointing the same direction can be more informative
than one high signal alone.

---

## 5. Relationship to Existing Architecture

This document does not replace or override existing docs. It extends them:

| Existing Doc | What It Covers | What This Doc Adds |
|-------------|----------------|-------------------|
| ENRICH-STRATEGY-V1 | Pipeline, phases, source ordering, evidence → canonical | Confirmed absence, staleness cadence, enrichment-before-interpretation rule |
| DATA-COMPLETENESS-PHILOSOPHY-V1 | Composite identity, no golden field, taco cart principle | Formalizes absence-as-signal, extends composite model to classification |
| ENRICHMENT-MODEL-V1 | Three-bucket model (Identity/Access/Offering), vertical profiles | Unchanged; this doc addresses evidence quality, not bucket structure |
| ENTITY-CLASSIFICATION-FRAMEWORK-V1 | Four-dimension model, derived patterns, relationship rules | Revised sequencing: enrichment depth before dimension backfill |
| ENTITY-DIMENSION-IMPLEMENTATION-PLAN-V1 | Phased implementation plan | Phase 1C (backfill) is deferred until enrichment evidence is sufficient |

---

## 6. Implications for Implementation

### Phase 1 Status (Updated)

- **1A: Schema migration** — COMPLETE. Dimension columns exist, nullable.
- **1B: Corpus audit** — COMPLETE. Heuristic classification run, patterns identified.
- **1C: Dimension backfill** — DEFERRED. Values should come from enrichment
  evidence, not heuristic guessing. Backfill becomes a mechanical step once
  enrichment depth is sufficient.

### New Priority: Enrichment Evidence Completeness

Before dimension values are written, the enrichment pipeline must:

1. Record confirmed absence for key attributes (GPID, address, Instagram, website)
2. Capture parent-child relationships for entities that operate inside others
3. Capture schedule data for entities with non-regular operating patterns
4. Timestamp all enrichment checks for staleness tracking

### What "Sufficient Evidence" Means

An entity has sufficient evidence for dimension classification when:

- All key identity attributes have been checked (not necessarily found — confirmed
  absence counts)
- The source confidence for each check meets the threshold for the source type
- The composite evidence profile is unambiguous enough to derive dimensions
  with confidence ≥ 0.8

Entities below this threshold remain with null dimensions — null means
"not yet classified," not "broken."

---

## Summary

Three principles, one rule:

1. **Record absence.** A null with no claim is unknown. A null with a claim is knowledge.
2. **Track freshness.** Every evidence record has a timestamp. Every source has a staleness policy. Re-check when stale, not on a fixed global schedule.
3. **Accumulate before interpreting.** Push data density as high as possible. Let the patterns emerge. Dimensions are derived from evidence, not guessed from sparse data.

**The rule:** Enrichment is the service. Classification, dimensions, rendering,
and everything downstream are clients. Invest in the service.
