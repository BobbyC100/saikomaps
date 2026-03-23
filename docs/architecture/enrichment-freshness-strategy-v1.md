---
doc_id: ARCH-ENRICHMENT-FRESHNESS-STRATEGY-V1
doc_type: architecture
status: active
title: "Enrichment Freshness Strategy v1"
owner: Bobby Ciccaglione
created: "2026-03-22"
last_updated: "2026-03-22"
project_id: SAIKO
systems:
  - fields-data-layer
  - enrichment
  - entity-model
related_docs:
  - docs/architecture/entity-maintenance-policy-v1.md
  - docs/architecture/enrichment-evidence-model-v1.md
  - docs/architecture/enrichment-strategy-v1.md
  - docs/architecture/coverage-source-enrichment-v1.md
  - docs/architecture/entity-state-model-v1.md
  - docs/architecture/enrichment-playbook-v1.md
summary: >
  Tactical companion to the Entity Maintenance Policy. Classifies every
  enrichment data point by stability class, sets conservative initial
  refresh cadences, and defines an observation framework that measures
  actual decay rates so cadences can be tightened or loosened with evidence
  over time. Built on top of the existing attribute_registry, observed_claims
  supersession chain, and source_registry infrastructure.
---

# Enrichment Freshness Strategy v1

**SAIKO FIELDS · INTERNAL**

March 2026 · Draft

## What This Document Is

The Entity Maintenance Policy defines four postures (ACTIVE, MONITORING, ARCHIVED, PRE-ENRICHMENT) and says "re-enrich on the standard cadence." This document defines what that cadence actually is, why, and how it improves over time.

It answers three questions:
1. Which data points change fast and which are basically permanent?
2. How often should we check each one — starting conservatively?
3. How do we learn actual decay rates so we're not guessing forever?

---

## 1. Stability Classes

Data points are not organized by source. A Google Places GPID and Google Places hours come from the same API but have completely different volatility. The right organizing principle is how often the underlying reality changes.

### Class 1 — Structural (near-permanent)

Data that changes only when the business fundamentally transforms — new ownership, relocation, concept change, or closure.

| Attribute | Why it's structural |
|-----------|-------------------|
| Name | Changes only on rebrand or ownership transfer |
| Address | Changes only if the business physically moves |
| Latitude / longitude | Derived from address; same stability |
| Google Place ID | Stable identifier; changes only on Google-side merges |
| Entity dimensions (location_type, schedule_type, etc.) | Structural classification; changes only on fundamental business model shift |
| Primary vertical | Changes only on concept change (restaurant becomes bar) |
| Category | Same as vertical — stable classification |
| Parent/child relationships | Structural containment; changes only when a business moves in or out of a host |

**Initial cadence:** Check annually. Or on explicit trigger (closure claim, ownership change signal, user report).

**Rationale:** Checking a restaurant's address monthly is waste. If it moved, we'll hear about it through closure signals, editorial coverage, or social monitoring long before a scheduled re-check.

### Class 2 — Seasonal (periodic shifts)

Data that shifts on a seasonal or quarterly rhythm — menus change, hours adjust, pricing updates.

| Attribute | Why it's seasonal |
|-----------|------------------|
| Hours | Shift seasonally, holiday hours, summer/winter adjustments |
| Price level | May adjust annually or with menu overhauls |
| Cuisine type / cuisine posture | Stable for months, but restaurants do evolve their identity |
| Offering programs (food, wine, cocktail, etc.) | Core programs are stable; signal-level details (new dishes, seasonal menus) shift quarterly |
| Offering signals (serves_beer, serves_wine, etc.) | Binary flags; very stable but not permanent |
| Service model | Changes rarely — maybe once a year if at all |
| Menu URL / wine list URL | URLs rotate seasonally for some restaurants |

**Initial cadence:** Check quarterly (every 90 days).

**Rationale:** A restaurant's hours in March aren't the same as June. But checking monthly is overkill — most restaurants update hours twice a year at most. Quarterly catches the seasonal shifts without over-polling.

### Class 3 — Dynamic (frequent updates)

Data that changes on a weekly-to-monthly basis. These are the fields where staleness has real user impact — showing wrong hours or a dead Instagram link.

