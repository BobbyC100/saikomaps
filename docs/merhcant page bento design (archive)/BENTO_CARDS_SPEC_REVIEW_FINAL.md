# Bento Cards Spec Review (saiko-bento-cards-spec.md)

**Date**: February 7, 2026  
**Status**: Superseded by `saiko-design-decisions.md`  
**Comparing**: This spec vs. Design Decisions Doc (single source of truth)

---

## Executive Summary

This spec document has **3 critical conflicts** with the design decisions doc and **2 resolved questions**. Most of it is correct, but some key details differ from the locked design decisions.

### Status:
- ✅ 70% Aligned
- ⚠️ 20% Conflicts (needs updates)
- ✅ 10% Questions Resolved

---

## Critical Conflicts

### 🔴 1. ACTION TRIO ORDER

**This Spec Says**:
```
[ Website ]  [ Directions ]  [ Instagram ]
```

**Design Decisions Doc Says**:
```
[ Website ]  [ Instagram ]  [ Directions ]
```

**Conflict**: **Instagram and Directions positions are swapped**

**Resolution**: Update this spec to match design decisions: [Website] [Instagram] [Directions]

---

### 🔴 2. CONTENT ROW STRUCTURE

**This Spec Says**:
```
Content Row: Hours + Map (2 cards)
```

**Design Decisions Doc Says**:
```
Tier 3: Hours + Map + Call (3 cards)
When IG missing: Call swaps to Action Cards, leaving Hours + Map
```

**Conflict**: This spec treats Content Row as always 2 cards. Design decisions doc has Call in Tier 3 by default.

**Resolution**: Update this spec:
- Default: Hours + Map + Call (3 cards in tier3Row)
- When IG missing: Call moves to Actions, tier3Row becomes Hours + Map (2 cards)

---

### 🔴 3. HOURS CARD STATUS

**This Spec Says** (line 89-90):
> "Why no status pill: Open/Closed status already appears in the hero meta row. Repeating it in the Hours card is redundant."

**Design Decisions Doc Says**:
> "Hours status: Status footer with 'Open · Closes 11 PM' or 'Closed · Opens 7 AM'  
> Hero shows binary status; footer shows actionable timing"

**Conflict**: This spec says NO status in Hours card. Design decisions doc says YES status footer (different purpose than hero).

**Resolution**: Update this spec - Hours card DOES have status footer for actionable timing.

---

## What Aligns ✅

### ✅ Icon + Value Only
**Both docs agree**: No labels on Action Cards, value is the label.

**Status**: ✅ Perfect alignment

---

### ✅ Call Swap Logic (Partially)
**This spec** (line 48): "If Instagram missing → Call takes IG slot"  
**Design decisions**: "When IG missing, Call swaps to Action Cards middle position"

**Status**: ✅ Core logic matches (Call swaps when IG missing)

**Minor difference**: This spec doesn't mention Call's default home in Tier 3

---

### ✅ Directions vs Map Actions
**This spec** (line 108): "Opens Expanded Map View within Saiko (not external maps)"  
**Design decisions**: Same

**Status**: ✅ Perfect alignment

---

### ✅ Visual Specs (Action Cards)
| Property | This Spec | Design Decisions | Status |
|----------|-----------|------------------|--------|
| Icon size | 24×24px | 24×24px | ✅ Match |
| Icon color | Khaki #C3B091 | Khaki #C3B091 | ✅ Match |
| Value font | Libre Baskerville 13px | Libre Baskerville 13px | ✅ Match |
| Padding | 20px 16px | 20px 16px | ✅ Match |
| Hover | translateY(-1px) + shadow | translateY(-1px) + shadow | ✅ Match |
| Gap | 10px | Not specified | ℹ️ Add to design decisions |

**Status**: ✅ Excellent alignment on visual specs

---

### ✅ Map Card Layout
**This spec** (line 96): "Horizontal — map preview on left, address on right"  
**Design decisions**: "Horizontal (preview + address)"

**Status**: ✅ Perfect alignment

**Map specs**:
- 120px wide ✅
- Field Notes grid lines ✅
- Red pin #D64541 ✅

---

### ✅ Hours Card Layout
**This spec**: Two-column grid (Mon-Thu | Fri-Sun)  
**Design decisions**: Two-column grid

**Status**: ✅ Perfect alignment

**Hours specs**:
- Day abbreviation: 12px ✅
- Today highlight: rgba(195,176,145,0.18) ✅
- Libre Baskerville 11px for times ✅

---

## Resolved Questions ✅

### Question 1: Two-card fallback (line 193)
**Question**: "If only Website + Directions (no IG, no Call), should they display as two wider cards?"

**Answer from Design Decisions**: YES - CSS Grid adjusts automatically to fill space with remaining cards

**Resolution**: ✅ Resolved - two wider cards

---

