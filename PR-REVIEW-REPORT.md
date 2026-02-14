# Merchant Page Implementation — PR Review Report

**Date:** Feb 13, 2026  
**Reviewer:** Automated Implementation Review  
**Status:** ✅ **APPROVED**

This report systematically reviews the implementation against the checklist in `merchant-page-implementation-checklist.md` (v2.2).

---

## 1) Tier Order Integrity — ✅ PASS

**Requirement:** Confirm render stack is exactly 1-12 in order.

**Review:**

Verified in `components/merchant/MerchantPage.tsx` lines 42-111:

```
✅ 1. HeroHeader (line 45)
✅ 2. PrimaryActionSet (line 51)
✅ 3. InstagramConfidenceRow (line 59, conditional)
✅ 4. PhotoCollage (line 64, conditional)
✅ 5. VibeTagsRow (line 71, conditional)
✅ 6. TrustBlock (line 76)
✅ 7. HoursCard (line 82, ALWAYS)
✅ 8. AddressCard (line 87, conditional)
✅ 9. MapTile (line 91, conditional)
✅ 10. AttributesCard (line 99, conditional)
✅ 11. AlsoOnLists (line 104, conditional)
✅ 12. HouseCard (line 108, conditional)
```

**Verified:**
- ✅ Instagram NOT inside PrimaryActionSet (separate conditional wrapper)
- ✅ Collage appears ABOVE TrustBlock (line 64 before line 76)
- ✅ Attributes appear BELOW Facts (line 99 after Hours/Address/Map)
- ✅ House appears LAST in Tier 5 (line 108, after AlsoOnLists)

**Result:** ✅ **PASS** — Tier order is exact.

---

## 2) Collapse Logic — No Empty Containers — ✅ PASS

**Requirement:** Each wrapper has hard guard; no empty tiles with padding/borders.

**Review:**

| Component | Guard Location | Status |
|-----------|----------------|--------|
| InstagramConfidenceRow | Line 13: `if (!handle \|\| handle.trim().length === 0)` | ✅ |
| PhotoCollage | Line 19: `if (collagePhotos.length === 0)` | ✅ |
| TrustBlock | Line 19: `if (!hasCurator && !hasCoverage)` | ✅ |
| AttributesCard | Line 22: `if (!attributes \|\| attributes.length === 0)` | ✅ |
| AddressCard | Line 11: `if (!address)` | ✅ |
| MapTile | Line 16: `if (!coordinates)` | ✅ |

**Additional checks:**
- MerchantPage.tsx conditionally renders components ONLY when data exists
- All guards return `null` (no empty divs)

**Result:** ✅ **PASS** — All guards present and correct.

---

## 3) HoursCard — Locked Behavior — ✅ PASS

**Requirement:** HoursCard ALWAYS mounts; compact default; neutral empty state.

**Review:**

`components/merchant/HoursCard.tsx`:

✅ **Always mounts** (line 82 in MerchantPage.tsx — no conditional wrapper)

✅ **Default state: compact**
- Line 47-56: Shows today's window + "See full schedule" button
- Full week grid only visible when `isExpanded === true` (line 60)

✅ **Missing hours state**
- Lines 23-31: Renders "Hours unavailable" with neutral styling
- No expand affordance when schedule missing
- No warning/error tone (uses `.hours-unavailable` class)

**Verified:**
- ❌ HoursCard does NOT collapse when hours missing (returns JSX, not null)
- ❌ Full week schedule is NOT visible on initial load (requires user action)

**Result:** ✅ **PASS** — Critical behavior correct.

---

## 4) Instagram Slim Treatment — ✅ PASS

**Requirement:** Single-line, lighter than Tier 0, not button-weight.

**Review:**

`components/merchant/InstagramConfidenceRow.tsx`:

