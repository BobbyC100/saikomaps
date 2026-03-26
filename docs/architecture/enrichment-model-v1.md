---
doc_id: SKAI-DOC-FIELDS-ENRICHMENT-MODEL-V1
doc_type: architecture
status: draft
title: "Enrichment Model V1 — Vertical-Aware Completeness"
owner: Bobby Ciccaglione
created: "2026-03-19"
last_updated: "2026-03-25"
project_id: SAIKO
summary: "Defines three-bucket enrichment model (Identity / Access / Offering) with vertical-aware completeness profiles. Replaces flat field checklist with context-relative scoring."
systems:
  - coverage
  - enrichment
  - dashboard
related_docs:
  - docs/architecture/enrichment-strategy-v1.md
  - docs/architecture/coverage-ops-approach-v1.md
  - docs/architecture/coverage-tiers-v1.md
---

# ENRICHMENT MODEL V1 — VERTICAL-AWARE COMPLETENESS

---

## 1. Objective

Define a principled, scalable model for determining entity completeness that:

- Separates identity from enrichment
- Adapts expectations by vertical
- Enables accurate coverage metrics
- Provides a foundation for enrichment pipelines

---

## 2. Problem Statement

The current model defines "Data Complete" using a flat checklist of fields, applied uniformly across all entities.

This creates two core issues:

### 2.1 Field Type Confusion

Fields of different types are treated equally:

- Example: GPID is evaluated alongside phone, menu, hours

This conflates:

- identity
- access
- content

### 2.2 Context Mismatch

All entities are evaluated against the same expectations:

- A nature trail is penalized for missing a phone
- A taco cart is rewarded for fields it doesn't need

Result:

- misleading coverage metrics
- incorrect prioritization in enrichment

---

## 3. Core Model — Three Data Buckets

All entity data is organized into three distinct buckets:

### 3.1 Identity (Existence Layer)

Defines whether a place exists and can be located.

**Fields:**

- name
- latitude / longitude
- address (or locality)
- primary category / vertical
- external IDs (e.g., GPID)

**Rules:**

- Required for all entities
- Not considered "enrichment"
- GPID belongs here (not enrichment)

### 3.2 Access / Contact Surface

Defines how a user interacts with the place.

**Fields:**

- website
- phone
- reservations
- Instagram *
- hours

**Rules:**

- Varies by vertical
- Not all fields expected for all entities

*Note: Instagram serves dual purpose — it is an access surface (how users find/follow a place) AND a content source (captions feed signal extraction, photos feed gallery). For completeness scoring, Instagram presence is evaluated in the Access bucket. Its content contribution is evaluated separately in the Offering bucket via extracted signals.*

### 3.3 Offering / Content

Defines what the place is and what it provides.

**Fields:**

- menu
- cuisine / category attributes
- program signals (wine, coffee, etc.)
- structured offering data

**Rules:**

- Highly variable by vertical
- Often the most incomplete layer early on

---

## 4. Vertical-Aware Enrichment Profiles (V1)

Completeness is defined relative to what is expected for the entity's vertical, not a global checklist.

### 4.1 EAT (Restaurants)

- **Identity:** Required
- **Access:** High expectation
  - hours, website, Instagram, reservations, phone
- **Offering:** High expectation
  - menu, cuisine, program signals

### 4.2 DRINKS

- Same expectations as EAT (for now)

### 4.3 CULTURE (Museums, Galleries)

- **Identity:** Required
- **Access:** Medium-high
  - website, hours, Instagram
- **Offering:** Low-medium
  - programming, exhibitions (not menus)

**Subtype note (implemented in scanner policy, 2026-03-25):**
- Some CULTURE subtypes treat hours as optional when schedule cadence is irregular or event-based.
- Current implemented exception: music-venue/theater/theatre/concert-hall patterns.
- Important: this affects **expectation + issue detection**, not rendering. If hours are present, they still render.

### 4.4 SHOP

- **Identity:** Required
- **Access:** Medium-high
  - website, hours, phone, Instagram
- **Offering:** Low
  - product categories (no structured menu equivalent)

### 4.5 ACTIVITY (Hikes, Courts, Recreation)

- **Identity:** Required
- **Access:** Low
  - optional website
- **Offering:** Minimal

### 4.6 NATURE

- **Identity:** Required (coordinates are core product)
- **Access:** None expected
- **Offering:** None expected

---

## 5. Definition of "Completeness"

Completeness is not binary.

Instead:

**Completeness = % of expected fields satisfied within each bucket**

Each entity has:

- Identity Completeness
- Access Completeness
- Offering Completeness

Optional:

- Composite completeness score

---

## 6. Key Design Decisions

### 6.1 Identity ≠ Enrichment

- Identity fields are required baseline data
- They should not inflate or distort enrichment metrics

### 6.2 Vertical Before Subtype

- Vertical-level profiles are sufficient for V1
- Subtype logic (e.g., fine dining vs taco cart) is deferred
- Operational exception: limited subtype overrides are allowed when they remove known false-positive issues
  without changing the core vertical model (e.g., CULTURE music-venue hours expectation in scanner policy).

### 6.3 No Weighted Scoring (V1)

- Keep scoring interpretable and debuggable
- Avoid opaque weighting systems early

---

## 7. Implications for System Design

### 7.1 Dashboard (Coverage)

Replace:

- Global "L3 Data Complete"

With:

- Completeness relative to vertical expectations

Display:

- % complete by bucket (Identity / Access) at the neighborhood level
- Program Depth distribution (0, 1, 2, 3+ programs) replaces Offering % as the neighborhood-level metric — more actionable for operators than a single percentage
- Aggregated per vertical
- Note: The Offering bucket still exists in the completeness model and drives gap detection. Only the neighborhood table column changed.

### 7.2 Enrichment Pipeline

Profiles can guide:

- What fields to prioritize per entity
- What enrichment steps to run
- When an entity is considered "sufficiently enriched"

### 7.3 Data Modeling

Ensure:

- Identity fields are clearly separated in schema
- Enrichment layers do not depend on identity completeness scoring

---

## 8. Template — Enrichment Profile Definition (Reusable)

Use this structure for future extensions:

```
Vertical: [VERTICAL_NAME]

Identity:
  required: [fields]

Access:
  expected: [fields]
  optional: [fields]
  not_applicable: [fields]

Offering:
  expected: [fields]
  optional: [fields]
  not_applicable: [fields]
```

---

## 9. Future Extensions

### 9.1 Subtype Profiles (Phase 2)

- Example: fine_dining vs food_cart
- Enables more precise expectations within verticals

### 9.2 Confidence Integration

- Combine completeness with source confidence
- Distinguish:
  - "field exists"
  - "field is trusted"

### 9.3 Enrichment Strategy Automation

- Trigger enrichment workflows based on missing expected fields
- Prioritize high-impact gaps

---

## 10. Summary

The system shifts from:

> "Does this entity have all fields?"

To:

> "Does this entity have what it should have, given what it is?"

This creates:

- more accurate coverage metrics
- cleaner system architecture
- better alignment between product and data
