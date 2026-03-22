---
doc_id: ARCH-ENTITY-MAINTENANCE-POLICY-V1
doc_type: architecture
status: active
title: "Entity Maintenance Policy v1"
owner: Bobby Ciccaglione
created: "2026-03-22"
last_updated: "2026-03-22"
project_id: SAIKO
systems:
  - fields-data-layer
  - enrichment
  - entity-model
related_docs:
  - docs/architecture/entity-state-model-v1.md
  - docs/architecture/enrichment-evidence-model-v1.md
  - docs/architecture/enrichment-strategy-v1.md
  - docs/architecture/coverage-source-enrichment-v1.md
  - docs/architecture/coverage-tiers-v1.md
  - docs/architecture/entity-lifecycle-and-closure-v1.md
summary: >
  Defines how Saiko maintains entity data across the full lifecycle — from
  soft-open through permanent closure. Establishes maintenance postures by
  operating status, re-enrichment cadences by source and status, and rules
  for when entities enter and exit active maintenance. Unifies the
  source-aware staleness tiers (enrichment-evidence-model-v1), link health
  cadences (coverage-source-enrichment-v1), and closure recheck rules
  (entity-state-model-v1) into a single policy.
---

# Entity Maintenance Policy v1

**SAIKO FIELDS · INTERNAL**

March 2026 · Draft

## Purpose

Saiko has strong docs covering how entities enter the system (enrichment strategy), how they're classified (dimension model), how their state is modeled (entity state model), and how individual sources age (staleness tiers). What's missing is a unified policy that answers: once an entity is enriched and published, how do we keep it current? And when do we stop?

This document defines maintenance postures by operating status, re-enrichment cadences, and the rules for transitioning between postures. It pulls together existing source-level staleness tiers, coverage link health cadences, and closure recheck rules into one place.

---

## Core Principle

> *Maintenance effort should be proportional to the entity's operating reality
> and its value on Saiko surfaces. Active businesses get active maintenance.
> Closed businesses get preservation, not enrichment.*

---

## 1. Maintenance Postures

Every entity operates under one of four maintenance postures, determined by its operating status. These are not stored fields — they're derived from `operatingStatus` and drive enrichment scheduling decisions.

### ACTIVE

**Applies to:** `OPERATING`, `SOFT_OPEN`

The entity is open for business. Saiko maintains data freshness across all sources on the standard re-enrichment cadence. This is the default posture for the vast majority of published entities.

What happens:
- All source-attribute pairs are re-checked on their standard cadence (see Section 2)
- Coverage source discovery runs periodically for new editorial mentions
- Link health monitoring applies to existing coverage sources
- SceneSense and interpretation cache outputs are refreshed when upstream evidence changes
- Dimension values are re-evaluated if enrichment evidence changes materially

### MONITORING

**Applies to:** `TEMPORARILY_CLOSED`

The entity is not operating but is expected to return. Saiko reduces maintenance frequency but keeps checking for reopening signals. The entity record may remain published with appropriate status messaging.

What happens:
- Business status re-check escalates to every 2 weeks (up from monthly)
- Website and social checks continue on standard cadence (looking for reopening announcements)
- All other source re-checks are paused — hours, offerings, and editorial coverage don't change while closed
- If 6 months pass with no reopening signal, flag for human review to assess whether status should move to PERMANENTLY_CLOSED
- Dimension values are frozen (no re-evaluation while monitoring)

### ARCHIVED

**Applies to:** `PERMANENTLY_CLOSED`

The entity has ceased operations. Saiko preserves the record for historical integrity, duplicate prevention, and temporal reference but performs no active enrichment.

What happens:
- All re-enrichment stops. No source re-checks of any kind.
- The entity record is retained in the database indefinitely
- Existing data is preserved as-is — no field values are cleared or modified
- Coverage sources and their archived content are preserved
- Interpretation cache entries remain but are not refreshed
- The entity is excluded from enrichment scheduler queries
- If evidence of reopening surfaces externally (e.g., via editorial intake or manual observation), the entity can be moved back to TEMPORARILY_CLOSED or OPERATING through the standard claims workflow

### PRE-ENRICHMENT