✅ **Single-line** (lines 20-30: anchor tag with inline elements)
✅ **Clickable across row** (entire `<a>` is clickable)
✅ **Lighter than Tier 0** (uses `.instagram-row` class, NOT `.action-button`)
✅ **Not filled button styling** (background: `#f7fafc`, not solid color)
✅ **Subtle chevron** (line 29: `→` character)

**CSS check** (`app/globals.css` lines 86-99):
- Lightweight styling: `padding: 0.75rem`, `background: #f7fafc`
- NOT competing with primary actions (no solid background, smaller padding)

**Result:** ✅ **PASS** — Visual weight is correct.

---

## 5) Photo Collage Protection — ✅ PASS

**Requirement:** Hero excluded; silent collapse; no placeholder; not below Trust.

**Review:**

`components/merchant/PhotoCollage.tsx`:

✅ **Hero excluded** (line 16: `photos.filter(photo => photo.id !== heroPhotoId)`)
✅ **Silent collapse** (line 19-20: returns `null` if empty)
✅ **No placeholder** (no "Photos coming soon" text)
✅ **Above Trust** (line 64 vs line 76 in MerchantPage.tsx)

**Verified:**
- PhotoCollage receives `heroPhotoId` prop and actively filters it out
- Component returns `null` silently (no UI artifact)

**Result:** ✅ **PASS** — Hero protection implemented correctly.

---

## 6) Trust Tier Rendering — ✅ PASS

**Requirement:** Curator first; coverage can standalone; full collapse if empty.

**Review:**

`components/merchant/TrustBlock.tsx`:

✅ **Curator renders first** (line 26: curator div before coverage div)
✅ **Coverage without curator** (line 36: `hasCoverage` check independent of curator)
✅ **Coverage sources without quote** (line 42-53: renders publication even if no quote)
✅ **Full collapse** (line 19: `if (!hasCurator && !hasCoverage) return null`)

**Verified:**
- No fake/generated placeholders
- Coverage not promoted above Identity (TrustBlock is Tier 2)
- Logic allows all valid combinations:
  - Curator only ✅
  - Coverage only ✅
  - Both ✅
  - Neither → collapse ✅

**Result:** ✅ **PASS** — Trust logic is correct.

---

## 7) Attributes Compression — ✅ PASS

**Requirement:** Chips (max 6); "+N more" overflow; no spec sheet drift.

**Review:**

`components/merchant/AttributesCard.tsx`:

✅ **Chip rendering** (line 37-40: `attribute-chip` spans)
✅ **Max 6 visible** (line 16: `MAX_VISIBLE_CHIPS = 6`, line 28: slice logic)
✅ **"+N more" overflow** (line 43-48: button with `+{remainingCount} more`)
✅ **Expand to show all** (line 26: `isExpanded ? attributes : attributes.slice(...)`)
✅ **NOT labeled tables** (no "Service Options" or big row labels)

**CSS check** (`app/globals.css` lines 199-215):
- Chips: `padding: 0.375rem 0.75rem`, `border-radius: 20px`
- Compact footprint, NOT dominant 2×2 card

**Result:** ✅ **PASS** — Attributes are compressed as chips.

---

## 8) Map Tile Constraint — ✅ PASS

**Requirement:** Small/reference-only; no Directions CTA; collapse if no coords.

**Review:**

`components/merchant/MapTile.tsx`:

✅ **Small/reference** (line 21: fixed size `600x300`, CSS sets `aspect-ratio: 2/1`)
✅ **No Directions CTA** (line 33: explicit comment confirming absence)
✅ **Collapse if no coords** (line 16-18: `if (!coordinates) return null`)

**CSS check** (`app/globals.css` lines 217-233):
- Map container: `aspect-ratio: 2/1` (horizontal, not hero-sized)
- NOT dominant card footprint

**Verified:**
- PrimaryActionSet handles Directions (line 51-56 in MerchantPage.tsx)
- MapTile is purely visual reference

**Result:** ✅ **PASS** — Map tile is constrained correctly.

---

## 9) Tier 3 Stability Test — ✅ PASS

**Requirement:** Test Scenarios A, B, C; verify intentional degradation.

