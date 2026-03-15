---
doc_id: SAIKO-PLACE-IDENTITY-SYSTEM-OVERVIEW
doc_type: overview
status: active
owner: Bobby Ciccaglione
created: '2026-03-14'
last_updated: '2026-03-14'
project_id: SAIKO
systems:
  - identity
  - entities
related_docs:
  - docs/architecture/identity-scoring-v1.md
  - docs/PLACE_IDENTITY_CODEBASE_AUDIT_2026-03-14.md
summary: >-
  Conceptual overview of the Place Identity System — how Saiko resolves
  incoming signals from multiple sources into stable canonical entity records.
category: product
tags: [identity, places]
source: repo
---

# Saiko — Place Identity System

Feature Overview (Draft v0, implementation-aligned)

## Purpose

The Place Identity System is the Saiko subsystem responsible for maintaining a canonical identity for each real-world place.

It resolves incoming signals from multiple sources into a stable entity record that can accumulate information over time without fragmenting.

This system ensures:
- each real-world place maps to one canonical entity
- multiple source signals can attach to that entity
- ongoing ingestion and enrichment can happen without duplicating identity

The outcome is a stable cultural place dataset that powers search, exploration, and map curation.

## Conceptual Model

At a conceptual level, Saiko operates as a place graph:

external signals
(Google, websites, Instagram, editorial inputs)
        ↓
identity resolution
        ↓
canonical place identity
        ↓
attached signals and derived interpretations
(menu, wine, scene, editorial, coverage)

The canonical identity is the anchor for all place information.

### Lifecycle Diagram (mental model)

```text
source ingestion
     ↓
intake + candidate signals
     ↓
identity resolution
     ↓
entities (canonical identity)
     ↓
sanctioned state + derived signals
     ↓
place page/search/map surfaces
```

## Why This System Exists

Without identity governance, place datasets degrade into:
- duplicate entries for the same venue
- fragmented signals split across records
- inconsistent names/coordinates and weak external linkage
- weak temporal continuity when places change

The Place Identity System addresses this with:
- deterministic identity matching heuristics
- canonical entity records
- structured enrichment and review workflows

## What This Enables

Canonical place identity enables:

### Search
Find places by stable identity attributes and attached signals (cuisine, neighborhood, scene, offering).

### Exploration
Discover places through editorial and cultural signal layers that are attached to canonical entities.

### Map Building
Curate collections of entities on maps/lists without identity duplication.

## Conceptual Components

### 1) Signal Ingestion
Signals enter from Google, websites, social, and editorial inputs.

In implementation today, ingestion primarily enters through admin intake and enrichment routes, with additional pipeline scripts.

### 2) Identity Resolution
Incoming candidates are matched to existing entities or created as new entities.

Current resolver behavior is heuristic and source-aware:
- exact anchor checks first (Google Place ID, website domain, Instagram handle, slug)
- fuzzy name matching where needed
- coordinate-aware candidate matching in GPID queue seeding
- ambiguous/no-match outcomes routed to human queue

### 3) Canonical Place Object
Today, the canonical app-facing place identity is the `entities` record (stable `id` + unique `slug`).

Fields v2 introduces `canonical_entity_state` as the sanctioned data layer for current truth, while `entities` remains the routing/identity shell.

### 4) Enrichment Pipeline
Once an entity exists, enrichment adds additional evidence and derived outputs:
- website and surface scans
- menu and wine extraction
- social account discovery
- derived signals and interpretation outputs

### 5) Lifecycle Tracking
Lifecycle is tracked primarily via `entities.status` and Google business status fields.

The model supports operational closure states, but does not yet maintain a dedicated first-class closure history ledger for entity lifecycle transitions.

## Comparison to Other Systems

### Instagram
Crowdsourced posting behavior accumulates around location pages.

### Google Maps
Machine + crowd signals attach to a Google place identifier.

### Saiko
Structured and curated signals resolve into canonical entities, with explicit review and enrichment workflows.

Saiko optimizes for identity integrity and cultural signal quality, not popularity alone.

## Relationship to Saiko Products

The Place Identity System powers:
- `Saiko Maps` (consumer place and map experience)
- `Saiko LA` (curated cultural layer)
- internal data operations (ingestion, enrichment, and review queues)

## Current Implementation Notes (Important)

- Public place pages are currently served from `entities` (`/api/places/[slug]` reads `db.entities` directly).
- Fields v2 tables (`observed_claims`, `canonical_entity_state`, `derived_signals`, `interpretation_cache`) exist in schema and are used by parts of the system, but cutover is still transitional.
- Legacy naming/docs still appear in parts of the repo (`places`, `golden_records` references), so implementation truth must be verified against active route and schema paths before architectural decisions.
