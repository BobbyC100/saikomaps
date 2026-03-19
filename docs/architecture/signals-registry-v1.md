---
doc_id: SKAI-DOC-FIELDS-SIGNALS-REGISTRY-001
doc_type: architecture
title: Signals Registry
status: active
owner: Bobby
created: 2026-03-16
last_updated: 2026-03-16
project_id: saiko-fields
systems:
  - Fields
  - TRACES
summary: Defines how atomic and derived cultural signals are formally structured and governed within the Saiko Fields system.
related_docs:
  - SKAI-DOC-FIELDS-ATOMIC-SIGNALS-001
  - SKAI-DOC-FIELDS-SYSTEM-MAP-001
  - SKAI-DOC-FIELDS-IDENTITY-RESOLVER-001
  - SKAI-DOC-FIELDS-GLOSSARY-001
  - SKAI-DOC-FIELDS-DATA-LAYER-CONTRACT-001
---

# Signals Registry

**Document ID:** SKAI-DOC-FIELDS-SIGNALS-REGISTRY-001  
**System:** Fields / TRACES  
**Layer:** Architecture  
**Status:** Active  
**Owner:** Bobby

---

## Overview

The Signals Registry is the canonical specification layer for all formal signals in Saiko Fields.

It defines how signals are named, typed, governed, and consumed across the system.
This includes both atomic signals and derived signals.

The registry operationalizes the signal model defined in `SKAI-DOC-FIELDS-ATOMIC-SIGNALS-001`.

---

## Why Signals Need a Registry

Without a formal registry, signals drift across ingestion, identity, enrichment, and interpretation layers.
Different teams can reuse the same signal name with conflicting meaning, or introduce duplicate signals
with inconsistent structure.

A registry is required to ensure:

- shared signal semantics across Fields and TRACES
- strict type and value consistency
- stable ownership and governance
- clear lineage from source observation to interpretation
- safe evolution over time without architecture drift

---

## Signal Definition Structure

Every registered signal must define the following fields:

- `signal_id`
- `signal_type` (`atomic` | `derived`)
- `data_type` (`boolean`, `enum`, `numeric`, `text`, etc.)
- `allowed_values`
- `source_type` (`google`, `editorial`, `ingestion`, `derived`)
- `derivation_logic` (required for derived signals)
- `owner_system` (`Fields` | `TRACES`)
- `created_at`
- `last_updated`
- `description`

This structure is the minimum canonical contract for signal registration.

---

## Atomic vs Derived Signals

### Atomic Signals

Atomic signals are observable, sourceable, structured facts captured from evidence.
They are non-interpretive and owned by Fields.

Examples:

- `reservable`
- `serves_dinner`
- `primary_vertical`

### Derived Signals

Derived signals are computed from atomic signals and canonical state.
They remain structured, but include explicit derivation logic and lineage.

Examples:

- `scene_energy`
- confidence/completeness flags
- routing or scoring features

Interpretation layers consume atomic and derived signals, but interpretation itself is not a signal type.

---

## Signal Ownership

Ownership is set per signal definition and governs change authority.

| Signal concern | Owner system |
|---|---|
| Atomic signal definition and structure | Fields |
| Derived signal computation contract | Fields |
| Interpretation usage and narrative rendering | TRACES |
| Registry governance and canonical definitions | Fields (with TRACES alignment for interpretation-facing signals) |

TRACES does not redefine atomic semantics.
TRACES consumes registry-defined signals for interpretation outputs.

---

## Signal Lifecycle

Signals move through controlled lifecycle states:

1. **Proposed** - candidate definition drafted
2. **Registered** - definition approved and entered in registry
3. **Active** - used by system contracts
4. **Deprecated** - retained for compatibility, no new dependencies
5. **Archived** - removed from active use, preserved for history

Lifecycle transitions require governance review and backward-compatibility checks.

---

## Signal Governance Rules

1. Every active signal must have a unique `signal_id`.
2. Every signal must declare `signal_type`, `data_type`, and `owner_system`.
3. `allowed_values` must be explicit for enum-like or constrained signals.
4. Derived signals must define `derivation_logic`.
5. New signals cannot silently redefine an existing signal's meaning.
6. Changes to active signal semantics require versioned change review.
7. Interpretation layers may consume signals but cannot alter registry truth contracts.

---

## Example Signal Definitions

### `serves_dinner`

