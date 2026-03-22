---
doc_id: ARCH-ENTITY-TYPE-TAXONOMY-V1
doc_type: architecture
status: draft
title: "Entity Type Taxonomy — Early Problem Statement"
owner: Bobby Ciccaglione
created: "2026-03-21"
last_updated: "2026-03-21"
project_id: SAIKO
systems:
  - fields-data-layer
  - enrichment
  - entity-model
related_docs:
  - docs/architecture/entity-type-problem-definition-v1.md
  - docs/architecture/entity-classification-framework-v1.md
  - docs/PLATFORM_DATA_LAYER.md
summary: "Early-stage problem statement for the entity type taxonomy. Identifies the four differentiating dimensions, candidate entity types, and open questions requiring team feedback before schema work. Precursor to the full Problem Definition (Doc 1) and Classification Framework (Doc 2)."
---

# Entity Type Taxonomy — Problem Definition

**SAIKO FIELDS**

Draft for discussion · March 2026

## Why this exists

The Fields entity model currently treats every record as a fixed-address venue. One entity type. One enrichment path. One page shape.

That assumption is breaking. We have live entities in the corpus — food trucks, carts, market stalls — where the system has silently assigned a registered business address or commissary kitchen as the operating location. The place page renders that address as fact. It isn't.

This is a data integrity problem, not a rendering problem. Before we can fix it at the page, we need to define what kinds of things we're actually modeling.

## What the data showed

All 1,114 entities are currently typed as venue. The PlaceType enum has activity and public defined but unused. No mobility or permanence concept exists anywhere in the schema.

Three active entities surfaced via name heuristic that are clearly not fixed venues:

- **Alejandra's Quesadilla Cart de Oaxaca** — city-level address only, coords approximate, identity anchored to Instagram
- **Leo's Tacos Truck** — has a street address that is likely a consistent parking spot, behaves closer to a fixed venue
- **Kogi BBQ Truck** — resolved to a San Diego address, coordinates are wrong, operates multiple trucks across LA on a rotating schedule

*This is not a comprehensive count. The true number of non-permanent entities in the corpus is unknown.*

## Four dimensions that define entity type

Before assigning buckets, we need to agree on what actually differentiates one entity type from another. Four dimensions emerged from the analysis:

| Dimension | What it captures | Why it matters |
|-----------|-----------------|----------------|
| Operating location | Where the place actually operates — not where the business is registered or warehoused | A truck's GPID may resolve to a commissary kitchen. That address is not the operating location. |
| Schedule type | Regular weekly hours vs. event, market, or route-based schedule | These require fundamentally different data models. A weekly hours JSON breaks for a pop-up. |
| Identity anchor | What makes this definitively this place when GPID or fixed address is absent | Confidence must come from somewhere. Instagram handle, operator, brand name are valid anchors. |
| Containment | Does this place exist inside or as part of another place | A stall inside Grand Central Market is a different entity type than the market itself. The relationship matters. |

## Candidate entity types

Based on these dimensions, four logical types appear to cover the current corpus and near-term scope:

| Candidate type | Operating location | Schedule | Identity anchor | Containment |
|---------------|-------------------|----------|-----------------|-------------|
| Fixed venue | Permanent street address | Regular weekly | GPID / address | Independent |
| Mobile / truck | No fixed address, or consistent spot that isn't the registered address | Regular or route-based | Brand / Instagram / operator | Independent |
| Contained entity | Inside another venue (market, food hall) | Inherits or has own schedule | Name + parent venue | Contained within parent_id |
| Pop-up / residency | Borrowed — hosted at another venue | Date-bounded | Operator + host venue + dates | Temporary relationship to host |

*Note: the current PlaceType enum (venue, activity, public) does not map cleanly to these types. Any taxonomy decision will require a schema change.*

## What this document is not deciding

- Which exact enum values get added to PlaceType
- Whether mobility is a type or a separate attribute
- How the place page renders differently per type
- Enrichment pipeline changes
- How many non-permanent entities actually exist in the corpus (requires a deeper data pull)

## Open questions — this document needs your feedback

This is a problem definition, not a proposal. The following questions need answers before any schema work begins:

| Question | Stakes |
|----------|--------|
| Is PlaceType the right place to encode mobility, or should it be a separate dimension (e.g. mobility_class)? | Type vs. attribute changes how enrichment rules, page rendering, and identity validation are written. |
| How do we handle multi-unit mobile brands like Kogi — one entity or one per truck? | Affects identity integrity, operating location modeling, and schedule data. |
| What is the right identity confidence threshold for a mobile entity with no GPID? | We need a confidence model that doesn't depend on GPID as the primary anchor. |
| Does containment (stall inside market) belong in PlaceType, or purely in the parent_id relationship? | Determines whether contained entities need their own type value or are modeled relationally. |
| How many non-permanent entities actually exist in the corpus today, and what data do they carry? | We found 3 via name heuristic. The true count is unknown. Decision should reflect actual corpus makeup. |

## Proposed next step

Run a full corpus scan — not just name heuristics — to understand how many non-permanent or ambiguously typed entities actually exist and what data they carry. Decision quality depends on knowing the real shape of the problem.

That output feeds the type taxonomy decision. Schema work comes after.