| Attribute | Why it's dynamic |
|-----------|-----------------|
| Business status (operating/closed) | Can change any time; highest-impact signal |
| Website content (about page, menu page) | Restaurants update specials, events, seasonal menus |
| Instagram handle existence | Handles change, accounts deactivate |
| Instagram bio / content | Operators update frequently, especially pop-ups and new openings |
| Reservation URL / provider | Provider relationships change; booking links break |
| Events URL / catering URL | Event pages are inherently temporal |

**Initial cadence:** Check monthly.

**Rationale:** Monthly is the floor for anything that directly affects user experience. We're not trying to be real-time — we're trying to catch meaningful changes within a reasonable window. Monthly balances freshness against cost.

**Exception — Business status:** This is the one attribute where a month might be too slow. A restaurant that closed 3 weeks ago should not still show as open on Saiko. The maintenance policy already escalates this to every 2 weeks for MONITORING entities. For ACTIVE entities, monthly is acceptable because closure usually produces other signals (website goes down, social goes quiet) that surface through other channels.

### Class 4 — Accumulative (append-only)

Data that only grows — new records are added, existing records are not updated or invalidated by the passage of time.

| Attribute | Why it's accumulative |
|-----------|---------------------|
| Coverage sources (editorial articles) | New articles appear; old articles don't un-publish |
| Recognitions (awards, lists) | New awards are added; old ones are historical |
| Photos | New photos can be added; existing photos don't expire |
| Interpretation cache (tagline, voice descriptor) | Refreshed when inputs change, not on a clock |
| SceneSense outputs | Refreshed when upstream signals change |
| Derived signals (identity signals, offering programs) | Recomputed when evidence changes |

**Initial cadence:** Discovery pass quarterly. No re-checking of existing records.

**Rationale:** Editorial coverage search should run periodically to find new mentions. But we don't need to re-check whether last year's Eater article still says the same thing — that's what the coverage source link health system handles separately. New articles are discovered; existing articles are health-checked on the link health cadence.

### Class 5 — Confirmed Absence (negative evidence)

Fields where we checked and found nothing. Per the Enrichment Evidence Model, these are first-class signals.

| Attribute | Example |
|-----------|---------|
| GPID (confirmed no match) | Searched Google Places, no result |
| Instagram (confirmed no account) | Searched, no handle found |
| Website (confirmed no site) | Domain doesn't resolve |
| Reservation (confirmed no provider) | Checked Resy, OpenTable, etc. — not listed |

**Initial cadence:** Re-check at 2x the positive cadence for that attribute's stability class.

**Rationale:** A business that had no Instagram last quarter might have one now. But checking every month is aggressive — if they didn't have one 90 days ago, checking again in 180 days is reasonable. The 2x multiplier is conservative by design.

---

## 2. Cadence Summary (ACTIVE Posture)

Everything in one table, organized by stability class.

| Class | Attribute | Cadence | Annual Checks |
|-------|-----------|---------|---------------|
| Structural | Name, address, lat/lng, GPID, dimensions, vertical, category, containment | Annual | 1 |
| Seasonal | Hours, price level, cuisine posture, offering programs, service model, menu/winelist URLs | Quarterly | 4 |
| Dynamic | Business status, website content, Instagram, reservation URL, events/catering URLs | Monthly | 12 |
| Accumulative | Coverage discovery, new photos, new recognitions | Quarterly (discovery only) | 4 |
| Confirmed absence | Any attribute | 2x the positive class cadence | Varies |

For ~1,100 entities, this translates to roughly:
- 1,100 structural checks per year (annual pass)
- 4,400 seasonal checks per year (quarterly × 1,100)
- 13,200 dynamic checks per year (monthly × 1,100)
- 4,400 discovery passes per year (quarterly × 1,100)

Total: ~23,000 enrichment actions per year, or about 63 per day. This is deliberately conservative. If decay observation (Section 3) shows we're under-checking something, we can tighten.

### Cost Constraint

Per the enrichment playbook, a full enrichment pass costs roughly $6 per 1,000 entities (dominated by Google Places API calls). Maintenance re-checks are cheaper than initial enrichment because we're checking specific attributes, not running the full pipeline.

Estimated annual maintenance cost at these cadences: low. The constraint isn't budget — it's discipline. We don't want to build a system that hammers APIs for data that hasn't changed.

---

## 3. Decay Observation Framework

This is how we learn. Instead of assuming cadences are right, we measure what actually changes between checks and use that to calibrate.

### What We Already Have

The schema has the infrastructure for this:

