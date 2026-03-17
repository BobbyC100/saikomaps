---
doc_id: SKAI-DOC-FIELDS-GLOSSARY-001
doc_type: architecture
title: Saiko Architecture Glossary
status: active
owner: Bobby Ciccaglione
created: 2026-03-16
last_updated: 2026-03-16
project_id: SAIKO
summary: Canonical glossary of core Fields and TRACES architecture terms for shared system language.
systems:
  - fields-data-layer
  - traces
  - knowledge-system
related_docs:
  - docs/architecture/fields-system-map-v1.md
  - docs/architecture/place-identity-concept-v1.md
  - docs/architecture/identity-resolver-spec-v1.md
  - docs/scenesense/glossary-v1.md
---

# Saiko Architecture Glossary

**Document ID:** SKAI-DOC-FIELDS-GLOSSARY-001  
**Layer:** Architecture  
**Status:** Active

---

## Atomic Signal

The smallest observable piece of structured information captured about a place.

Examples:

- `reservable = true`
- `natural_wine = true`

Atomic signals are non-interpretive.

---

## Derived Signal

A computed signal generated from atomic signals.

Examples:

- dinner score
- scene energy

Derived signals remain structured data.

---

## Identity Signal

A signal that helps determine whether two observations refer to the same place.

Examples:

- name
- coordinates
- address

---

## Identity Anchor

A high-confidence identity signal.

Examples:

- GPID
- Instagram handle
- website domain

---

## Identity Resolution

The process that groups signals into canonical entities.

---

## Canonical Entity

The system's resolved representation of a real-world place.

Also known as Place Identity.

---

## Canonical State

The authoritative version of entity data used by downstream systems.

---

## Source Evidence

Raw signals captured from external systems.

Examples:

- Google Places
- social platforms

---

## Sanction

A canonical decision applied to signals or entity state.

---

## Cultural Interpretation

Human-readable meaning derived from structured signals.

Produced by TRACES.

---

## Product API

The stable interface through which consumer systems access Fields data.
