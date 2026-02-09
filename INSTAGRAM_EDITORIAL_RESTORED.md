# Instagram Restored to Editorial Tier

**Date:** February 8, 2026  
**Status:** ✅ Complete

---

## Issue

Instagram was mistakenly removed from the page entirely. Per spec, Instagram should appear in the **Editorial tier as social proof**, not in Primary Action Set or Utilities.

---

## Correction Made

Instagram has been restored to the Editorial tier alongside Curator's Note and Coverage.

### Editorial Tier Composition

**Cards:**
1. Curator's Note (3-col or 2-col)
2. Coverage (3-col or 2-col)  
3. Instagram (2-col)

**Expansion Logic:**
- **3 cards present:** 2 + 2 + 2 (all equal width)
- **2 cards present:** 3 + 3 (equal split)
- **1 card present:** 6 (full width)
- **0 cards present:** Tier doesn't render

---

## Instagram Card Design

**Density:** Utility-level (12px 16px padding)  
**Purpose:** Social proof, not call-to-action  
**Layout:** Icon + handle, vertically stacked  

**Styling:**
- Padding: `12px 16px` (minimal, functional)
- Icon: 28px Instagram icon (khaki)
- Handle: 11px Libre Baskerville, @username
- Label: 8px uppercase "INSTAGRAM"
- Link: Opens `instagram.com/[handle]` in new tab

**Feel:** Quiet reference card, not bold action button

---

## Why Instagram Belongs in Editorial

Instagram is **social proof** (external validation), not a **primary action** (task completion).

**Editorial tier purpose:**
- Curator's Note: Internal voice (map creator's perspective)
- Coverage: External voice (press/publications)
- Instagram: Social validation (follower presence, visual feed)

Together, these three cards answer: **"Why should I trust this place?"**

**NOT:** "What action do I take?"  
**NOT:** "How do I get there?"

---

## Implementation

### Files Modified

1. **`app/(viewer)/place/[slug]/page.tsx`**
   - Added `hasInstagram` check
   - Added `editorialCount` calculation (1, 2, or 3)
   - Updated Editorial tier rendering with Instagram card
   - Implemented 2+2+2 / 3+3 / 6 expansion logic
   - Added Instagram import (`InstagramIcon`)

2. **`app/(viewer)/place/[slug]/place.module.css`**
   - Added `.instagramCard` styles (utility-density)
   - Added `.instagramCardContent` layout
   - Added `.instagramCardIcon` sizing (28px)
   - Added `.instagramCardHandle` typography (11px)
   - Added Instagram to utility-density label overrides (8px)

3. **`docs/MERCHANT_PAGE_GRID_SYSTEM_V1.md`**
   - Updated Card Sizes table (Instagram 2-col)
   - Updated Tier Composition (Editorial now has 3 cards)
   - Updated Expansion Rules (2+2+2 / 3+3 / 6)
   - Updated Priority Orders section
   - Updated Density Tiers table

---

## Expansion Examples

### Example 1: All Three Present
```
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ Curator's   │ │  Coverage   │ │ Instagram   │
│    Note     │ │             │ │             │
│  (2-col)    │ │   (2-col)   │ │   (2-col)   │
└─────────────┘ └─────────────┘ └─────────────┘
```

### Example 2: Two Present (No Instagram)
```
┌────────────────────────┐ ┌────────────────────────┐
│    Curator's Note      │ │       Coverage         │
│       (3-col)          │ │        (3-col)         │
└────────────────────────┘ └────────────────────────┘
```

### Example 3: One Present (Coverage Only)
```
┌──────────────────────────────────────────────────┐
│                    Coverage                      │
│                     (6-col)                      │
└──────────────────────────────────────────────────┘
```

---

## Visual Hierarchy

**Within Editorial Tier:**

1. **Curator's Note** - 24px padding, generous (if present)
2. **Coverage** - 24px padding, generous (if present)
3. **Instagram** - 12px 16px padding, minimal (if present)

Instagram uses utility-level density because it's functional (social proof), not contemplative (editorial content). It whispers rather than commands attention.

---

## Data Check

Instagram data is available via:
- `location.instagram` (raw handle or URL)
- `normalizeInstagram()` function (extracts clean handle)
- `instagramHandle` variable (computed)

If Instagram handle exists, it renders in Editorial tier.

---

## Result

✅ Instagram restored to page  
✅ Editorial tier now has 1-3 cards with proper expansion  
✅ Instagram feels like social proof, not a call-to-action  
✅ Utility-density styling matches semantic purpose  
✅ Grid System v1 expansion logic intact

---

## Status

- ✅ Server compiling successfully
- ✅ All pages rendering (200 responses)
- ✅ No TypeScript errors
- ✅ Ready for browser testing

---

**Completed:** February 8, 2026  
**Implementation:** Phase 3 of Grid System v1
