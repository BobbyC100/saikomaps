# Saiko Merchant Page — Implementation Sanity Checklist (PR Review)

**Version:** v2.2  
**Use:** Review in Cursor before merge to catch drift

---

## 1) Tier Order Integrity

Confirm the render stack is exactly:

1. **HeroHeader**
2. **PrimaryActionSet**
3. **InstagramConfidenceRow** (conditional)
4. **PhotoCollage** (conditional)
5. **VibeTagsRow** (optional / conditional)
6. **TrustBlock** (conditional)
7. **HoursCard** (always)
8. **AddressCard** (conditional)
9. **MapTile** (conditional)
10. **AttributesCard** (conditional)
11. **AlsoOnLists** (conditional)
12. **HouseCard** (fixed placement; Tier 5)

### Fail if:

- Instagram appears inside PrimaryActionSet
- Collage appears below TrustBlock
- Attributes appear above Facts (Hours/Address/Map)
- House appears above Also On or outside Tier 5

---

## 2) Collapse Logic — No Empty Containers

Verify each wrapper has a hard guard:

- **InstagramConfidenceRow** renders only if handle is valid
- **TrustBlock** renders only if it has ≥1 child (curator OR coverage)
- **PhotoCollage** renders only if `collagePhotos.length >= 1`
- **AttributesCard** renders only if ≥1 attribute exists
- **AddressCard** renders only if address exists
- **MapTile** renders only if coordinates exist

### Fail if:

Empty tiles render with padding/borders but no content.

---

## 3) HoursCard — Locked Behavior (Critical)

HoursCard must **always mount** in Tier 3.

### Default (compact) state

- Shows open/closed status and today's window
- Shows "See full schedule" affordance only if schedule exists
- Does **not** show the full week grid/list by default

### Missing hours state

- Shows: "Hours unavailable"
- Neutral styling (no warning/error tone)
- No expand affordance

### Fail if:

- HoursCard collapses when hours missing
- Full week schedule is visible on initial page load

---

## 4) Instagram Slim Treatment — Visual Weight Check

InstagramConfidenceRow must:

- Be single-line
- Be clickable across the row
- Be lighter than Tier 0 actions (not button-weight)
- Not use filled button styling
- Optional subtle chevron is ok

### Fail if:

- It visually competes with Directions/Reserve/Call
- It looks like a primary button
- It expands into a card-sized block

---

## 5) Photo Collage Protection

Confirm:

- Hero photo is excluded from collage
- Collage collapses silently if no non-hero photos
- No "Photos coming soon" placeholder
- Collage never moves below Trust

### Fail if:

- Hero duplicates in collage
- Collage becomes a lower-page module

---

## 6) Trust Tier Rendering

Confirm TrustBlock logic:

- Curator note renders first if present
- Coverage quote can render without curator note
- Coverage sources list can render even if quote text is missing
- If none exist → TrustBlock fully collapses

### Fail if:

- Empty Trust containers appear
- Coverage is promoted above Identity
- Fake/generated "quote" placeholders appear

---

## 7) Attributes Compression (No Spec Sheet Drift)

AttributesCard must:

- Render as chips/compact rows
- Show max ~6 chips in collapsed state
- Show "+N more" if overflow
- Expand to show all chips
- Never render large labeled tables/rows

### Fail if:

- Attributes appear as "Service Options / Parking / Meals" with big row labels
- Attributes take a dominant 2×2 card footprint

---

## 8) Map Tile Constraint

Map must:

- Be small/reference-only
- Contain no "Get Directions" CTA (Directions belongs in Tier 0)
- Collapse if no coordinates

### Fail if:

- Map becomes a hero-like card
- Map contains a Directions button

---

## 9) Tier 3 Stability Test (3 Scenarios)

Manually verify with real records (or mocked states):

### Scenario A — Fully curated

All tiers render; order intact.

### Scenario B — Editorial lite (no curator note, coverage exists)

Trust renders as coverage-only; no empty curator shell.

### Scenario C — Baseline (no trust data, minimal fields)

Trust collapses; page still feels intentional:

- Tier 0
- Tier 1 (hero/collage if any)
- Tier 3 (HoursCard still present)
- Tier 4 (attributes if any)
- Tier 5 (house optional)

### Fail if:

Scenario C feels "broken" (gaps, empty cards, odd stacking).

---

## 10) Mobile Pass

On narrow view:

- Tier 0 actions wrap cleanly (no overflow)
- Instagram row stays single-line or gracefully truncates
- Collage doesn't balloon vertically
- Hours stays compact by default
- Chips wrap without ugly spacing

### Fail if:

First 1–2 screens become scroll-fatiguing.

---

## 11) Promotion Drift Check (Final Gate)

Quick gut check: does the page feel like

- **A curated editorial guide** (pass), or
- **A polished Google profile** (fail)?

If it drifts toward "polished Google," usual culprits are:

- Attributes too big
- Map too dominant
- Instagram styled like a primary button
- Photos pushed down

---

## Merge Criteria

Approve PR only if:

- ✅ Tier order is exact
- ✅ Missing tiers collapse cleanly
- ✅ HoursCard always renders + compact default
- ✅ Instagram is Tier 1.5 and slim
- ✅ Attributes are compressed chips
- ✅ No empty containers / placeholders / apology UI
