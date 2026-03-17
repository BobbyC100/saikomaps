---
doc_id: SKAI-DOC-FIELDS-IDENTITY-RESOLVER-001
doc_type: architecture
title: Identity Resolver Specification
status: draft
owner: Bobby Ciccaglione
created: 2026-03-16
last_updated: 2026-03-16
project_id: SAIKO
summary: Resolver inputs, anchors, active matching logic, and future threshold model for entity identity resolution.
systems:
  - entity-resolution
  - fields-data-layer
related_docs:
  - docs/architecture/place-identity-concept-v1.md
  - docs/architecture/identity-scoring-v1.md
  - docs/architecture/fields-ingestion-pipeline-v1.md
  - SKAI-DOC-FIELDS-ATOMIC-SIGNALS-001
---

# Identity Resolver Specification

**Document ID:** SKAI-DOC-FIELDS-IDENTITY-RESOLVER-001  
**Layer:** Data Architecture  
**Status:** Draft  
**Owner:** Saiko

---

## Purpose

This document defines how the system determines whether multiple signals refer to the same real-world place.

Identity resolution groups signals into entities.

---

## Resolver Inputs

Identity resolution evaluates signals such as:

- Google Place ID
- Instagram handle
- website domain
- name
- address
- coordinates
- source descriptions

---

## Identity Anchors

Certain signals function as high-confidence anchors.

Current anchors:

| Anchor | Reason |
|---|---|
| GPID | stable external identifier |
| Instagram | globally unique handle |
| Website domain | brand identity |

Anchors increase confidence but are not identity authorities.

---

## Resolution Signals

The resolver evaluates:

- name similarity
- coordinate proximity
- anchor matches
- address similarity
- domain matches
- social handle matches

---

## Current Active Logic (Implementation)

Current code primarily uses:

- Jaro-Winkler similarity >= 0.85
- Nearby radius ~= 200m

Rule-based sufficiency is used rather than strict numeric scoring.

---

## Proposed Future Model

Future resolver architecture may use confidence tiers.

- >=90% auto-link
- 70-89% review queue
- <70% new entity

These thresholds are not currently implemented in runtime code.

---

## Conflict Handling

Conflicts trigger manual review.

Examples:

- same Instagram handle but different GPID
- same address but different operator
- high name similarity but distant coordinates

---

## Re-evaluation Triggers

Entities may be re-evaluated when:

- new anchors appear
- location changes
- conflicting signals appear
- manual review is triggered

---

## Edge Cases

### Ghost Kitchens

Multiple entities may share coordinates but represent separate brands.

### Pop-ups

Entities may exist with only social signals.

### Brand Evolution

Entities may persist across name changes.

---

## Resolver Output

The resolver produces:

- entity match decision
- confidence level
- review queue trigger (optional)
