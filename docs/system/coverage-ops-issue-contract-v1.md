---
doc_id: SYS-COVERAGE-OPS-ISSUE-CONTRACT-V1
doc_type: system
status: active
owner: Bobby Ciccaglione
created: '2026-03-14'
last_updated: '2026-03-14'
project_id: SAIKO
systems:
  - coverage-operations
  - issue-scanner
  - admin
related_docs:
  - docs/architecture/coverage-ops-approach-v1.md
  - docs/architecture/coverage-tiers-v1.md
  - docs/architecture/entity-classification-layers-v1.md
summary: Canonical issue contract for Coverage Ops v1 — issue types, severity, gating, and UI action mappings.
---

# Coverage Ops Issue Contract (v1)

## Purpose

This document is the single source of truth for Coverage Ops issue semantics in v1.

It defines:
- issue type names
- severity and problem class
- gating/applicability rules
- action mappings used by Coverage Ops UI

Issue types remain field-level in v1 for deterministic operator actions.

---

## Read Precedence

Scanner checks canonical first, then entity fallback where applicable:

1. `canonical_entity_state`
2. `entities`

This applies to visit-fact checks like hours, price level, and reservation links.

---

## Tier 2 Visit Facts Contract

| issue_type | problem_class | severity | gating/applicability | detection summary | UI action |
|-----------|---------------|----------|----------------------|-------------------|----------|
| `missing_hours` | `location` | medium | all active entities | no `canonical_entity_state.hours_json` and no `entities.hours` fallback | Run Stage 1 |
| `missing_price_level` | `location` | low | food/drink verticals (`EAT`, `COFFEE`, `WINE`, `DRINKS`, `BAKERY`) | no `canonical_entity_state.price_level` and no `entities.priceLevel` fallback | Run Stage 1 |
| `missing_menu_link` | `location` | low | food/drink verticals (`EAT`, `COFFEE`, `WINE`, `DRINKS`, `BAKERY`) | no `canonical_entity_state.menu_url` | Run Stage 6 |
| `missing_reservations` | `location` | low | reservation-likely verticals (`EAT`, `DRINKS`, `WINE`, `STAY`) | no `canonical_entity_state.reservation_url` and no `entities.reservationUrl` fallback | Run Stage 6 |
| `operating_status_unknown` | `location` | medium | only when `entities.googlePlaceId` exists | `entities.businessStatus` missing/blank | Run Stage 1 |
| `google_says_closed` | `identity` | high | entity has Google status | Google reports closure inconsistent with current entity status | Mark Closed / Still Open |

---

## Baseline Tier 1/Identity Issue Contract (Current)

| issue_type | problem_class | severity | UI action |
|-----------|---------------|----------|----------|
| `unresolved_identity` | `identity` | critical | Find GPID / inline GPID entry |
| `missing_gpid` | `identity` | medium | Find GPID |
| `enrichment_incomplete` | `identity` | high | Enrich |
| `missing_coords` | `location` | high | Run Stage 1 |
| `missing_neighborhood` | `location` | medium | Derive |
| `missing_website` | `contact` | medium | Discover Web / inline website |
| `missing_phone` | `contact` | low | Run Stage 1 / inline phone |
| `missing_instagram` | `social` | low | Discover IG / inline handle |
| `missing_tiktok` | `social` | low | Discover TikTok / inline handle |
| `potential_duplicate` | `identity` | medium | Review / Merge |

`potential_duplicate` is generated via duplicate scan path and handled in Coverage Ops merge flow.

---

## Action Routing

Current action routes used by Coverage Ops:

- Stage 1/6 enrichment: `POST /api/admin/tools/enrich-stage`
- Neighborhood derivation: `POST /api/admin/tools/derive-neighborhood`
- Social/website discovery: `POST /api/admin/tools/discover-social`
- GPID find: `POST /api/admin/tools/seed-gpid-queue`
- Closure override/write: `PATCH /api/admin/entities/[id]/patch`
- Resolve/suppress issue state: `POST /api/admin/tools/scan-issues`

---

## Provenance (v1)

No schema changes are required for v1 provenance hints.

If needed in issue detail payloads, derive lightweight fields from existing data:
- `source_system`
- `source_url`
- `observed_at`
- `confidence`

Suggested source order:
1. sanctioned claim path (`canonical_sanctions` -> `observed_claims`)
2. evidence fallback (`merchant_surface_scans`, `menu_fetches`, `merchant_enrichment_runs`)
