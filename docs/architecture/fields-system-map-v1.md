---
doc_id: SKAI-DOC-FIELDS-SYSTEM-MAP-001
doc_type: architecture
title: Fields System Map - Signals to Interpretation
status: active
owner: Bobby Ciccaglione
created: 2026-03-16
last_updated: 2026-03-16
project_id: SAIKO
summary: Top-level architecture map for Fields-to-TRACES flow from observations to cultural interpretation.
systems:
  - fields-data-layer
  - traces
related_docs:
  - docs/architecture/place-identity-concept-v1.md
  - docs/architecture/fields-ingestion-pipeline-v1.md
  - docs/architecture/identity-scoring-v1.md
  - SKAI-DOC-FIELDS-ATOMIC-SIGNALS-001
---

# SAIKO FIELDS

## System Map - Signals to Interpretation

**Document ID:** SKAI-DOC-FIELDS-SYSTEM-MAP-001  
**System:** Fields / TRACES  
**Layer:** Architecture  
**Status:** Active  
**Owner:** Saiko

---

## Purpose

This document defines the high-level system architecture for Saiko Fields and its relationship to TRACES.

It explains how the system moves from real-world observations to structured entities, derived understanding, and finally user-facing cultural interpretation.

This is the top-level mental model for the Saiko platform.

---

## Core System Flow

Real World  
-> Source Systems / Observations  
-> Atomic Cultural Signals  
-> Identity Resolution  
-> Canonical Entity  
-> Derived Signals  
-> Product API  
-> TRACES Interpretation  
-> User Experience

---

## Layer Definitions

### Real World

The real places, behaviors, offerings, and cultural conditions that exist outside the system.

Examples:

- a restaurant opening
- a wine bar changing operators
- a menu changing seasonally
- a neighborhood becoming popular for late dinners

### Source Systems / Observations

Inputs that provide evidence about the real world.

Examples:

- Google Places
- Instagram
- websites
- editorial submissions
- operator input
- ingestion feeds
- manual research

These are evidence sources, not truth authorities.

### Atomic Cultural Signals

Atomic signals are the smallest observable pieces of structured information captured about a place.

Examples:

- `primary_vertical = EAT`
- `reservable = true`
- `natural_wine = true`
- `neighborhood = Silver Lake`

Atomic signals are:

- observable
- structured
- sourceable
- durable
- non-interpretive

Fields stores and maintains atomic signals.

### Identity Resolution

Identity resolution determines whether signals refer to:

- an existing entity
- or a new entity

Evidence used in identity resolution includes:

- Google Place ID
- Instagram handle
- website
- name similarity
- coordinates
- address
- resolver rules

Identity is resolved from evidence agreement, not defined by any single platform.

### Canonical Entity

The canonical entity is the system's stable representation of a real-world place.

It is:

- the resolved identity record
- the anchor for enrichment
- the owner of canonical state
- the object consumed by downstream systems

This entity is commonly referred to as Place Identity.

### Derived Signals

Derived signals are computed features produced from atomic signals and canonical state.

Examples:

- dinner destination score
- scene energy
- date-night probability
- confidence levels
- completeness flags

Derived signals remain structured data, not narrative interpretation.

### Product API

The Product API provides stable, versioned access to Fields data.

Consumer systems should read through these APIs or canonical views.

Consumer systems should not read raw ingestion tables directly.

### TRACES Interpretation

TRACES transforms structured signals into human-readable cultural understanding.

Examples:

- identity language
- scene descriptions
- discovery logic
- intent matching
- cultural summaries

Fields structures knowledge.  
TRACES interprets it.

---

## Ownership Boundaries

| Concern | Owner |
|---|---|
| Source ingestion | Fields |
| Atomic signals | Fields |
| Identity resolution | Fields |
| Canonical entity | Fields |
| Derived signals | Fields |
| Product API | Fields |
| Cultural interpretation | TRACES |
| Interface language | TRACES |
| User experience | TRACES |

---

## Architectural Rules

1. Source systems do not define truth on their own.
2. Identity is resolved from evidence.
3. Fields stores signals and canonical state.
4. Derived signals occur downstream of identity.
5. TRACES interprets structured inputs.
6. Consumer products should not read raw source tables directly.
7. The data layer is a standalone system of record.

---

## Summary

Saiko transforms observations into structured cultural understanding.

Signals -> Resolver -> Entity -> Derived Signals -> Interpretation
