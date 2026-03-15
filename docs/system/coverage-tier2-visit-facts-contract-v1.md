---
doc_id: SYS-COVERAGE-TIER2-VISIT-FACTS-CONTRACT-V1
doc_type: system
status: active
owner: Bobby Ciccaglione
created: '2026-03-14'
last_updated: '2026-03-14'
project_id: SAIKO
systems:
  - coverage-pipeline
  - fields-v2
  - admin
related_docs:
  - docs/FIELDS_V2_TARGET_ARCHITECTURE.md
  - docs/architecture/entity-classification-layers-v1.md
summary: Canonical contract for Coverage Tier 2 Visit Facts in the current coverage-run pipeline.
category: engineering
tags: [coverage, fields-v2, pipeline]
source: repo
---

# Coverage Tier 2 Visit Facts Contract (v1)

## Purpose

Define the current Tier 2 Visit Facts issue contract used by the repository's
active coverage pipeline and admin/public coverage surfaces.

This document intentionally targets current main structure:

- detection: `scripts/coverage-run.ts`
- UI summary: `app/coverage/CoverageContent.tsx` and `app/admin/coverage/page.tsx`
- operational status: `place_coverage_status`

## Tier 2 issue types

- `missing_hours`
- `missing_price_level`
- `missing_menu_link`
- `missing_reservations`
- `operating_status_unknown`
- `google_says_closed`

## Canonical-first read precedence

Where both layers exist, Tier 2 checks resolve values in this order:

1. `canonical_entity_state`
2. fallback to `entities` (field-specific)

Field rules:

- hours: `canonical_entity_state.hours_json` -> `entities.hours`
- price: `canonical_entity_state.price_level` -> `entities.priceLevel`
- reservation: `canonical_entity_state.reservation_url` -> `entities.reservationUrl`
- menu: `canonical_entity_state.menu_url` (canonical check)
- operating status: `entities.businessStatus` with `entities.googlePlaceId` gate

## Applicability gates

Tier 2 issue checks are scoped by `entities.primary_vertical` for issue types
that are not universally applicable:

- price-level checks only for price-meaningful verticals
- menu checks only for menu-likely verticals
- reservation checks only for reservation-likely verticals

`operating_status_unknown` is emitted only when `googlePlaceId` exists.

## Workflow mapping (current main)

- `missing_hours` -> `coverage:apply` (Google details hours)
- `missing_price_level` -> `coverage:apply` (Google attrs/details)
- `missing_menu_link` -> `scan-merchant-surfaces` + canonical-state refresh
- `missing_reservations` -> `scan-merchant-surfaces` + canonical-state refresh
- `operating_status_unknown` -> `coverage:apply` (business status refresh)
- `google_says_closed` -> manual verification + `place:close` when confirmed

## Backward compatibility rule

The existing coverage candidate contract (`missing_groups`) is preserved for
`coverage:queue` and `coverage:apply*` flows. Tier 2 issue detection is additive
and must not break existing apply-script behavior.
