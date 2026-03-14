---
doc_id: FIELDS-ERA-OVERVIEW-V1
doc_type: architecture
status: active
owner: Bobby Ciccaglione
created: 2026-03-12
last_updated: 2026-03-12
project_id: SAIKO
systems:
  - fields-data-layer
  - data-pipeline
related_docs:
  - docs/PLATFORM_DATA_LAYER.md
  - docs/FIELDS_V2_TARGET_ARCHITECTURE.md
  - docs/RESOLVER_AND_PLACES_DATA_FLOW.md
  - docs/PROVENANCE_SYSTEM.md
summary: Defines Entity Record Awareness (ERA) — how Saiko becomes aware a place exists, separating awareness from canonical (Golden) status to prevent silent drift.
---

# Entity Record Awareness (ERA) — One-Pager

**Scope:** Top-of-funnel place awareness → canonical promotion

---

## What This Is

Entity Record Awareness (ERA) describes how Saiko becomes aware that a place exists.

ERA is the first contact layer of the Saiko system. It comes before enrichment, confidence scoring, and canonical (Golden) status.

This document exists to:
- Establish a shared mental model for how records enter Saiko
- Separate awareness from truth
- Prevent silent canonical drift

This is not a UI spec or a redesign proposal.

---

## Core Principle

**Awareness ≠ Canon**

A place being known to Saiko does not mean:
- It is correct
- It is complete
- It should be trusted
- It should be promoted

ERA answers exactly one question: "Does the system know this place exists?"

Canonical status is earned later through explicit gates.

---

## How Places Become Known (ERA Paths)

Saiko becomes aware of places through multiple entry paths. All of these create entities (awareness records), not canon.

**Primary ERA Surfaces**
- Map Creation UI — Search, Google Maps link, CSV upload
- Add-to-List / Import flows
- CLI ingestion scripts

**Key Characteristics**
- Some paths require a `google_place_id`
- Some paths allow records without GPID
- No ERA path directly confers Golden status

ERA paths are intentionally permissive; canon is intentionally strict.

---

## ERA vs Canon (Golden Records)

Saiko is designed as a golden-first canonical system.

- ERA creates awareness
- Canon (Golden Records) represents belief

**Canon is controlled by:**
- Explicit promotion steps
- GPID requirements
- Survivorship and merge rules
- Enrichment and confidence gates

Promotion is opt-in, never implicit.

---

## Known Risks (If ERA Is Not Managed)

Without explicit ERA discipline, systems drift. Observed drift takes the form of:
- Entities without GPID
- Duplicate entities for the same place
- Orphan entities that never enrich
- Missing coordinates or stalled confidence scores

These are symptoms, not root causes. The root cause is uncontrolled awareness → canon assumptions.

---

## Why ERA Exists

ERA exists to allow Saiko to:
- Be curious without being careless
- Accept imperfect inputs without polluting canon
- Separate discovery from belief
- Scale ingestion without sacrificing integrity

ERA is not a weakness in the system. It is the safety layer that makes canonical rigor possible.

---

## Bottom Line

- ERA is how Saiko learns a place exists
- Canon is how Saiko decides a place matters
- Confusing the two creates drift
- Separating them creates durability

This document is the canonical reference for that separation.