**Applies to:** `enrichmentStatus = INGESTED` (regardless of operating status)

The entity has been ingested but hasn't been through the enrichment pipeline yet. It's not in maintenance — it's in the intake queue.

What happens:
- Standard enrichment pipeline processing (per enrichment strategy v1)
- No maintenance cadence applies yet — the entity hasn't been enriched a first time
- Once the entity reaches `enrichmentStatus = ENRICHED`, it enters the maintenance posture matching its operating status

---

## 2. Re-Enrichment Cadence by Source

These cadences apply to entities in the ACTIVE posture. They extend the staleness tiers defined in the Enrichment Evidence Model (ARCH-ENRICHMENT-EVIDENCE-MODEL-V1) with operating-status-aware adjustments.

### ACTIVE Entities (OPERATING, SOFT_OPEN)

| Source | Attribute | Re-Check Cadence | Rationale |
|--------|-----------|-----------------|-----------|
| Google Places | Business status | Monthly | Closure detection — highest-priority signal |
| Google Places | Hours | Quarterly | Seasonal shifts, holiday hours |
| Google Places | GPID existence | 6 months | Stable; businesses rarely appear/disappear |
| Google Places | Photos | 6 months | Low churn for most venues |
| Website | Homepage / about | 2 months | Menu, hours, and description changes |
| Instagram | Handle existence | Monthly | Handles change, accounts deactivate |
| Instagram | Bio / content | 2 weeks | Operators update frequently, especially for pop-ups |
| Editorial | Coverage search | Quarterly | New articles appear over time |
| Coordinates | Lat/lng | Never (unless disputed) | Physical location doesn't move |
| Reservation | Provider match | Quarterly | Provider relationships change |
| Confirmed absence | Any attribute | 2x the positive cadence | Absence might become presence |

### MONITORING Entities (TEMPORARILY_CLOSED)

| Source | Attribute | Re-Check Cadence | Rationale |
|--------|-----------|-----------------|-----------|
| Google Places | Business status | Every 2 weeks | Looking for reopening signal |
| Website | Homepage | Monthly | Reopening announcements |
| Instagram | Bio / content | Monthly | Reopening announcements |
| All other sources | All attributes | Paused | No value in checking hours, offerings, etc. while closed |

### ARCHIVED Entities (PERMANENTLY_CLOSED)

All re-enrichment paused. No source checks. Record preserved as-is.

---

## 3. Coverage Source Maintenance

Coverage source maintenance follows the link health cadence defined in the Coverage Source Enrichment spec (ARCH-COVERAGE-SOURCE-ENRICHMENT-V1), scoped by maintenance posture.

### ACTIVE Entities

| Source Age | Health Check Frequency |
|-----------|----------------------|
| < 6 months | Monthly |
| 6–24 months | Quarterly |
| > 24 months | Bi-annually |

On health check:
- Verify URL is alive (HTTP status)
- Compare content hash — if changed, re-fetch and re-extract
- Update `is_alive` status
- Archived content is preserved regardless of link status

### MONITORING Entities

Link health checks pause. No coverage sources are changing for a closed business.

### ARCHIVED Entities

Link health checks stop permanently. Archived content and extraction data are preserved but never refreshed.

---

## 4. Interpretation Layer Maintenance

Interpretation cache outputs (tagline, voice descriptor, pull quote, TimeFOLD) and derived signals (identity signals, offering programs) are downstream of enrichment evidence. Their maintenance follows from evidence freshness, not independent schedules.

### Refresh Triggers

An interpretation cache entry should be regenerated when:

- Upstream enrichment evidence has changed since the cache entry was generated
- The prompt version or model version has been updated (batch re-generation)
- A human editorial override is made (immediate regeneration)

Interpretation outputs are NOT refreshed on a fixed schedule. They are refreshed when their inputs change.

### By Posture

- **ACTIVE:** Interpretation refreshes whenever upstream evidence changes per the re-enrichment cadence
- **MONITORING:** Interpretation is frozen. No upstream evidence is changing (except business status checks), so no regeneration needed
- **ARCHIVED:** Interpretation is frozen permanently. Cached outputs are preserved as historical artifacts

---

