# Saiko Merchant Data Hierarchy

**Version:** 2.1  
**Status:** Locked  
**Last Updated:** Feb 2026

This document defines the locked data hierarchy for all merchant/place surfaces across Saiko Maps. The hierarchy governs what renders, where it renders, and in what order.

---

## Core Principle

**Data tells the story, not the template.**

Blocks earn their space. If a tier has no data, it collapses cleanly and silently. No placeholders, no apologies, no "coming soon" messages.

---

## Tier Structure

### Tier 0 — Identity + Action

The essential layer. These always render (except when explicitly missing).

| Field | Type | Behavior |
|-------|------|----------|
| **Hero Photo** | Image | Always renders |
| **Name** | String | Always renders |
| **Tagline** | String | Optional, renders if present |
| **Primary Actions** | Buttons | Call, Reserve, Directions (conditional on data) |

**Collapse Logic:**
- Hero and Name never collapse
- Action buttons render only if data exists (phone, reservation URL, coordinates)

---

### Tier 1 — Visual Identity

Establishes mood and personality through imagery.

| Component | Behavior |
|-----------|----------|
| **Instagram Row** | Renders if handle exists; SLIM treatment (single-line, not button-weight) |
| **Photo Collage** | Renders if ≥1 non-hero photo exists; hero must be excluded |
| **Vibe Tags** | Renders if tags exist; optional editorial layer |

**Collapse Logic:**
- Instagram collapses if handle missing or invalid
- Collage collapses if no non-hero photos
- Tags collapse if empty

**Critical Rules:**
- Hero photo must NEVER appear in collage
- Instagram row must be visually lighter than Tier 0 actions
- No "photos coming soon" placeholder

---

### Tier 2 — Editorial + Context

Trust-building through curation and editorial voice.

| Component | Behavior |
|-----------|----------|
| **Trust Block** | Curator note + coverage; collapses if both empty |
| **Hours Card** | **ALWAYS RENDERS** (even with missing data) |

**Trust Block Logic:**
- Curator note renders first if present
- Coverage quote can render without curator note
- Coverage sources can render even if quote is missing
- If none exist → TrustBlock fully collapses
- Never show fake/generated quotes

**Hours Card Logic (CRITICAL):**
- Default: compact (today's window + expand affordance)
- Missing data: shows "Hours unavailable" with neutral styling
- Full week schedule only visible after user expands
- **Never collapses entirely**

---

### Tier 3 — Reference (Facts)

Practical information for visit planning.

| Component | Behavior |
|-----------|----------|
| **Address Card** | Renders if address exists |
| **Map Tile** | Renders if coordinates exist; small/reference-only |

**Map Tile Rules:**
- Must be small and reference-only
- NO "Get Directions" CTA (belongs in Tier 0)
- Collapses if no coordinates

---

### Tier 4 — Attributes

Practical details in compressed format.

| Component | Behavior |
|-----------|----------|
| **Attributes Card** | Renders if ≥1 attribute exists; chip compression |

**Attributes Rules:**
- Render as chips (max ~6 visible by default)
- "+N more" chip to expand
- Never render as labeled table/spec sheet
- No "Service Options / Parking / Meals" row labels

---

### Tier 5 — Discovery

Cross-references and editorial closure.

| Component | Behavior |
|-----------|----------|
| **Also On Lists** | Renders if merchant appears on other lists |
| **House Card** | Renders if house content exists; fixed placement (always last) |

**House Card:**
- Saiko editorial voice / closing thought
- Optional, but when present, always renders last
- Never appears above "Also On"

---

## Render Order (Non-Negotiable)

1. **HeroHeader**
2. **PrimaryActionSet**
3. **InstagramConfidenceRow** *(conditional)*
4. **PhotoCollage** *(conditional)*
5. **VibeTagsRow** *(conditional)*
6. **TrustBlock** *(conditional)*
7. **HoursCard** *(always)*
8. **AddressCard** *(conditional)*
9. **MapTile** *(conditional)*
10. **AttributesCard** *(conditional)*
11. **AlsoOnLists** *(conditional)*
12. **HouseCard** *(conditional, Tier 5)*

---

## Failure Modes

### ❌ Promotion Drift

The page starts to feel like a polished Google profile instead of a curated editorial guide.

**Red flags:**
- Attributes dominate the page
- Map becomes hero-sized
- Instagram styled like a primary button
- Photos pushed below the fold
- Spec sheet labeling (Service Options / Parking / etc.)

### ❌ Empty Containers

Components render with visible padding/borders but no content.

**Examples:**
- Trust block with empty curator shell
- Attributes card with no chips
- Photo collage showing hero duplicate

### ❌ Tier Inversion

Components render out of order.

**Examples:**
- Instagram inside PrimaryActionSet
- Collage below TrustBlock
- Attributes above Hours/Address/Map
- House above "Also On"

---

## Testing Scenarios

### Scenario A — Fully Curated

All tiers render; order intact. The ideal case.

### Scenario B — Editorial Lite

No curator note, but coverage exists. Trust block should render as coverage-only with no empty curator shell.

### Scenario C — Baseline

No trust data, minimal fields. Page should still feel intentional:
- Tier 0 (identity + actions if available)
- Tier 1 (hero/collage if any)
- Tier 3 (HoursCard still present, even if showing "Hours unavailable")
- Tier 4 (attributes if any)
- Tier 5 (house optional)

**Fail if:** Scenario C feels "broken" with gaps, empty cards, or odd stacking.

---

## Surfaces Using This Hierarchy

This hierarchy applies to **all** place-data surfaces:

1. **Merchant Profile Page** (`/place/[slug]`) — Full implementation
2. **Map Popup** — Subset (Tier 0 + Tier 1 only)
3. **List Card** — Subset (Hero + Name + Tagline + Tags)
4. **Share Card** — Subset (Template-specific; always includes hero + name)

**Never invert the hierarchy** across surfaces. A popup shows a subset of the full page, not a reordering.

---

## Change Control

This hierarchy is **locked**. Changes require:

1. Documented rationale
2. Testing across all three scenarios (A, B, C)
3. Visual QA on mobile + desktop
4. Approval from product owner

Do not add new tiers without updating this document.

---

*Saiko Maps · Data Hierarchy Spec · v2.1*