- `signal_id`: `serves_dinner`
- `signal_type`: `atomic`
- `data_type`: `boolean`
- `allowed_values`: `true | false`
- `source_type`: `ingestion`
- `derivation_logic`: `null`
- `owner_system`: `Fields`
- `created_at`: `2026-03-16`
- `last_updated`: `2026-03-16`
- `description`: Indicates whether the place is observed to serve dinner.

### `reservable`

- `signal_id`: `reservable`
- `signal_type`: `atomic`
- `data_type`: `boolean`
- `allowed_values`: `true | false`
- `source_type`: `google`
- `derivation_logic`: `null`
- `owner_system`: `Fields`
- `created_at`: `2026-03-16`
- `last_updated`: `2026-03-16`
- `description`: Indicates whether reservations are supported by the place.

### `scene_energy`

- `signal_id`: `scene_energy`
- `signal_type`: `derived`
- `data_type`: `numeric`
- `allowed_values`: `0.0-1.0`
- `source_type`: `derived`
- `derivation_logic`: Computed from a weighted combination of atomic behavioral, temporal, and context signals.
- `owner_system`: `Fields`
- `created_at`: `2026-03-16`
- `last_updated`: `2026-03-16`
- `description`: Structured estimate of place energy level used by downstream interpretation and ranking layers.

---

## Event Program Signals

Added 2026-03-18 as part of Events Program V1 (`ARCH-EVENTS-PROGRAM-V1`).

Event signals are derived from merchant surfaces (events pages, catering pages, private dining pages) and from existing `merchant_surface_scans.private_dining_present`. They feed into three new offering program containers: `private_dining_program`, `group_dining_program`, `catering_program`.

All event signals follow the same maturity model as beverage programs: `none` | `incidental` | `considered` | `dedicated` | `unknown`.

### Private Dining Signals

| signal_id | signal_type | data_type | allowed_values | source_type | description |
|---|---|---|---|---|---|
| `private_room_available` | atomic | boolean | true \| false | ingestion | Place has a private or semi-private dining room. |
| `full_buyout_available` | atomic | boolean | true \| false | ingestion | Place offers full-venue buyouts. |
| `semi_private_available` | atomic | boolean | true \| false | ingestion | Place offers semi-private spaces (not fully enclosed). |
| `events_coordinator` | atomic | boolean | true \| false | ingestion | Place has a named events coordinator or events team. |
| `inquiry_form_present` | atomic | boolean | true \| false | ingestion | Events/private dining inquiry form detected on merchant website. |
| `events_page_present` | atomic | boolean | true \| false | ingestion | Dedicated events or private dining page detected on merchant website. |

### Group Dining Signals

| signal_id | signal_type | data_type | allowed_values | source_type | description |
|---|---|---|---|---|---|
| `group_menu_available` | atomic | boolean | true \| false | ingestion | Place offers a dedicated group or banquet menu. |
| `minimum_headcount` | atomic | boolean | true \| false | ingestion | Place specifies minimum guest counts for group bookings. |
| `prix_fixe_group_menu` | atomic | boolean | true \| false | ingestion | Place offers prix fixe menus specifically for groups/events. |

### Catering Signals

| signal_id | signal_type | data_type | allowed_values | source_type | description |
|---|---|---|---|---|---|
| `catering_menu_present` | atomic | boolean | true \| false | ingestion | Dedicated catering menu detected on merchant website. |
| `off_site_catering` | atomic | boolean | true \| false | ingestion | Place offers off-site/delivery catering services. |
| `on_site_catering` | atomic | boolean | true \| false | ingestion | Place offers on-site catering for hosted events. |

### Event Derived Signals

Event program maturity is derived from atomic event signals + merchant surface evidence:

| signal_id | signal_type | derivation_logic | owner_system |
|---|---|---|---|
| `private_dining_program.maturity` | derived | events_page + inquiry_form → dedicated; mention on about page → considered; private_dining_present boolean → incidental | Fields |
| `group_dining_program.maturity` | derived | group signals + events_page → dedicated; group signals alone → considered | Fields |
| `catering_program.maturity` | derived | catering signals + events_page → dedicated; catering signals alone → considered | Fields |

---

## Future Evolution

The Signals Registry is expected to evolve with:

- typed validation policies per signal family
- versioned registry snapshots
- lineage references between derived and source signals
- tighter contract links to identity and interpretation systems

Future evolution must preserve the core principle:
signal definitions are canonical data architecture contracts, not ad hoc feature-level metadata.
