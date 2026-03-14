---
doc_id: SAIKO-ENTITY-PROFILE-SPEC-V1
doc_type: spec
status: active
owner: Bobby Ciccaglione
created: 2026-03-13
last_updated: 2026-03-13
project_id: SAIKO
systems:
  - admin
  - entity-profile
related_docs:
  - docs/ENRICHMENT-OPERATIONS-INVENTORY.md
  - docs/COVERAGE-DASHBOARD-DESIGN-PRINCIPLES.md
  - docs/architecture/entity-pipeline-overview-v1.md
summary: Spec for /admin/entity/[id] — the canonical single-entity admin view showing all field states with inline resolution actions and a TimeFOLD editorial slot.
---

# Entity Profile Page — Spec

## Route
/admin/entity/[id]

## Purpose
Canonical admin view for a single place record. One page that shows everything about an entity, the state of every field, and inline actions to resolve gaps.

Surgical workflow: fix one specific place fully. Queue pages (Instagram, GPID, Photo Eval) are the bulk workflow for the same actions.

## Two modes
Resolution mode — fix missing or low-confidence fields inline
Editorial mode — write the TimeFOLD Foreground signal once factual identity is solid

## Layout

Header strip (read-only, edit override button):
- name, slug, neighborhood, category, status badge, google_place_id, created_at

Field grid:
Each field card has one of three states:
- Populated — value + confidence score if available, green indicator
- Low confidence — value + score + Review action, yellow indicator
- Missing — empty state + inline resolution action, red indicator

Fields and resolution actions:
- google_place_id — trigger GPID lookup, approve match
- address / latitude / longitude — pull from Google Places API
- phone — pull from Google Places API
- website — inline input + save
- instagram — inline input + save
- hours_json — pull from Google Places API
- cuisine_type — inline select + save
- category — inline select + save
- description — inline textarea + save
- photos — trigger Google Photos fetch, tag and approve
- enrichment_tier — read-only badge from entity_enrichment_tiers view

TimeFOLD slot (below field grid):
- Label: Temporal Signal
- If populated: display read-only with Edit button
- If empty: single-line input, placeholder "e.g. Long-running neighborhood fixture."
- Save button → PATCH entities.tagline
- UI note: "One line. No dates. Write what this place means right now."

## Entry points into this page
- Coverage Dashboard Problem Records table — each row links here
- Instagram Backfill — each place row has View Entity link
- GPID Queue — each item links here
- Photo Eval — each place links here

## Constraints
- Do not use entities.enrichment_stage
- Do not use golden_records.data_completeness
- Server component for initial data load
- Client components for inline resolution actions
- All writes through existing API patterns, no raw SQL from client
