---
doc_id: ENTITY-SHELL-MIGRATION-V1
title: "Entities as Routing Shell — Migration Summary"
status: draft
owner: bobby
created: 2026-03-15
related: [FIELDS_V2_TARGET_ARCHITECTURE, enrichment-strategy-v1]
---

# Entities as Routing Shell — The Problem & How We're Solving It

## The Problem

`entities` was designed to be a **thin routing shell** — just identity anchors and routing keys. But in practice, enrichment scripts and dashboard queries treat it as the main data store. Everything reads from and writes to `entities`, which:

1. **Violates the architecture** — Fields v2 defines a four-layer model. `entities` should only hold routing fields (slug, status, entity_type, primary_vertical). Factual data belongs in `canonical_entity_state`.
2. **Makes enrichment brittle** — All enrichment writes land on one bloated table instead of purpose-built layers.
3. **Blocks the dashboard** — Coverage queries check `entities` fields, miss data that's already in `canonical_entity_state`, and scope to "published lists" (which don't exist yet).
4. **Creates drift** — Two copies of truth emerge (entities.hours vs canonical_entity_state.hours_json) with no clear winner.

## The Layers

### Evidence vs Canonical
Not all discovered data should immediately become canonical state. Saiko distinguishes:

**Evidence** — raw observations from enrichment pipelines, stored with provenance. Multiple sources may disagree.
- `observed_claims` — structured field-level claims ("hours are X" from source Y)
- `merchant_signals` — extracted signals from surfaces
- `merchant_surface_scans` — crawled page snapshots
- `menu_fetches` — menu content snapshots

**Canonical state** — the currently accepted truth, promoted from evidence through sanctioning.
- `canonical_entity_state` — factual data used by product
- `interpretation_cache` — AI-generated outputs used by product

Promotion from evidence → canonical happens through `write-claim.ts` and sanctioning workflows.

### Full Layer Map

| Layer | Table | Purpose | Example fields |
|-------|-------|---------|----------------|
| **Routing shell** | `entities` | Identity + routing only | slug, status, primary_vertical, entity_type, created_at |
| **Evidence** | `observed_claims`, `merchant_signals`, `merchant_surface_scans`, `menu_fetches` | Raw observations with provenance | hours from Google, hours from website, cuisine from Eater |
| **Editorial** | `coverage_sources` | Source links + accolades | article URLs, awards, provenance |
| **Canonical state** | `canonical_entity_state` | Sanctioned factual data | name, address, hours, phone, website, instagram, cuisine, latLng, price_level |
| **Interpretation** | `interpretation_cache` | Sanctioned AI outputs | tagline, pull quotes, vibe descriptions |
| **Coverage ops** | `place_coverage_status` | Enrichment tracking | last_enriched_at, needs_human_review |

## What's Wrong Today

### Writes go to the wrong place
- `coverage-apply.ts` writes hours, photos, google_places_attributes directly to `entities`
- ERA pipeline stages write mixed data to `entities`
- Should write to **evidence** first (`observed_claims`), then promote to `canonical_entity_state`
- Skipping evidence means no provenance, no conflict detection, no multi-source comparison

### Reads come from the wrong place
- Dashboard SQL queries check `entities.hours`, `entities.phone`, etc.
- API route (`/api/places/[slug]`) reads from `entities` directly
- Should read from `canonical_entity_state`, falling back to `entities` during migration

### Dashboard is scoped wrong
- All views filter to "Reachable" (on published list) — which is 0 entities
- Should default to all entities / addressable, with filters for status

## How We're Solving It

### Principle: Pragmatic migration, not big bang
Don't rip fields off `entities` yet. Fix the flow direction first.

### Step 1: Fix writes (stop making it worse)
- Update `coverage-apply.ts` to write evidence (`observed_claims`) instead of `entities`
- Add sanctioning step: promote evidence to `canonical_entity_state`
- New enrichment tools (editorial, social API, video) write to evidence from day one
- Existing ERA pipeline stages get updated incrementally

### Step 2: Fix reads (start reading from the right place)
- Dashboard queries join `canonical_entity_state` for field completeness checks
- API routes read `canonical_entity_state` as primary, `entities` as fallback
- Enrichment score measures `canonical_entity_state` completeness

### Step 3: Fix dashboard scope
- Default to all entities, not just "Reachable"
- Add status filters (ALL / OPEN / CANDIDATE)
- Surface all enrichment tools, not just Google API

### Step 4: Slim `entities` (later, when ready)
- Deferred migration `20260306200000_slim_entities_fields_v2` already exists
- Run it once reads/writes are fully migrated and verified
- Old data on `entities` stays as fallback until confident

## What This Unblocks

1. **Dashboard becomes useful** — shows real field completeness across all 522 entities
2. **Enrichment strategy works** — each tool writes to the right layer, scoring reflects reality
3. **New sources plug in cleanly** — editorial, social APIs, video all write to correct tables
4. **Publication gating** — enrichment score based on `canonical_entity_state` determines when an entity is ready to publish