- **`observed_claims`** with `supersedes_claim_id` chains — every time a source is re-checked, the new claim supersedes the old one. Comparing `raw_value` between the superseding and superseded claim tells us whether the value actually changed.
- **`attribute_registry`** with `decay_policy` (currently NONE for all attributes) — this is the field where observed decay rates can be stored and used to drive scheduling.
- **`source_registry`** with `trust_tier` — source reliability is already modeled.
- **`merchant_enrichment_runs`** — append-only audit trail of every enrichment attempt with timestamps.

### What We Need to Build

A lightweight observation query that, on each enrichment pass, answers:

> "For this entity + attribute + source, did the value change since the last observation?"

The answer is a single bit: **changed** or **stable**. Over time, aggregating these bits gives us:

- **Change rate per attribute:** "Hours changed on 8% of quarterly checks across all entities"
- **Change rate per attribute per vertical:** "Hours changed on 14% of checks for EAT but 2% for CULTURE"
- **Change rate per attribute per entity:** "This specific restaurant changes hours 3x more often than average"
- **Time-to-change distribution:** "When hours do change, the median time between changes is 147 days"

### Observation Table

This doesn't need a new table. The data lives in the supersession chain of `observed_claims`. The observation is computed, not stored:

```sql
-- For each attribute, count how often the value actually changed
-- between consecutive observations
SELECT
  oc.attribute_key,
  COUNT(*) AS total_rechecks,
  COUNT(*) FILTER (
    WHERE oc.normalized_value IS DISTINCT FROM prev.normalized_value
  ) AS value_changed,
  ROUND(
    COUNT(*) FILTER (
      WHERE oc.normalized_value IS DISTINCT FROM prev.normalized_value
    )::numeric / NULLIF(COUNT(*), 0), 3
  ) AS change_rate
FROM observed_claims oc
JOIN observed_claims prev ON oc.supersedes_claim_id = prev.claim_id
GROUP BY oc.attribute_key
ORDER BY change_rate DESC;
```

This query works today against existing data. As the claims table grows with re-enrichment passes, the change rates become more accurate.

### Calibration Rules

Once we have at least 2 full cadence cycles of observation data (e.g., 6 months of quarterly checks), we can start calibrating:

- **If change rate < 2%:** Consider loosening the cadence (quarterly → semi-annual, monthly → quarterly). The data isn't moving.
- **If change rate > 20%:** Consider tightening the cadence (quarterly → monthly). We're missing changes.
- **If change rate is 2–20%:** Current cadence is reasonable. Hold.

These thresholds are starting points. Bobby refines based on what the numbers actually show.

### Vertical-Specific Calibration

We expect verticals to have different decay profiles:

- **EAT** — Higher churn on hours, menus, offerings. Restaurants evolve.
- **COFFEE** — Moderate churn. Core offering is stable, hours shift.
- **DRINKS** — Hours are critical (late-night shifts). Offering churn moderate.
- **CULTURE** — Very stable. Museums don't change hours or offerings often.
- **SHOP** — Stable. Inventory changes but structural data doesn't.
- **PARKS** — Almost zero churn. Hours are seasonal at most.

The observation framework lets us confirm or reject these assumptions. If CULTURE entities actually churn more than expected, the data will show it.

### The Feedback Loop

```
Initial cadence (conservative)
    ↓
Re-enrichment passes run on cadence
    ↓
observed_claims supersession chain records what changed
    ↓
Periodic observation query computes change rates
    ↓
Calibration rules flag attributes that are over-checked or under-checked
    ↓
Human reviews flagged attributes and adjusts cadences
    ↓
Updated cadences flow back to enrichment scheduler
```

This loop runs quarterly. Not automated — Bobby reviews the observation data and makes cadence adjustments. Automation is a future consideration once the observation data has enough volume to be trustworthy.

---

## 4. Attribute Registry Integration

The `attribute_registry` table already has a `decay_policy` field (enum: NONE, TIME_BASED). This is where freshness strategy lives in the system.

### Proposed Extension

Add two columns to `attribute_registry` to make cadences queryable:

| Column | Type | Purpose |
|--------|------|---------|
| `refresh_cadence_days` | int, nullable | Standard re-check interval in days for ACTIVE entities |
| `observed_change_rate` | decimal(4,3), nullable | Last computed change rate from observation query |

The enrichment scheduler can then query:

