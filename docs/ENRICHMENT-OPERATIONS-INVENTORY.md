---
doc_id: FIELDS-ENRICHMENT-OPS-INVENTORY-V1
doc_type: reference
status: active
owner: Bobby Ciccaglione
created: 2026-03-13
last_updated: 2026-03-13
project_id: FIELDS
systems:
  - fields-data-layer
  - data-pipeline
  - admin
related_docs:
  - docs/COVERAGE-DASHBOARD-DESIGN-PRINCIPLES.md
  - docs/ENTITY-PROFILE-SPEC.md
  - docs/architecture/fields-era-overview-v1.md
summary: Canonical inventory of all enrichment operations available on an entity record — automated (Google Places, neighborhood lookup), semi-automated (GPID, Instagram, Photos), and human-only (editorial fields). Coverage Dashboard and Entity Profile are designed from this inventory outward.
---

# Enrichment Operations Inventory

## Purpose
This document defines the canonical set of operations the system can perform on an entity record. The Coverage Dashboard and Entity Profile page are designed from this inventory outward — not from missing fields inward.

## Automated Operations (system does it, no human required)

Google Places Enrichment
- Requires: google_place_id
- Fills: address, latitude, longitude, neighborhood, phone, hours, website
- How to trigger: enrichment script via admin UI button or CLI
- Notes: single run resolves majority of missing-field problems for records with GPID

Neighborhood Reverse Lookup
- Requires: latitude + longitude
- Fills: neighborhood
- Notes: subset of Google Places enrichment, can run independently if coords exist

## Semi-Automated (system proposes, human confirms)

GPID Matching
- System finds Google Place candidate for an entity
- Human approves or rejects the match
- Tool: /admin/gpid-queue

Instagram Handle Finder
- AI-assisted lookup based on place name and location
- Human confirms before saving
- Tool: /admin/instagram

Photo Fetch and Eval
- System pulls available Google photos for the entity
- Human tags and approves by tier (Default vs Editorial)
- Tool: /admin/photo-eval

## Human Only

Editorial fields:
- description
- TimeFOLD Foreground signal (tagline)
- Any subjective classification

Manual field entry:
- Any field the system cannot find (no GPID, no coords, no discoverable web presence)

## Key principle
Always run automated operations first. Human work is reserved for what the system genuinely cannot resolve. Before surfacing a problem to a human, check whether an automated operation could resolve it given the data already on the record.

## Derivability rules (as of March 2026)
- Has GPID → can auto-fill address, coords, neighborhood, phone, hours, website
- Has coords but no neighborhood → can reverse lookup neighborhood
- Has no GPID and no coords → needs human to resolve GPID first, then enrich
- Missing Instagram → semi-automated finder, human confirms
- Missing description → human only
- Missing TimeFOLD signal → human only, after factual fields are complete
