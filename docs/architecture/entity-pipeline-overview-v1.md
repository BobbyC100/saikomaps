---
doc_id: FIELDS-ENTITY-PIPELINE-OVERVIEW-V1
doc_type: architecture
status: active
owner: Bobby Ciccaglione
created: 2026-03-12
last_updated: 2026-03-12
project_id: FIELDS
systems:
  - entity-resolution
  - fields-data-layer
related_docs:
  - docs/FIELDS_V2_TARGET_ARCHITECTURE.md
  - docs/architecture/fields-era-overview-v1.md
  - docs/ENTITIES_CONTRACT_RECONCILIATION.md
summary: High-level model of the stages through which an entity moves inside Saiko — from first contact (Awareness) through Identification to Enrichment. Mental model only; does not prescribe UI, schema, or workflow.
---

# Entity Pipeline — Overview

**System:** Saiko
**Domain:** Entity Lifecycle
**Status:** Conceptual (Locked)
**Scope:** System model, not implementation

---

## Purpose

Define the high-level stages through which an entity moves inside the Saiko system, from first contact to enriched state.

This document establishes mental model only. It does not prescribe UI, schema, or workflow.

---

## Pipeline Stages

### 1. Awareness

- System has received signals that an entity may exist
- Signals are stored in a structured, attributable form
- No identity, truth, or readiness is asserted

### 2. Identification

- System attempts to uniquely identify the entity
- Identity anchors are evaluated
- Canonical identifiers may be assigned

### 3. Enrichment

- Structured, editorial, and derived data is added
- External systems may be consulted
- Cost, confidence, and completeness are relevant

---

## Maturity (State, Not Stage)

- "Mature" describes depth and quality of enrichment
- Maturity is relative to entity type
- Not all entities are expected to reach the same maturity

---

## Core Principle

Intake does not assert truth.
Truth, identity, and confidence are earned downstream.