```sql
-- Find stale attributes for active entities
SELECT e.id, ar.attribute_key, ar.refresh_cadence_days
FROM entities e
CROSS JOIN attribute_registry ar
LEFT JOIN observed_claims oc
  ON oc.entity_id = e.id
  AND oc.attribute_key = ar.attribute_key
  AND oc.is_active = true
WHERE e.operating_status IN ('OPERATING', 'SOFT_OPEN')
  AND ar.refresh_cadence_days IS NOT NULL
  AND (oc.observed_at IS NULL
    OR oc.observed_at < NOW() - (ar.refresh_cadence_days || ' days')::interval)
ORDER BY ar.refresh_cadence_days ASC, oc.observed_at ASC NULLS FIRST;
```

This gives us a prioritized queue of what needs re-checking, driven entirely by the attribute registry configuration. No hardcoded cadences in pipeline scripts.

### Initial Cadence Values

Based on the stability classes defined above, the initial `refresh_cadence_days` values would be:

| Stability Class | Cadence | refresh_cadence_days |
|----------------|---------|---------------------|
| Structural | Annual | 365 |
| Seasonal | Quarterly | 90 |
| Dynamic | Monthly | 30 |
| Accumulative | Quarterly (discovery) | 90 |
| Confirmed absence | 2x positive class | Computed at query time |

These are written to `attribute_registry` once and adjusted based on observation data.

---

## 5. What's Conservative About This

This strategy is deliberately constrained:

- **Annual** for structural data. Not semi-annual, not quarterly. If a restaurant's address hasn't changed in a year, it's not going to change next month.
- **Quarterly** for seasonal data. Not monthly. Most restaurants change hours twice a year. Quarterly catches it within 90 days.
- **Monthly** for dynamic data. Not weekly. Even Instagram bios don't change weekly for most operators. Monthly is sufficient for the vast majority of entities.
- **No real-time checking.** Saiko is not a real-time data product. We're a curated cultural guide. A 30-day lag on a menu change is acceptable. A 90-day lag on hours is acceptable. A 365-day lag on an address is acceptable — because addresses don't change.
- **Observation before escalation.** If the data shows quarterly isn't enough for hours, we tighten to monthly. But we don't tighten preemptively. We wait for evidence.

The only place we're aggressive is business status for MONITORING entities (every 2 weeks) — because that's the one signal where being wrong means sending someone to a closed restaurant.

---

## 6. Relationship to Existing Infrastructure

| Component | Role in Freshness Strategy |
|-----------|---------------------------|
| `attribute_registry` | Stores cadence config and observed change rates per attribute |
| `observed_claims` supersession chain | Provides the raw data for decay observation |
| `source_registry` | Source trust tiers inform which source to prefer on re-check |
| `merchant_enrichment_runs` | Audit trail for when enrichment actually ran |
| `DecayPolicy` enum (NONE, TIME_BASED) | Already exists; TIME_BASED attributes use `refresh_cadence_days` |
| Entity Maintenance Policy | Defines which posture an entity is in; this doc defines what happens within ACTIVE |
| Enrichment Evidence Model | Defines confirmed absence and source-aware staleness; this doc operationalizes those concepts |

---

## 7. Implementation Sequence

This is a strategy doc, not an implementation spec. But for planning:

1. **Populate `attribute_registry`** with `refresh_cadence_days` for all tracked attributes (one-time setup)
2. **Build the observation query** and run it manually against current data to establish baseline change rates
3. **Add observation to enrichment pipeline** — after every re-check, the supersession chain naturally records the comparison
4. **Build the stale-attribute query** for enrichment scheduling (Section 4)
5. **First calibration review** after 6 months of data — Bobby reviews change rates and adjusts cadences

Steps 1–2 are low-effort, high-value. Steps 3–5 are medium-effort and depend on having an enrichment scheduler (not yet built).

---

## 8. What This Document Does Not Cover

- **How enrichment runs.** See enrichment strategy v1.
- **Which sources to use for each attribute.** See source integration policy v1.
- **What happens when a value changes** (sanctioning, canonical promotion). See enrichment evidence model v1.
- **Coverage source link health.** See coverage source enrichment v1. Link health is a parallel concern — it monitors whether URLs are alive, not whether the data behind them has changed.
- **Enrichment scheduler design.** This doc defines what the scheduler needs to know; the scheduler itself is future work.

---

*Saiko Fields · Enrichment Freshness Strategy v1 · Active 2026-03-22 · Approved by Bobby Ciccaglione*
