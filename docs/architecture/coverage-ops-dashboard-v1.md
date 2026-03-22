---
doc_id: ARCH-COVERAGE-OPS-DASHBOARD-V1
doc_type: architecture
status: superseded
owner: Bobby Ciccaglione
created: '2026-03-15'
last_updated: '2026-03-15'
project_id: SAIKO
systems:
  - coverage-operations
  - admin-tools
related_docs:
  - docs/architecture/enrichment-strategy-v1.md
  - docs/system/coverage-tier2-visit-facts-contract-v1.md
category: engineering
tags: [coverage, dashboard, admin, enrichment]
source: repo
summary: >-
  4-tab coverage operations dashboard spec — Overview, Tier Health,
  Enrichment Tools, Neighborhoods. Replaces prior 6-tab layout.
---

# Coverage Ops Dashboard v1

> **SUPERSEDED** — This spec is replaced by [Coverage Dashboard v2](coverage-dashboard-v2-spec.md) (ARCH-COVERAGE-DASHBOARD-V2). Retained for historical reference only.

## Purpose

Operator dashboard for data quality triage and enrichment pipeline management. Located at `/admin/coverage`, server-rendered from raw SQL. Scoped to all non-permanently-closed entities.

Replaces the prior 6-tab layout (Overview, Missing Fields, Neighborhoods, Red Flags, Field Breakdown, Tier 2 Visit Facts) with a consolidated 4-tab structure.

## Route

```
/admin/coverage?view=overview|tiers|pipeline|neighborhoods
```

Default view: `overview`.

## Tab Structure

| Tab | Param | Purpose |
|-----|-------|---------|
| Overview | `overview` | High-level counts, tier progress, enrichment funnel |
| Tier Health | `tiers` | Per-tier field completeness + ERA pipeline progress |
| Enrichment Tools | `pipeline` | Tool inventory + recent enrichment runs |
| Neighborhoods | `neighborhoods` | Scorecard grid by neighborhood |

## Overview Tab

### Summary Cards (row of 5)
- Total entities
- OPEN entities
- CANDIDATE entities
- Entities with GPID
- Distinct neighborhoods

### Tier Completion Bars
Three horizontal bars showing completion percentage:
- **Tier 1 Identity** — slug, name, latitude, google_place_id all non-null
- **Tier 2 Operational** — hours, phone, website, price_level, menu_url, reservation_url all non-null
- **Tier 3 Enrichment** — instagram, neighborhood, description all non-null

### Enrichment Funnel
Four-stage horizontal funnel:
```
Never Enriched → In Progress → Fully Enriched → Published
```
- Never Enriched: `enrichment_stage IS NULL`
- In Progress: `enrichment_stage` between 1-6
- Fully Enriched: `enrichment_stage = '7'`
- Published: `status = 'OPEN'`

## Tier Health Tab

### Summary Strip
Three cards at top showing all tiers at a glance — tier name, completion count, percentage, color-coded progress bar.

### ERA Pipeline Progress
Histogram showing entity count at each enrichment stage (NULL through 7). Gives operators a quick read on where entities are in the pipeline.

### Per-Tier Field Breakdowns
Three sections, one per tier. Each shows a table of fields with has/missing/total/coverage%.

**Tier 1 — Identity**
| Field | Description |
|-------|-------------|
| slug | URL-safe identifier |
| name | Display name |
| latitude | Geographic coordinate |
| google_place_id | GPID anchor |

**Tier 2 — Operational**
| Field | Description |
|-------|-------------|
| hours | Operating hours JSON |
| phone | Phone number |
| website | Primary website URL |
| price_level | Price tier (1-4) |
| menu_url | Menu link |
| reservation_url | Reservation link |

**Tier 3 — Enrichment**
| Field | Description |
|-------|-------------|
| instagram | Instagram handle |
| neighborhood | Neighborhood assignment |
| description | Entity description |

Tier 1 includes an expandable drill-down showing individual entities with identity issues.

## Enrichment Tools Tab

### Tool Inventory
Static table of all available enrichment tools. Each row shows: name, command (with copy-to-clipboard button), cost tier, and fields affected.

| Tool | Cost | Provider | Fields |
|------|------|----------|--------|
| Social discovery | Free | OpenAI GPT-4.1-mini | instagram, tiktok, website |
| Website fetch + parse | Free | — | menu, reservation, hours, phone |
| Populate canonical | Free | — | Evidence to canonical promotion |
| Website enrichment | Free | — | Website-derived fields |
| Menu URL sync | Free | — | menu_url |
| ERA pipeline (full) | Anthropic $ | Anthropic | All stages (identity signals, taglines) |
| Coverage apply (Google) | Google $$ | Google Places API | hours, phone, latlng, photos, price_level |

Commands use `node -r ./scripts/load-env.js ./node_modules/.bin/tsx` to load both `.env` and `.env.local`.

### Recent Enrichment Runs
Last 10 runs from `place_coverage_status`, showing entity name, slug, status, last attempt time, source, and missing field groups.

## Neighborhoods Tab

Scorecard grid by neighborhood. Each card shows entity count and field coverage stats for that neighborhood. Unchanged from prior dashboard version.

## Data Sources

### SQL Queries (`lib/admin/coverage/sql.ts`)
| Query | Used by |
|-------|---------|
| `OVERVIEW_COUNTS_SQL` | Overview cards |
| `TIER_COMPLETION_SQL` | Overview bars + Tier Health strip |
| `ENRICHMENT_STAGE_SQL` | Overview funnel + Tier Health histogram |
| `RECENT_RUNS_SQL` | Enrichment Tools recent runs |
| `TIER_FIELD_STATS_SQL` | Tier Health field breakdowns |
| `TIER1_ISSUES_SQL` | Tier Health Tier 1 drill-down |
| `ALL_NEIGHBORHOOD_SCORECARD_SQL` | Neighborhoods tab |

### Types (`lib/admin/coverage/types.ts`)
- `OverviewCounts` — summary card data
- `TierCompletion` — tier completion counts
- `EnrichmentStage` — stage distribution
- `RecentRun` — enrichment run record
- `TierFieldStat` — per-field has/missing/total
- `Tier1Issue` — entity with identity issues
- `NeighborhoodScorecard` — neighborhood stats

## Implementation Files

| File | Role |
|------|------|
| `app/admin/coverage/page.tsx` | Page component, view routing, all view renderers |
| `lib/admin/coverage/sql.ts` | Raw SQL queries |
| `lib/admin/coverage/types.ts` | TypeScript interfaces for query results |
| `lib/admin/coverage/run.ts` | `runOne` / `runMany` query helpers |
| `app/admin/coverage/components/ActionButtons.tsx` | `CopyCommandButton`, `RedFlagActions` client components |
