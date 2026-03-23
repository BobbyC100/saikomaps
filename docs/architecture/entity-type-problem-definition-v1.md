---
doc_id: ARCH-ENTITY-TYPE-PROBLEM-DEFINITION-V1
doc_type: architecture
status: draft
title: "Entity Type Taxonomy — Problem Definition"
owner: Bobby Ciccaglione
created: "2026-03-21"
last_updated: "2026-03-21"
project_id: SAIKO
systems:
  - fields-data-layer
  - enrichment
  - entity-model
related_docs:
  - docs/architecture/entity-classification-framework-v1.md
  - docs/architecture/entity-type-taxonomy-v1.md
  - docs/PLATFORM_DATA_LAYER.md
  - docs/architecture/coverage-tiers-v1.md
summary: "Problem definition for the entity type model. Documents why the current single-type (venue) assumption is breaking across mobile entities, park facilities, and dormant schema fields. Doc 1 of 3 in the Entity Type Taxonomy series."
---

# Entity Type Taxonomy — Problem Definition

**SAIKO FIELDS · INTERNAL**

Doc 1 of 3 · March 2026 · Draft for internal review

## Purpose

This document defines why the current entity model is insufficient, what is breaking in the live corpus as a result, and what the model needs to support. It is the foundation for the classification framework and migration strategy that follow.

This is a problem definition document. It does not propose solutions or schema changes.

## The core assumption that is breaking

The Fields entity model was built around one implicit assumption:

> *Every entity is a fixed-address commercial venue with a stable physical location, regular weekly hours, and a Google Place ID as its primary identity anchor.*

That assumption is encoded everywhere — in the enrichment pipeline, in the data schema defaults, in the place page rendering logic, and in the admin tooling. It was a reasonable starting point for a corpus that began with restaurants and cafes.

It is no longer true of the full corpus, and the gap is causing real data integrity failures.

## What is actually in the corpus

As of March 2026, the active corpus contains 1,029 OPEN/OPERATING entities. A scan of the full corpus reveals three structurally distinct entity problems that the current model cannot handle:

### 1. Mobile entities with false operating locations

Food trucks, carts, and mobile vendors exist in the corpus. The enrichment pipeline resolved their Google Place IDs and wrote the resulting address as the operating location. In several cases that address is a commissary kitchen, a registered business address, or a location in a different city entirely.

| Entity | Address in system | Problem | Actual anchor |
|--------|-------------------|---------|---------------|
| Alejandra's Quesadilla Cart de Oaxaca | Los Angeles, CA 90026 (city/zip only) | No street address. Coords approximate. | Instagram: alejandrasquesadillas |
| Kogi BBQ Truck | 5447 Kearny Villa Rd, San Diego, CA | Wrong city. Kogi is an LA institution. GPID resolved to a single location in San Diego. | Brand / Instagram: kogibbq |
| Leo's Tacos Truck | 415 Glendale Blvd, Los Angeles, CA | Address is likely a consistent parking spot — behaves closer to fixed venue. | GPID + consistent spot |

These are the three cases surfaced by name heuristic. The true count of mobile entities in the corpus is unknown.

### 2. Park facilities with no hierarchy and no data

The corpus contains 45 entities with primary_vertical = PARKS. Every single one has null address, null neighborhood, null GPID, and null parent_id. They are marked OPEN and OPERATING but carry zero data.

| Metric | Count | Implication |
|--------|-------|-------------|
| Total PARKS entities | 45 | All active, all dark |
| With GPID | 0 | Google Places enrichment cannot run |
| With address | 0 | Not renderable on place page |
| With parent_id | 0 | No hierarchy modeled despite parent/child relationships being obvious from names |

The naming pattern reveals the intended hierarchy. Griffith Park Soccer Fields, Griffith Park Tennis Courts, and Harding Golf Course (Griffith Park) are clearly children of Griffith Park. But Griffith Park itself does not exist as an entity. The parent is missing.

Most of the 45 records are child facilities — specific courts, pools, fields — whose parent parks were never added to the corpus. The children exist but have nothing to connect to.

### 3. The parent_id and market_schedule fields are dormant

The entities schema already contains two fields that anticipate non-standard entity modeling:

- **parent_id** — a foreign key for containment relationships. Zero records use it.
- **market_schedule** (jsonb) — for event or market-based scheduling. Five records use it.

These fields are evidence that the data model was designed to support more entity types than are currently expressed. The infrastructure exists. It has never been activated.

## Corpus scan — full picture

A scan of all 1,029 active entities (status = OPEN, operating_status = OPERATING) produced the following:

| Dimension | Count | Notes |
|-----------|-------|-------|
| Total active entities | 1,029 | All typed as venue |
| No address | 156 (15%) | Not a rounding error. 1 in 6 active records has no address. |
| No hours | 186 (18%) | May include parks, mobile entities, and sparse venue records. |
| Has GPID | 876 (85%) | Strong coverage for fixed venues. |
| Instagram only — no GPID | 91 | These entities cannot be enriched via Google Places. |
| No identity anchor (no GPID, no Instagram) | 62 | Completely unanchored. No enrichment path exists. |
| parent_id populated | 0 | Containment relationship is unmodeled in the live corpus. |
| market_schedule populated | 5 | Field exists but nearly unused. |

## Why this is a data integrity problem, not a rendering problem

The place page silently collapsing when data is thin is a symptom. The root cause is that the system is assigning data to entities using rules that don't apply to their actual nature.

- A food truck's GPID resolving to a San Diego address is not a missing field. It is a false fact being stored as truth.
- A park facility marked OPEN with no address, no neighborhood, and no parent is not sparse — it is incoherent.
- An entity with no GPID and no Instagram handle has no path to enrichment under the current model. It will stay dark indefinitely.

Fixing the page without fixing the underlying model would paper over failures that will compound as the corpus grows.

## Conclusion

> *The current model is overfit to fixed-address commercial venues. It cannot correctly represent mobile entities, contained facilities, or public space infrastructure. The mismatch is causing active data integrity failures in the live corpus.*

The next document — Entity Classification Framework v1 — defines the replacement model: a dimension-based approach where entity characteristics are stored as discrete attributes and type patterns are derived, not hardcoded.

*Doc 1 of 3 · Continues in Entity Classification Framework v1*
