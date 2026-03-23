---
doc_id: ARCH-NEIGHBORHOOD-COVERAGE-V0
status: PROBLEM_FRAMING
owner: Bobby
created: 2026-03-20
last_updated: 2026-03-20
layer: Problem Framing (pre-spec)
related_docs:
  - docs/architecture/coverage-dashboard-v2-spec.md
  - docs/architecture/enrichment-model-v1.md
  - docs/architecture/vertical-taxonomy-v1.md
  - docs/architecture/visit-bucket-problem-framing-v0.md
---

# Neighborhood Coverage Model — Problem Framing (v0)

> **Status:** Problem Framing — defines direction and open questions.
> **Purpose:** Define how Saiko evaluates whether a neighborhood is well-rounded in terms of entity coverage, and how to identify gaps that guide intake decisions.

---

## 1. Context

Saiko's Coverage Dashboard shows per-neighborhood data: entity counts, completeness buckets (Identity, Visit, Offering), and vertical distribution. This tells you how complete the data is for entities you already have.

What it doesn't tell you is whether the neighborhood itself is well-covered — are we missing entire categories of businesses that a well-rounded neighborhood should have?

---

## 2. Core Idea

A well-rounded neighborhood has a diverse mix of entity types. The research behind livable neighborhoods (15-Minute City, Third Place theory, ULI Healthy Places) consistently finds that neighborhood health correlates with the presence of specific kinds of businesses: daily food sources, social anchors (coffee, bars), green space, and specialized commerce (bakeries, butchers, cheese shops).

Saiko is not an urban planning tool. But this research informs how we think about coverage gaps. When a neighborhood has 40 EAT entities and zero COFFEE or PURVEYORS, that's likely a gap in our intake, not a reflection of the real neighborhood.

---

## 3. Current Approach (v0 — Simple)

At this stage, the system operates at the **vertical level only**. No subtypes.

### What we can measure now

For each neighborhood, the dashboard shows the vertical distribution — how many EAT, COFFEE, DRINKS, SHOP, CULTURE, NATURE, PURVEYORS, etc.

### What "well-rounded" means at v0

A well-rounded neighborhood should have representation across the verticals that are relevant to its character. At minimum, most LA neighborhoods should have some presence in:

- **EAT** — restaurants, food
- **COFFEE** — coffee shops
- **DRINKS** — bars, wine bars
- **SHOP** — retail
- **PURVEYORS** — bakeries, butchers, cheese shops, specialty food

If a neighborhood is missing an entire expected vertical, that's flagged as a coverage gap — likely an intake opportunity, not a reflection of reality.

### What "imbalanced" means at v0

If one vertical dominates overwhelmingly (e.g., 40 EAT, 1 COFFEE, 0 SHOP, 0 PURVEYORS), the neighborhood coverage is lopsided. This suggests intake work focused on the underrepresented verticals.

### How this appears in the dashboard

The Neighborhood Overview table already shows the vertical mix per neighborhood. The directional report at v0 is simply: look at the vertical mix column, spot the zeros and near-zeros, those are your intake targets.

---

## 4. What v0 Does NOT Do

- Does not define a formal scoring model or "neighborhood health score"
- Does not prescribe exact target ratios per vertical
- Does not account for neighborhood size, population density, or commercial density
- Does not use subtypes (deferred — subtype taxonomy not yet defined)
- Does not estimate "how many entities should this neighborhood have" (no denominator)

---

## 5. Future Directions

### Subtypes (Phase 2, when taxonomy exists)

The vertical level is too coarse for real editorial judgment. "PURVEYORS" doesn't tell you whether a neighborhood has a bakery, a butcher, and a cheese shop — or three wine shops. Subtypes would enable Saiko to express: "Silver Lake has 8 PURVEYORS but no bakery-type entities."

### Neighborhood reference profiles

Define what a well-rounded neighborhood looks like for different neighborhood sizes/types. A dense urban neighborhood might need more COFFEE and EAT density than a residential one near a park. These profiles would be editorial — Saiko's point of view, informed by research but not governed by it.

### Denominator estimation

"82 entities in Silver Lake — is that good?" Currently unknowable without knowing how many relevant businesses actually exist there. Future work could incorporate external datasets (business registries, permit data, Google Places density) to estimate the denominator.

### Intake recommendations

The directional report evolves into specific intake recommendations: "Silver Lake is missing PURVEYORS coverage — consider a focused intake run for bakeries, cheese shops, and specialty food in the 90026/90039 zip codes."

---

## 6. Guiding Principle

Saiko's neighborhood coverage model is editorial, not encyclopedic. We don't aim to capture every business. We aim to capture the businesses that make a neighborhood feel complete from Saiko's perspective — the places that make daily life work, that anchor community, that give a neighborhood its character.

The research (15-Minute City, Third Place, ULI Healthy Places) provides the intellectual foundation. Saiko's editorial lens determines how we apply it.

---

*Saiko Fields · Neighborhood Coverage Model · Problem Framing v0 · 2026-03-20*
