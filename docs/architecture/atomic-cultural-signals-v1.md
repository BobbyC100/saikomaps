---
doc_id: SKAI-DOC-FIELDS-ATOMIC-SIGNALS-001
doc_type: architecture
title: Atomic Cultural Signals
status: active
owner: Bobby
created: 2026-03-16
last_updated: 2026-03-16
project_id: saiko-fields
systems:
  - Fields
  - TRACES
summary: Defines the atomic cultural signal model used to structure place data in Saiko Fields.
related_docs:
  - SKAI-DOC-FIELDS-SYSTEM-MAP-001
  - SKAI-DOC-FIELDS-IDENTITY-RESOLVER-001
  - SKAI-DOC-FIELDS-GLOSSARY-001
  - place-identity-concept-v1.md
---

# Atomic Cultural Signals

**Document ID:** SKAI-DOC-FIELDS-ATOMIC-SIGNALS-001  
**System:** Fields / TRACES  
**Layer:** Architecture  
**Status:** Active  
**Owner:** Bobby

---

## Purpose

This document defines the Atomic Cultural Signal model used by Saiko Fields.

Atomic Cultural Signals are the smallest structured observations about a place.
They are the foundation of identity resolution, enrichment, and downstream interpretation.

---

## System Position

Core architecture flow:

Real world observations  
-> Atomic Cultural Signals (Fields)  
-> Identity Resolution (Fields)  
-> Canonical Entity (Fields)  
-> Derived Signals (Fields)  
-> Cultural Interpretation (TRACES)

Atomic signals sit between source observations and identity resolution.

---

## What Atomic Signals Are

Atomic signals are:

- **observable** - grounded in evidence
- **structured** - represented in typed fields
- **sourceable** - attributable to a source
- **durable** - retained as data truth
- **non-interpretive** - they describe what is observed, not what it means

Examples:

- `primary_vertical = EAT`
- `neighborhood = Silver Lake`
- `reservable = true`
- `cuisine = Taiwanese`
- `natural_wine = true`

---

## Structural Properties

Atomic signals are designed to be:

- composable across many sources
- independently verifiable
- stable under ingestion reruns
- suitable for identity matching and confidence scoring

Atomic signals are not narrative output and are not ranking artifacts.

---

## Atomic vs Derived vs Interpretation

### Atomic Signals (Fields)

Atomic signals are raw structured observations.

### Derived Signals (Fields)

Derived signals are computed from atomic signals and canonical entity state.
They remain structured data.

Examples:

- confidence levels
- completeness flags
- feature scores

### Cultural Interpretation (TRACES)

Interpretation is human-readable cultural meaning generated from structured inputs.
It is downstream of both atomic and derived signals.

Examples:

- identity language
- scene summaries
- intent-oriented discovery framing

---

## Fields vs TRACES Responsibilities

| Concern | Owner |
|---|---|
| Source observation ingestion | Fields |
| Atomic signal definition and storage | Fields |
| Identity resolution | Fields |
| Canonical entity state | Fields |
| Derived signal computation | Fields |
| Cultural interpretation output | TRACES |

Fields structures and governs signals.  
TRACES interprets structured signals.

---

## Non-Goals

Atomic Cultural Signals are not:

- external platform truth authority
- direct user-facing narrative copy
- model interpretation output
- a replacement for canonical entity governance

---

## Summary

Atomic Cultural Signals are the durable, sourceable, non-interpretive data layer
that allows Saiko to move from observations to identity, then to interpretation.
