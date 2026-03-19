---
doc_id: SOURCE-INTEGRATION-V1
title: Source Integration Policy
status: draft
owner: bobby
created: 2026-03-19
---

# Source Integration Policy v1

## Purpose

Defines when and how new data sources enter the Saiko system. Prevents ad hoc source additions from creating noise, duplicates, or layer violations.

A new data source should not be added because it is interesting or rich. It should only be added if it clearly improves one of these system layers:

- **Identity resolution** — confirming or disambiguating entities
- **Factual coverage** — filling known gaps in entity attributes
- **Cultural interpretation** — supporting SceneSense, editorial, or programmatic signals
- **Spatial context** — boundaries, adjacency, geography
- **Operational monitoring** — detecting closures, moves, status changes

If it does not improve one of those, it should not enter the system.

---

## Source Roles

Every source is assigned a primary role. This constrains how it is used and prevents misuse.

| Role | What it provides | Example |
|------|-----------------|---------|
| **identity** | Confirms entity existence, legal name, business type | Civic business registry |
| **enrichment** | Fills attribute gaps (hours, menu, offerings) | Merchant website, Instagram API |
| **verification** | Cross-checks existing canonical facts | Google Places API |
| **coverage-ops** | Supports operational triage (closures, gaps, health) | Civic registry status field |
| **spatial-context** | Boundaries, polygons, adjacency, geographic features | Parks GIS, neighborhood shapefiles |
| **monitoring** | Detects real-world changes over time | Periodic re-crawl, social feed |

A source may have secondary roles, but the primary role determines where it enters the system and what it is trusted for.

---

## Source Types

| Type | Examples |
|------|----------|
| civic / municipal | Business registries, permit data, GIS layers |
| merchant | Business websites, reservation systems, POS data |
| editorial | Restaurant reviews, longform articles, guides |
| platform | Google Places, Yelp, OpenTable |
| social | Instagram, TikTok |
| spatial / GIS | Park boundaries, zoning, neighborhood polygons |

---

## Source Trust Profiles

Not all sources are equally trustworthy, and trust varies by dimension.

For each source, define trust along these axes:

- **Existence** — is it reliable for confirming something exists?
- **Recency** — how current is the data?
- **Naming** — is it reliable for canonical business names?
- **Location** — is it reliable for addresses/coordinates?
- **Consumer experience** — does it say anything about what a visit is like?

Example:

| Source | Existence | Recency | Naming | Location | Consumer experience |
|--------|-----------|---------|--------|----------|-------------------|
| Civic registry | Strong | Moderate | Strong (legal) | Moderate | None |
| Merchant website | Strong | Strong | Strong (self-described) | Strong | Moderate |
| Instagram | Weak | Strong | Weak | Weak | Moderate |
| Editorial | Moderate | Weak | Moderate | Weak | Strong |

---

## Integration Phases

### Phase 0 — Intake Review

No code. Answer:

1. What problem are we solving?
2. Why this source specifically?
3. What exact fields matter?
4. What system layer does it touch?
5. What is the failure mode?

If these cannot be answered clearly, stop. Fill out a [Source Intake Card](#source-intake-card) before proceeding.

### Phase 1 — Read-Only Profiling

Pull a sample only. Inspect:

- Schema and field types
- Update cadence / freshness
- Null rates and data quality
- Weird values, encoding issues
- Join fields (name, address, coordinates, IDs, URLs)

Output: short profiling memo with candidate fields and recommendation (proceed / hold / reject).

**Most bad sources should die here.**

### Phase 2 — Sandbox Match Test

Do not ingest broadly. Take 100-500 sample rows from one or two known neighborhoods.

Test:

- How many rows match existing entities?
- How many create false positives?
- How many are genuinely net-new?
- How many break normalization?

This is a controlled experiment, not pipeline integration.

### Phase 3 — Non-Destructive Integration

If it passes, add as a **read-only supporting source**, not a source of truth.

- Store raw snapshot in staging
- Parse into normalized staging table
- Do NOT overwrite canonical fields automatically
- Attach provenance to every derived fact

This is the "prove value without damage" step.

### Phase 4 — Decision Gate

After the pilot, classify the source:

| Status | Meaning |
|--------|---------|
| **core** | Trusted, integrated into enrichment pipeline |
| **supporting** | Read-only reference, used for verification or gap-filling |
| **ops-only** | Used by coverage ops tooling, not enrichment |
| **rejected** | Does not provide sufficient value; archived |

Not every source deserves full integration.

---

## Source Intake Card

For each candidate source, fill out:

1. **Source name** — e.g., "LA City Active Businesses"
2. **Source type** — civic, merchant, editorial, platform, social, spatial
3. **System role** — identity, enrichment, verification, coverage-ops, spatial-context, monitoring
4. **Grain** — what is one record? (business, address, park polygon, article, etc.)
5. **Trust profile** — strong/moderate/weak for: existence, recency, naming, location, experience
6. **Freshness** — update frequency, expected lag, whether stale data is acceptable
7. **Joinability** — how it connects (name+address, coordinates, official ID, URL, phone)
8. **Risk** — what can go wrong (duplicates, stale closures, weak matching, schema drift, legal)
9. **Success test** — what measurable thing should improve (match rate, gap recovery, normalization, accuracy)

---

## Guardrails

### 1. No direct overwrite of canonical truth

New sources must not immediately rewrite entity name, address, status, or category. They enter as:

- Supporting evidence
- Candidate facts
- Conflict signals

### 2. Every source needs provenance

For every fact derived from a source, track:

- Source name
- Fetch date
- Record identifier
- Transformation step

### 3. Source-specific confidence

Do not treat all sources equally. Confidence reflects trust in the source for a specific dimension, not absolute truth.

### 4. Small pilots only

No wide rollout before a pilot proves value. Phase 2 sandbox testing is mandatory.

### 5. Layer discipline

A source enters through the Data Layer. It does not skip to Fields or Traces. Raw source data never touches product surfaces directly.

---

## Testing Requirements

For each source, define and pass three tests before promotion:

### 1. Schema Test
Can we reliably pull and parse it? Are field types stable? Are nulls handled?

### 2. Join Test
Can we connect it to existing entities with acceptable accuracy? What is the false positive rate?

### 3. Value Test
Does it improve something meaningful? Examples:

- Recovered 8% more restaurant entities in target district
- Reduced unmatched address variants by 22%
- Improved park adjacency detection from fuzzy to exact
- Confirmed 15 closures that were previously undetected

**If there is no value test, it is not a real integration effort.**

---

## Relationship to Existing Systems

- **source_registry** (Fields v2) — promoted sources get a row in `source_registry` with type, trust level, and metadata
- **attribute_registry** — new attributes from a source must be registered before claims are written
- **ERA pipeline** — enrichment sources plug into ERA stages; they don't bypass them
- **Coverage ops** — ops-only sources may be used in dashboards without entering the enrichment pipeline

---

## Document Set

| Document | Purpose |
|----------|---------|
| This doc | Policy — what qualifies, process, guardrails |
| Source Intake Card (above) | Template — filled per candidate source |
| `source_registry` table | Registry — all current sources with type, role, status |
