---
doc_id: SKAI-DOC-FIELDS-DERIVED-SIGNALS-ENGINE-001
doc_type: architecture
title: Derived Signals Engine
status: active
owner: Bobby
created: 2026-03-16
last_updated: 2026-03-16
project_id: saiko-fields
systems:
  - Fields
  - TRACES
summary: Defines how derived signals are computed, governed, versioned, and exposed within the Saiko Fields system.
related_docs:
  - SKAI-DOC-FIELDS-ATOMIC-SIGNALS-001
  - SKAI-DOC-FIELDS-SIGNALS-REGISTRY-001
  - SKAI-DOC-FIELDS-SYSTEM-MAP-001
  - SKAI-DOC-FIELDS-DATA-LAYER-CONTRACT-001
  - SKAI-DOC-FIELDS-GLOSSARY-001
---

# Derived Signals Engine

**Document ID:** SKAI-DOC-FIELDS-DERIVED-SIGNALS-ENGINE-001  
**System:** Fields / TRACES  
**Layer:** Architecture  
**Status:** Active  
**Owner:** Bobby

---

## Overview

The Derived Signals Engine defines how Saiko Fields computes structured derived outputs
from canonical data inputs.

This document specifies computation contracts, ownership boundaries, explainability
requirements, versioning expectations, and exposure rules for derived signals.

---

## What a Derived Signal Is

A derived signal is a computed output, not a raw observation.

Derived signals are produced by applying explicit derivation logic to one or more
trusted inputs.

Derived signals remain structured system data. They are not user-facing interpretation.

---

## Relationship to Atomic Signals

Atomic signals are source-grounded, non-interpretive observations.

Derived signals may consume atomic signals as core inputs and transform them into
higher-order structured outputs used for ranking, routing, decision support, or
interpretation inputs.

Atomic signals remain canonical observation truth; derived signals are computed layers
above that truth.

---

## Relationship to Canonical Entity State

Derived signals may use:

- atomic signals
- canonical entity state
- sanctioned canonical decisions

Canonical entity state provides resolved, sanctioned context that allows derivation
logic to run on consistent entity truth rather than raw or conflicting evidence.

---

## Computation Rules

1. Every derived signal must define explicit derivation logic.
2. Inputs must be contract-defined and traceable.
3. Output type must be deterministic and registry-defined.
4. Derivation logic must operate on canonicalized inputs, not uncontrolled raw ingestion reads.
5. Computation should be stable under reruns for the same input state and version.

---

## Ownership and Layer Boundaries

| Concern | Owner |
|---|---|
| Derived signal definition | Fields |
| Derived signal computation | Fields |
| Registry and governance for derived signals | Fields |
| Interpretation consumption of derived signals | TRACES |

Fields owns derived-signal truth contracts.
TRACES may consume derived signals for interpretation, but does not define raw derived-signal truth.

---

## Versioning Rules

Derived signals must be versionable when formulas materially change.

Material change examples:

- changed weighting model
- changed required inputs
- changed score normalization behavior
- changed classification thresholds

Version updates should preserve backward auditability and allow historical interpretation
to be traced to the derivation version used at compute time.

---

## Explainability Rules

Every derived signal must be explainable back to:

- input signals/state used
- derivation logic applied
- output produced

Explainability requirements:

1. Inputs are named and contract-defined.
2. Derivation logic is documented at a high level.
3. Output semantics are explicit.
4. Ownership is explicit.

---

## Exposure Rules

1. Derived signals are exposed as structured data through canonical data surfaces.
2. Consumer products should read derived signals through canonical entity state or product APIs.
3. Derived signals should not be transformed into interpretation inside UI code.
4. Interpretation logic remains a TRACES service concern.

---

## Example Derived Signals

### `scene_energy`

- `signal_id`: `scene_energy`
- `input_signals`: temporal activity indicators, social/activity-related atomic signals, canonical context fields
- `derivation_logic`: weighted aggregation of activity and context indicators into normalized energy score
- `output_type`: `numeric (0.0-1.0)`
- `owner_system`: `Fields`

### `date_night_probability`

- `signal_id`: `date_night_probability`
- `input_signals`: ambiance-related atomic signals, reservation posture, canonical category/context fields
- `derivation_logic`: model-based probability score from relevant romantic/occasion-oriented indicators
- `output_type`: `numeric (0.0-1.0)`
- `owner_system`: `Fields`

### `wine_program_strength`

- `signal_id`: `wine_program_strength`
- `input_signals`: beverage-related atomic signals, menu/wine list indicators, canonical offering context
- `derivation_logic`: weighted scoring of wine-focused indicators into strength band/score
- `output_type`: `numeric or enum (contract-defined)`
- `owner_system`: `Fields`

---

## Future Evolution

The Derived Signals Engine is expected to evolve with:

- stronger per-signal version metadata
- richer lineage capture between inputs and outputs
- expanded explainability artifacts for operator tooling
- tighter contract integration with Signals Registry governance

Future evolution must preserve the core contract:
derived signals are structured, explainable, versionable computations owned by Fields,
and consumed by TRACES for interpretation.