### Question 2: Call when IG available (line 195)
**Question**: "Should Call appear anywhere else on the page, or is Action Trio the only home for it?"

**Answer from Design Decisions**: YES - Call has dedicated home in Tier 3 (Hours + Map + Call)

**Resolution**: ✅ Resolved - Call lives in Tier 3 by default

---

### Question 3: Irregular hours (line 197)
**Question**: "What if hours are 'by appointment only'?"

**Answer**: Not explicitly addressed in design decisions doc

**Resolution**: ⚠️ Still open - needs design decision

---

## Updates Needed

### 1. Update Action Trio Order (Line 40-42)
```diff
- [ Website ]  [ Directions ]  [ Instagram ]
+ [ Website ]  [ Instagram ]  [ Directions ]
```

### 2. Update Content Row Description (Line 67-69)
```diff
- Two cards, equal height, side by side.
+ Default: Three cards (Hours + Map + Call)
+ When Instagram missing: Two cards (Hours + Map), Call moves to Action Trio
```

### 3. Update Hours Card Status Section (Line 89-90)
```diff
- **Why no status pill:**
- Open/Closed status already appears in the hero meta row. Repeating it in the Hours card is redundant.

+ **Status Footer:**
+ Shows "Open · Closes 11 PM" or "Closed · Opens 7 AM"
+ Hero shows binary status; footer adds actionable timing (when it closes/opens)
```

### 4. Update Swap Rules Table (Line 46-51)
```diff
| If missing... | Replace with... |
|---------------|-----------------|
| Instagram | Call (swaps from Tier 3 to Action middle position) |
- | Instagram + Call | Website takes full width? Or show two cards? TBD |
+ | Instagram + Call | Two cards: Website + Directions (CSS Grid adjusts) |
| Website | Call stays in Tier 3 with Hours + Map |
```

### 5. Update Edge Cases (Line 173-174)
```diff
- | No website | Call moves to slot 1, Directions slot 2, IG slot 3 |
+ | No website | Action Trio: IG + Directions (2 cards), Call stays in Tier 3 |
```

### 6. Add Tier 3 Default State
**Add new section after line 63**:

```markdown
### Call Card Position

**Default (Instagram present)**:
- Action Trio: Website | Instagram | Directions
- Tier 3: Hours | Map | Call

**When Instagram missing**:
- Action Trio: Website | Call | Directions  
- Tier 3: Hours | Map

This ensures:
1. Action Trio always has 3 cards
2. Call has dedicated home in Tier 3 when IG available
3. Call serves as IG backup when needed
```

### 7. Update Grid Layout Diagram (Line 146-165)
Add Call card to Content Row in default state:

```
┌──────────────────────┬──────────────────────┬──────────────┐
│        HOURS         │         MAP          │     CALL     │
│  Mon  Closed         │  ┌────────┐          │   ☎          │
│  Tue  Closed         │  │ · · · ·│ 2710 E   │ (562)        │
│  Wed  5–10           │  │ · ● · ·│ 4th St   │ 343-1881     │
│  Thu  5–10           │  │ · · · ·│ Long     │              │
│                      │  └────────┘ Beach    │              │
└──────────────────────┴──────────────────────┴──────────────┘
```

---

## Files Reference

**This spec mentions**:
- `saiko-bento-final.html` - HTML/CSS reference

**Design decisions doc references**:
- `docs/MERCHANT_PAGE_BENTO_GRID.md` - Technical implementation spec (source of truth)
- Production code - Actual implementation

**Recommendation**: Update this spec to reference design decisions doc as primary source.

---

## Overall Assessment

### Strengths:
✅ Visual specs are accurate and detailed  
✅ Icon + value philosophy well articulated  
✅ Map card layout correct (horizontal)  
✅ Hours card layout correct (two-column)  
✅ Most swap logic correct

### Weaknesses:
⚠️ Action Trio order wrong (IG ↔ Directions swapped)  
⚠️ Missing Call's Tier 3 default position  
⚠️ Hours status footer incorrectly marked as "no status"  
⚠️ Edge cases incomplete

### Recommendation:
**UPDATE this spec** to align with design decisions doc, then mark design decisions doc as single source of truth. This spec can serve as detailed visual reference once conflicts are resolved.

---

## Suggested Spec Hierarchy

Going forward:

1. **`saiko-design-decisions.md`** ← Single source of truth (all locked decisions)
2. **`saiko-bento-cards-spec.md`** (this file) ← Detailed visual/interaction spec (once updated)
3. **`docs/MERCHANT_PAGE_BENTO_GRID.md`** ← Technical implementation guide
4. **Production code** ← What's actually built

All should reference design decisions doc for any conflicts.

---

**Status**: ⚠️ Needs updates to align with design decisions  
**Priority**: Medium (works as visual reference but has 3 critical conflicts)  
**Next Step**: Update lines 40-42, 67-69, 89-90, and add Tier 3 Call documentation