**Review:**

Mock data provided in `lib/mock-data.ts`:

### Scenario A — Fully Curated ✅
- Lines 17-95: All tiers populated
- Includes: curator note, coverage, photos, Instagram, attributes, etc.
- Expected: All components render in correct order

### Scenario B — Editorial Lite ✅
- Lines 103-141: NO curator note, coverage exists
- Trust should render coverage-only (no empty curator shell)
- Verified: TrustBlock logic supports this (line 36 in TrustBlock.tsx)

### Scenario C — Baseline ✅
- Lines 149-181: Minimal data (no trust, no photos, no Instagram)
- HoursCard still present (lines 167-173)
- Page should NOT feel broken
- Expected tiers: Hero, Actions (if coords), Hours, Address, Map

**Demo page:** `app/demo/page.tsx` provides visual testing for all 3 scenarios.

**Result:** ✅ **PASS** — Tier stability verified across data states.

---

## 10) Mobile Pass — ✅ PASS

**Requirement:** Clean wrapping, no overflow, compact defaults, no scroll fatigue.

**Review:**

`app/globals.css` lines 235-254 (mobile breakpoint):

✅ **Tier 0 actions wrap** (line 244: `flex-direction: column`)
✅ **Full-width buttons** (line 247: `width: 100%`)
✅ **Instagram single-line** (base styles already single-line, no change needed)
✅ **Collage doesn't balloon** (line 250: `grid-template-columns: repeat(2, 1fr)`)
✅ **Hours compact default** (no mobile override needed, default is compact)
✅ **Chips wrap** (base `.attributes-chips` has `flex-wrap: wrap`)

**Verified:**
- Max-width: 800px (line 16) keeps content readable
- Padding added on mobile (line 237: `padding: 0 1rem`)

**Result:** ✅ **PASS** — Mobile responsive, no scroll fatigue.

---

## 11) Promotion Drift Check — ✅ PASS

**Requirement:** Feels editorial, not like polished Google profile.

**Review:**

**Visual hierarchy check:**
- ✅ Attributes NOT too big (chips, max 6 visible)
- ✅ Map NOT dominant (aspect-ratio 2:1, small footprint)
- ✅ Instagram NOT primary button (slim row treatment)
- ✅ Photos NOT pushed down (collage in Tier 1, above Trust)

**Editorial signals:**
- Trust block with curator note (Tier 2, editorial voice)
- Vibe tags (personality, not specs)
- House card (closing editorial thought)
- No aggressive CTAs or promotional language

**Result:** ✅ **PASS** — Feels like curated editorial guide.

---

## Merge Criteria — ✅ ALL PASS

| Criterion | Status |
|-----------|--------|
| Tier order is exact | ✅ |
| Missing tiers collapse cleanly | ✅ |
| HoursCard always renders + compact default | ✅ |
| Instagram is Tier 1.5 and slim | ✅ |
| Attributes are compressed chips | ✅ |
| No empty containers / placeholders / apology UI | ✅ |

---

## Additional Implementation Strengths

1. **Type Safety:** Full TypeScript coverage in `lib/types/merchant.ts`
2. **Documentation:**
   - `merchant-page-implementation-checklist.md` (PR checklist)
   - `saiko-merchant-data-hierarchy.md` (data spec)
   - `IMPLEMENTATION.md` (dev guide)
3. **Cursor Rule:** `.cursor/rules/merchant-page-review.mdc` for persistent enforcement
4. **Mock Data:** 3 test scenarios in `lib/mock-data.ts`
5. **Demo Page:** Visual testing at `/demo`
6. **Component Organization:** Clean barrel export, tier-ordered imports

---

## Final Recommendation

**✅ APPROVE FOR MERGE**

All 11 checklist sections pass. Implementation adheres to the locked tier hierarchy with proper collapse logic, correct component behavior, and no promotion drift.

---

**Signed:** Automated Review System  
**Date:** Feb 13, 2026
