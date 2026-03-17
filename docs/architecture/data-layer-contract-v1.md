---
doc_id: SKAI-DOC-FIELDS-DATA-LAYER-CONTRACT-001
doc_type: architecture
title: Data Layer Contract
status: active
owner: Bobby
created: 2026-03-16
last_updated: 2026-03-16
project_id: saiko-fields
systems:
  - Fields
  - TRACES
summary: Defines architectural boundaries and data access rules between the Saiko Data Layer, Fields platform, and TRACES consumer product.
related_docs:
  - SKAI-DOC-FIELDS-SYSTEM-MAP-001
  - SKAI-DOC-FIELDS-ATOMIC-SIGNALS-001
  - SKAI-DOC-FIELDS-IDENTITY-RESOLVER-001
---

# Data Layer Contract

**Document ID:** SKAI-DOC-FIELDS-DATA-LAYER-CONTRACT-001  
**System:** Fields / TRACES  
**Layer:** Architecture  
**Status:** Active  
**Owner:** Bobby

---

## Overview

This document defines strict architectural boundaries between the Saiko Data Layer,
the Fields platform, and the TRACES product.

Its purpose is to prevent coupling, preserve data truth contracts, and ensure
interpretation logic stays in the correct system layer.

---

## System Layers

### Data Layer

The canonical system-of-record layer for observed signals, identity resolution outputs,
canonical entity state, and governed data contracts.

### Fields Platform

The operational platform layer that manages ingestion, signal normalization, identity
resolution, sanctioning, and derived signal production.

### TRACES Product

The consumer-facing interpretation layer that reads structured canonical outputs and
produces user-facing cultural understanding.

---

## Responsibilities of Each Layer

| Layer | Responsibilities |
|---|---|
| Data Layer | Store canonical signals and identity state; enforce data truth contracts; provide canonical access surfaces. |
| Fields Platform | Ingest evidence; produce atomic and derived signals; resolve identity; maintain canonical state integrity. |
| TRACES Product | Consume canonical data; perform interpretation services; render product experiences and language. |

---

## Data Ownership Rules

1. Fields owns canonical signals and identity state.
2. Fields is the system of record for signals and identity.
3. TRACES does not own source signal truth; it owns interpretation outputs.
4. Product-facing interpretations must be derived from canonical data contracts, not ad hoc raw source reads.

---

## Access Rules

1. Products must not read raw ingestion tables.
2. Products must read from canonical entity state or product APIs.
3. Downstream consumers must treat product APIs and canonical views as the only supported interfaces.
4. Any new consumer path must be contract-defined before adoption.

---

## Forbidden Patterns

- Reading ingestion/raw evidence tables directly from product code.
- Re-implementing identity resolution rules inside product services or UI.
- Interpreting raw signals directly in UI components.
- Embedding interpretation heuristics in frontend rendering logic.
- Allowing TRACES to mutate canonical signal truth.

---

## Examples

### Allowed

- TRACES service reads canonical entity state and derived signals through approved data access surfaces.
- Product API exposes stable fields consumed by product clients.
- Fields pipeline writes normalized atomic/derived signals to canonical storage.

### Not Allowed

- UI code reads raw ingestion rows and decides whether a place is identity-complete.
- Frontend computes narrative interpretation from low-level signal fragments.
- Product service bypasses canonical contracts and queries raw source tables directly.

---

## Architectural Rules (Normative)

1. Products must not read raw ingestion tables.
2. Products must read from canonical entity state or product APIs.
3. Signals must not be interpreted inside UI code.
4. Interpretation logic belongs in TRACES services.
5. Fields is the system of record for signals and identity.
