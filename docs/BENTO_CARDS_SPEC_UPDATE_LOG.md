# Bento Cards Spec Update Summary

**Date**: February 7, 2026  
**File**: `/Users/bobbyciccaglione/Downloads/saiko-bento-cards-spec.md`  
**Status**: ✅ Updated and aligned with `saiko-design-decisions.md`

---

## Changes Made

### 1. ✅ Updated Action Trio Order
**Before**: [Website] [Directions] [Instagram]  
**After**: [Website] [Instagram] [Directions]

Added Tier 3 default state showing Call's position.

---

### 2. ✅ Updated Swap Rules Table
**Before**: Basic swap rules without Tier 3 context  
**After**: Complete swap rules showing Call's movement between Action Trio and Tier 3

| If missing... | Replace with... |
|---------------|-----------------|
| Instagram | Call swaps from Tier 3 to Action middle position |
| Instagram + Call | Two cards: Website + Directions (CSS Grid adjusts) |
| Website | Action Trio: IG + Directions; Call stays in Tier 3 |

---

### 3. ✅ Added Call Card Position Section
**New section** explaining Call's dual role:
- **Default**: Lives in Tier 3 (Hours + Map + Call)
- **When IG missing**: Swaps to Action middle position

Includes ASCII diagrams showing both states.

---

### 4. ✅ Updated Content Row Description
**Before**: "Two cards, equal height, side by side."  
**After**: "Default: Three cards (Hours + Map + Call). When Instagram missing: Two cards (Hours + Map)"

---

### 5. ✅ Updated Hours Card Status Section
**Before**: "Why no status pill: Open/Closed already in hero, redundant"  
**After**: 
- Status footer: "Open · Closes 11 PM" or "Closed · Opens 7 AM"
- Rationale: Hero shows binary status, footer adds actionable timing

---

### 6. ✅ Added Call Card Section
**New section** with full Call card specs:
- Layout: Vertical (icon above number)
- Visual specs: 32px icon, 14px Libre Baskerville
- Position: Tier 3 by default; swaps when IG missing
- Action: Opens phone dialer (tel: protocol)

---

### 7. ✅ Updated Visual Specs
Added Call card specifications:
- Padding: 20px
- Icon size: 32px, khaki
- Number font: Libre Baskerville, 14px

---

### 8. ✅ Updated Grid Layout Diagram
**Before**: Showed Hours + Map only (2 cards)  
**After**: Shows Hours + Map + Call (3 cards) with status footer in Hours

Added note: "When Instagram missing, Call swaps to Action Trio middle position"

---

### 9. ✅ Updated Edge Cases
**Before**: Incomplete scenarios  
**After**: Complete edge cases showing all swap behaviors:
- No website → IG + Directions in Actions, Call in Tier 3
- No Instagram → Call swaps to Actions
- No phone → Standard 3-card Actions, 2-card Tier 3
- No IG + no phone → 2-card Actions (wider), 2-card Tier 3

---

### 10. ✅ Added Files Hierarchy
**New section** clarifying documentation hierarchy:
1. `saiko-design-decisions.md` (single source of truth)
2. `saiko-bento-cards-spec.md` (detailed visual spec)
3. `docs/MERCHANT_PAGE_BENTO_GRID.md` (technical implementation)

---

### 11. ✅ Resolved Open Questions
**Before**: 3 open questions  
**After**: 2 resolved ✅, 1 still open ⚠️

1. Two-card fallback → ✅ RESOLVED (CSS Grid adjusts)
2. Call when IG available → ✅ RESOLVED (lives in Tier 3)
3. Irregular hours → ⚠️ OPEN (needs design decision)

---

### 12. ✅ Added Status Footer
Added last updated date and alignment status:
- Last Updated: February 7, 2026
- Status: Aligned with saiko-design-decisions.md

---

## Summary of Conflicts Resolved

### Conflict 1: Action Trio Order ✅
**Resolution**: Updated to [Website] [Instagram] [Directions]

### Conflict 2: Content Row Structure ✅
**Resolution**: Documented 3-card default (Hours + Map + Call) with swap logic

### Conflict 3: Hours Status Footer ✅
**Resolution**: Updated to show status footer provides actionable timing

---

## Alignment Status

| Aspect | Before | After |
|--------|--------|-------|
| Action order | ❌ Wrong | ✅ Correct |
| Call position | ❌ Missing | ✅ Documented |
| Hours status | ❌ Wrong rationale | ✅ Correct rationale |
| Swap logic | ⚠️ Incomplete | ✅ Complete |
| Edge cases | ⚠️ Incomplete | ✅ Complete |
| Visual specs | ✅ Correct | ✅ Enhanced |

---

## What Was Kept (Already Correct)

✅ Icon + value only (no labels)  
✅ Visual specs (24px icons, 13px font, 20px 16px padding)  
✅ Map card horizontal layout (120px preview + address)  
✅ Hours two-column grid  
✅ Hover effects (translateY + shadow)  
✅ Field Notes color palette  
✅ All typography specifications

---

## Files Now in Sync

1. ✅ `/Downloads/saiko-bento-cards-spec.md` (this file - updated)
2. ✅ `saiko-design-decisions.md` (single source of truth)
3. ✅ `/docs/MERCHANT_PAGE_BENTO_GRID.md` (technical spec)
4. ✅ `/docs/BENTO_CARD_DESIGN_PATTERNS.md` (quick reference)

---

## Next Steps

1. ✅ Spec aligned with design decisions
2. ⚠️ Implementation code needs visual spec updates (icon sizes, padding, etc.)
3. ⚠️ Map card layout needs change from vertical → horizontal
4. ⚠️ Irregular hours edge case needs design decision

---

**Status**: ✅ Complete - Spec now aligned with design decisions  
**Conflicts**: 0 remaining  
**Open Questions**: 1 (irregular hours format)
