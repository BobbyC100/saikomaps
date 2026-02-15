# Saiko Cuisine Doctrine

**Purpose**: Define how Saiko treats cuisine, format, and vibe — and explicitly document why Google Places data is not authoritative for cuisine. This doc exists to align editorial, product, and engineering decisions going forward.

---

## Core Principles

### 1. Google Places Does Not Define Cuisine

Google Places is an operational substrate, not an editorial authority.

**Google is good at**:
- Address, hours, phone
- Map geometry
- Accessibility & service options
- High-level venue format (restaurant, bar, café)

**Google is bad at**:
- Cuisine classification
- Distinguishing cuisine vs format vs vibe
- Editorial nuance (Korean vs BBQ vs Wine Bar)

**Rule**: Google data must never directly set `cuisinePrimary`.

---

### 2. CuisinePrimary Is Editorial-Only

`cuisinePrimary` represents **what the place cooks**, not how it operates.

- Human-authored or explicitly overridden
- Stable, opinionated, and consistent
- Designed for discovery, not exhaustiveness

**Examples**:
- Park's BBQ → Korean (secondary: Korean BBQ)
- Wine bar serving small plates → Wine Bar, not "American"
- Sushi counter → Sushi, not "Japanese Restaurant"

**Rule**: `cuisinePrimary` reflects Saiko's editorial judgment, not third-party categorization.

---

### 3. Secondary Cuisine Is Optional (and Looser)

`cuisineSecondary` exists to add nuance without bloating the primary taxonomy.

**Use secondaries for**:
- Sub-style (Edomae, Hand Roll)
- Genre clarification (Korean BBQ)
- Program focus (Sours / Saison Focus, IPA Focus)

**Constraints**:
- Max 2 secondary values
- Optional by design
- Never required for search correctness

---

## Coverage Philosophy

### Phase 1 Reality (Current)

- ~44% of ranked places have `cuisinePrimary`
- This is acceptable and honest
- Missing cuisine ≠ broken data

**A place without a clean cuisine signal is better than a wrong one.**

---

### Cuisine Coverage Is an Editorial Asset

Cuisine data improves as:
- Coverage increases
- Sources diversify
- Places are reviewed and touched

**Not by**:
- Regex explosions
- Token stuffing
- Guessing to hit a percentage

**Rule**: We do not brute-force cuisine coverage to satisfy metrics.

---

### Phase 2 Lever: Sources, Not Inference

The primary driver of better cuisine data is **more and better coverage**.

As you add:
- Eater lists
- Cuisine-specific guides
- Chef recommendations

Cuisine classification becomes:
- Obvious
- Stable
- Justified

**Inference remains a fallback, never the strategy.**

---

## Implementation Guardrails (for Cursor)

- Google Places data may inform format only
- `cuisinePrimary` is never auto-written from Google
- Overrides > legacy `cuisineType` > tokens > null
- It is acceptable for `cuisinePrimary` to be null
- Coverage growth should precede taxonomy expansion

---

## Bottom Line

Saiko is **not** trying to answer:

> "What does Google think this place is?"

Saiko **is** trying to answer:

> "What does this place actually cook, according to people who know?"

**This doctrine protects that distinction.**
