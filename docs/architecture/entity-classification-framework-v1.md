---
doc_id: ARCH-ENTITY-CLASSIFICATION-FRAMEWORK-V1
doc_type: architecture
status: draft
title: "Entity Classification Framework v1 — Dimension-Based Model"
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
  - docs/architecture/entity-type-taxonomy-v1.md
  - docs/PLATFORM_DATA_LAYER.md
  - docs/architecture/coverage-tiers-v1.md
summary: "Defines the four-dimension classification model for entities: operating location, schedule type, identity anchor, and containment. Types are derived from stored dimensions, not hardcoded enums. Includes entity relationship rules and derived pattern table. Doc 2 of 3 in the Entity Type Taxonomy series."
---

# Entity Classification Framework v1 — Dimension-Based Model

**SAIKO FIELDS · INTERNAL**

Doc 2 of 3 · March 2026 · Draft for internal review

## Core principle

> *Routing and interpretation are derived from four stored dimensions. The schema preserves the dimensions themselves wherever possible. Types are views, not stored truth.*

This protects against brittle enums and combinatorial explosion. A taco truck that operates on a regular schedule at a consistent spot shares characteristics with a fixed venue on some dimensions and a mobile entity on others. Forcing it into a single hardcoded type loses that nuance.

Instead: store the dimensions. Derive the pattern. Let the pattern drive enrichment routing, page rendering, and identity validation.

## The four dimensions

These are the four attributes that meaningfully differentiate how an entity behaves in the system. Each is stored as a discrete field on the entity record.

### Dimension 1 — Operating location

Where does the entity actually operate? This is distinct from where the business is registered, where it is warehoused, or what a GPID happens to resolve to.

| Value | Meaning | Examples |
|-------|---------|----------|
| **fixed** | Permanent street address. Location is the identity. | Restaurant, café, retail shop |
| **mobile** | No fixed address, or a consistent spot that is not the registered address. Location follows the operator. | Food truck, street cart, pop-up stand |
| **contained** | Exists physically inside another entity. Location is derived from or shared with the parent. | Market stall, food hall vendor, park facility |
| **civic** | Public land or infrastructure. No operator. Location defined by coordinates and boundary, not address. | Park, trail, beach, public court |

### Dimension 2 — Schedule type

How does the entity's availability work? This determines which scheduling data model applies.

| Value | Meaning | Examples |
|-------|---------|----------|
| **regular** | Consistent weekly hours. Monday–Sunday schedule applies. | Most restaurants, cafes, retail |
| **market** | Operates on a market or event calendar. market_schedule field applies. | Farmers market vendor, weekend pop-up |
| **route** | Moves on a schedule or route. No single set of hours applies. | Multi-location truck like Kogi |
| **open_access** | No formal hours. Available when accessible. May have seasonal closures. | Park, trail, public beach |
| **date_bounded** | Operates only within a defined date range. | Pop-up residency, seasonal installation |

### Dimension 3 — Identity anchor

What is the authoritative source that establishes this entity's identity with high confidence? This drives enrichment routing and confidence scoring.

| Value | Meaning | Enrichment path |
|-------|---------|-----------------|
| **gpid** | Google Place ID is the primary anchor. Most reliable. | Standard Google Places enrichment |
| **social** | Instagram or other social handle is the primary anchor. GPID absent or unreliable. | Social profile enrichment, manual confirmation |
| **operator** | Identity is anchored to the operator or brand entity, not a location. | Operator record enrichment, brand signals |
| **parent** | Identity derives from the parent entity. Child inherits location and core facts. | Parent entity enrichment, coordinates inherited |
| **coordinates** | Lat/lng is the primary anchor. No GPID, no social presence. | Reverse lookup, public records, manual entry |

### Dimension 4 — Containment

Does this entity exist inside or as part of another entity? This determines whether parent_id is required, optional, or irrelevant, and whether the entity inherits data from a parent.

| Value | Meaning | parent_id behavior |
|-------|---------|-------------------|
| **independent** | Exists on its own. No parent relationship required. | parent_id is null. Valid. |
| **contained** | Exists inside another entity. Parent may or may not be in the system yet. | parent_id should be set when parent exists. Absence does not invalidate the record. |
| **host** | This entity contains others. Parent of contained children. | parent_id is null. Children point to this record. |

## Entity relationship rules

These rules govern how parent/child relationships work in the system. They are non-negotiable invariants.

- Relationships are optional in both directions. A child can be published without a parent in the system. A parent can exist without any children connected.
- Absence of a parent_id does not invalidate a child record. It means the relationship is unresolved, not that the entity is broken.
- A child entity inherits coordinates and neighborhood from its parent when its own values are null. It does not inherit name, hours, or identity fields.
- A parent entity does not inherit anything from its children.
- There is no required depth limit, but the initial model assumes a maximum of one level of containment (child → parent, no grandparent).
- An entity cannot be both a child (has parent_id) and a host (has children pointing to it) in v1. This constraint may be revisited.

## Derived entity patterns

The following patterns are the expected combinations of the four dimensions. These are not stored types — they are derived interpretations used for enrichment routing, page rendering, and admin classification. They can change as the model evolves without requiring schema migration.

| Pattern | Location | Schedule | Anchor | Containment | Examples |
|---------|----------|----------|--------|-------------|----------|
| Fixed venue | fixed | regular | gpid | independent | Restaurant, café, bar |
| Mobile entity | mobile | regular or route | social or operator | independent | Food truck, cart |
| Contained entity | contained | regular or market | parent or gpid | contained | Market stall, food hall vendor |
| Pop-up / residency | mobile or contained | date_bounded | operator or social | contained | Residency, seasonal pop-up |
| Civic parent | civic | open_access | coordinates | host | Griffith Park, Alondra Park |
| Park facility | contained | regular or open_access | parent or gpid | contained | Tennis courts, pool, skatepark |

This table is illustrative, not exhaustive. New patterns can be added without schema changes as long as they are combinations of the four stored dimensions.

## What does not change

- All existing entity records remain valid. No existing data is invalidated by this model.
- The PlaceType enum (venue, activity, public) is not changed in v1. It is a separate concern from the dimension model.
- The enrichment pipeline continues to run on GPID-anchored entities unchanged.
- The place page rendering contract is not changed by this document. Rendering changes are out of scope here.
- Editorial authority over identity fields is unchanged. Dimensions are factual attributes, not editorial classifications.

## Open questions for review

- Should location_type, schedule_type, identity_anchor, and containment_type be added as explicit columns on entities, or stored in a separate dimension table?
- How should the system handle entities that legitimately span multiple location types — e.g. a chef who runs both a fixed restaurant and a pop-up series?
- What is the right confidence threshold for publishing a contained entity with no parent in the system yet?
- Does the PlaceType enum (venue, activity, public) need to be reconciled with the new dimension model, or can they coexist independently?

*Doc 2 of 3 · Continues in Entity Taxonomy Migration Strategy v1*
