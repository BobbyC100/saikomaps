# Density Refinement Complete

**Date:** February 8, 2026  
**Status:** ✅ Implemented

---

## Principle

Grid controls width. Padding controls density. Height is content-driven.

**Visual weight should match semantic weight.**

---

## Density Tiers Implemented

### Editorial Cards (Generous)
**Padding:** `24px`  
**Energy:** Breathing room for editorial voice

- **Curator's Note** - Field note style, italic serif
- **Coverage** - Pull Quote / Excerpt / Source list

**Rationale:** Editorial content deserves space to be absorbed. These cards invite reading, not scanning.

---

### Facts Cards (Compact)
**Padding:** `16px 20px`  
**Energy:** Efficient reference, not poster

- **Hours** - Two-column schedule with status footer

**Changes:**
- Tighter vertical rhythm (16px top/bottom)
- Compact row spacing for days
- Removed vertical centering (`justify-content: center`)
- Irregular hours: reduced from 20px to 12px vertical padding
- Removed `min-height: 120px` constraint

**Rationale:** Hours is a reference card. Users scan it quickly for "when can I go?" It should feel dense and functional.

---

### Utility Cards (Minimal)
**Padding:** `12px 16px`  
**Energy:** Reference, not poster

- **Map** - Icon + address
- **Website** - Icon + domain
- **Call** - Icon + number

**Changes:**

**Padding:**
- Reduced from `20px` / `16px` to `12px 16px`
- Minimal vertical space

**Typography:**
- Labels: `8px` (was `9px`)
- Map address line 1: `11px` (same)
- Map address line 2: `9px` (was `10px`)
- Website domain: `11px` (was `12px`)
- Call number: `12px` (was `14px`)

**Icons:**
- Reduced from `32px` to `28px`
- Quieter visual presence

**Map tile:**
- Reduced from `90px × 90px` to `80px × 80px`
- Border radius: `6px` (was `8px`)

**Layout:**
- Removed vertical centering (`justify-content: center`)
- Content flows naturally from top
- Gaps reduced: `10px` / `8px` (was `12px` / `10px`)

**Rationale:** These are utility cards, not feature cards. They should whisper, not shout. Users know what they are (map, website, phone) — the label and icon are enough.

---

## Visual Hierarchy Achieved

**Quietest to Loudest:**

1. **Utility cards** - Minimal padding, small type, quiet
2. **Facts cards** - Compact padding, reference energy
3. **Editorial cards** - Generous padding, breathing room
4. **Primary Action Set** - Bold, clear calls to action (unchanged)

**Result:** Spatial weight matches semantic weight. The page guides the eye correctly.

---

## What Stayed the Same

✅ Grid System v1 intact (6 columns, span rules, expansion logic)  
✅ Tier hierarchy (Decision > Context > Facts > Editorial > Utility)  
✅ Horizontal layout and column spans  
✅ All content and functionality  
✅ Color palette and typography families  

---

## What Changed

❌ Vertical centering removed from Facts and Utility cards  
❌ Large padding on Utility cards removed  
❌ Oversized icons and typography reduced  
❌ `min-height` constraints removed from Hours irregular fallback  

✅ Content-driven height preserved  
✅ Reference energy (not poster energy) for Facts and Utilities  
✅ Editorial cards retain generous spacing  

---

## Files Modified

1. **`app/(viewer)/place/[slug]/place.module.css`**
   - Updated `.curatorNoteCard` padding: `24px`
   - Updated `.hoursBlock` padding: `16px 20px`
   - Updated `.hoursIrregular` layout (removed centering, min-height)
   - Updated `.mapCard` padding: `12px 16px`
   - Updated `.mapTileStyled` size: `80px × 80px`
   - Updated `.mapAddressLine2` size: `9px`
   - Updated `.websiteCard` padding: `12px 16px`
   - Updated `.websiteCardIcon` size: `28px`
   - Updated `.websiteCardDomain` size: `11px`
   - Updated `.callCard` padding: `12px 16px`
   - Updated `.callCardIcon` size: `28px`
   - Updated `.callCardNumber` size: `12px`
   - Added utility card label overrides (8px, 2px letter-spacing)

2. **`components/merchant/CoverageCard.module.css`**
   - Updated `.coverageCard` padding: `24px`

3. **`app/(viewer)/place/[slug]/page.tsx`**
   - Updated Globe icon size: `28px` (was `32px`)
   - Updated Phone icon size: `28px` (was `32px`)

---

## Before & After

### Before
- All cards had similar padding (16-20px)
- Utility cards felt too spacious
- Hours card had excessive vertical whitespace
- Visual weight was uniform across card types
- Icons and text were oversized for utility cards

### After
- Editorial: 24px (generous breathing room)
- Facts: 16px 20px (compact reference)
- Utility: 12px 16px (minimal, functional)
- Visual weight matches semantic importance
- Hours card feels efficient, not spacious
- Utility cards whisper instead of shout

---

## Testing

✅ Server compiling successfully  
✅ All pages rendering (200 responses)  
✅ No TypeScript errors  
✅ All card types present on page  

**Next:** Test in browser to verify visual density feels correct across all card types.

---

## Design Principle Reinforced

**"Reference energy, not poster energy"**

Utility and Facts cards are tools for decision-making. They should be:
- Scannable (not contemplative)
- Compact (not spacious)
- Functional (not decorative)
- Top-aligned (not centered)

Editorial cards are different — they invite reading and reflection. They earn their space.

---

**Status:** ✅ Complete  
**Compilation:** ✅ Passing  
**Ready for:** Browser testing