## 5. Posture Transitions

Transitions between maintenance postures follow from operating status changes, which are evidence-based per the entity state model.

### ACTIVE → MONITORING

Trigger: `operatingStatus` changes to `TEMPORARILY_CLOSED`

Effect:
- Re-enrichment cadence shifts to MONITORING schedule immediately
- Business status checks escalate to every 2 weeks
- A 6-month review timer starts — if no reopening signal by expiry, flag for human review

### MONITORING → ACTIVE

Trigger: `operatingStatus` changes back to `OPERATING`

Effect:
- Re-enrichment cadence returns to ACTIVE schedule
- A full re-enrichment pass is triggered (all sources, all attributes) to catch up on changes during closure
- Interpretation cache is regenerated from fresh evidence
- 6-month review timer is canceled

### MONITORING → ARCHIVED

Trigger: `operatingStatus` changes to `PERMANENTLY_CLOSED` (via human review, either proactively or at the 6-month review gate)

Effect:
- All re-enrichment stops
- Entity is excluded from enrichment scheduler
- Data is preserved as-is

### ARCHIVED → ACTIVE

Trigger: Evidence of reopening surfaces (editorial, field observation, social signal) → claim filed → human review confirms → `operatingStatus` changes to `OPERATING`

Effect:
- Full re-enrichment pass triggered
- Entity re-enters ACTIVE maintenance posture
- All source-attribute pairs treated as stale (immediate re-check across the board)
- Interpretation cache is regenerated

This should be rare but must be possible. Businesses do reopen under new ownership or after extended renovation.

### PRE-ENRICHMENT → ACTIVE / MONITORING / ARCHIVED

Trigger: Entity completes initial enrichment pass (`enrichmentStatus` moves to `ENRICHED`)

Effect: Entity enters the maintenance posture matching its current `operatingStatus`

---

## 6. Enrichment Scheduler Implications

The enrichment scheduler (not yet built) should use maintenance postures to prioritize work:

1. **PRE-ENRICHMENT entities first** — new intake should be enriched before existing entities are re-checked
2. **ACTIVE entities with stale evidence** — source-attribute pairs past their re-check cadence
3. **MONITORING entities** — only business status, website, and social checks
4. **ARCHIVED entities** — excluded from scheduling entirely

Within ACTIVE entities, prioritize by:
- Publication status (PUBLISHED before UNPUBLISHED)
- Staleness severity (most overdue first)
- Entity vertical (verticals with higher data churn — EAT, COFFEE — before stable verticals like CULTURE)

---

## 7. What This Policy Does Not Cover

- **Enrichment pipeline mechanics** — how enrichment actually runs. See enrichment strategy v1.
- **Evidence recording** — how claims and absences are stored. See enrichment evidence model v1.
- **Coverage source extraction** — how articles are fetched and extracted. See coverage source enrichment v1.
- **Identity scoring** — how identity confidence is calculated. See identity scoring v1.
- **Publication gating** — whether an entity should be published. See entity state model v1.
- **Dimension re-classification** — when and how dimension values change. Deferred to a future spec; this policy only notes that ACTIVE entities can have dimensions re-evaluated when evidence changes.

---

## 8. Relationship to Existing Docs

This document unifies maintenance-relevant rules from several existing docs:

| Source Doc | What It Defined | What This Doc Does With It |
|-----------|----------------|---------------------------|
| Enrichment Evidence Model v1 | Source-aware staleness tiers | Adopted as ACTIVE cadence, extended with posture-aware adjustments |
| Coverage Source Enrichment v1 | Link health check cadence by source age | Adopted for ACTIVE, paused for MONITORING/ARCHIVED |
| Entity State Model v1 | Operating status values and transitions | Used as the driver for maintenance posture assignment |
| Entity Lifecycle & Closure v1 | Monthly recheck for temp-closed; closure-as-claim | Formalized as MONITORING posture with 2-week escalated business status checks and 6-month review gate |

No existing doc is overridden. This is additive — it's the maintenance layer on top of the existing architecture.

---

*Saiko Fields · Entity Maintenance Policy v1 · Active 2026-03-22 · Approved by Bobby Ciccaglione*
