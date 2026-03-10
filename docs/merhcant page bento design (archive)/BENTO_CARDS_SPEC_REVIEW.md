# Bento Cards Spec Review & Alignment Analysis

**Date**: February 7, 2026  
**Comparing**: `saiko-bento-cards-spec.md` (your design spec) vs. `MERCHANT_PAGE_BENTO_GRID.md` (current implementation docs)

---

## Executive Summary

### ✅ What Aligns:
1. Action Cards: Icon + value only (NO labels) ✅
2. Hours card: Two-column layout ✅
3. Map card: Opens Expanded Map View in Saiko ✅
4. Field Notes color palette and styling ✅

### ⚠️ Critical Conflicts:
1. **Action Trio Priority Order** — Spec differs from implementation
2. **Content Row Structure** — Spec shows Hours + Map only (2 cards), implementation has Hours + Map + Call (3 cards in tier3Row)
3. **Call Card Placement** — Spec says Call only in Action Trio, implementation has it in Tier 3 by default
4. **Swap Logic** — Different priority rules

---

## Detailed Conflict Analysis

### 1. ACTION TRIO PRIORITY ORDER

#### Your Spec Says:
```
DEFAULT:  [ Website ]  [ Directions ]  [ Instagram ]
```

Priority order:
1. Directions (always present)
2. Website (high priority)
3. Instagram (medium priority)
4. Call (fills in when IG missing)

#### Current Implementation Has:
```
DEFAULT:  [ Website ]  [ Instagram ]  [ Directions ]
```

Priority order:
1. Website
2. Instagram (social presence prioritized)
3. Directions

**Conflict**: Order is different — your spec puts Directions in middle, implementation has Instagram in middle.

---

### 2. CONTENT ROW STRUCTURE

#### Your Spec Says:
```
Content Row (2 cards):
┌──────────────────────┬──────────────────────┐
│        HOURS         │         MAP          │
└──────────────────────┴──────────────────────┘
```

**No Call card in Content Row. Call only appears in Action Trio.**

#### Current Implementation Has:
```
tier3Row (3 cards by default):
┌──────────────┬──────────┬────────┐
│    HOURS     │   MAP    │  CALL  │
└──────────────┴──────────┴────────┘
```

**Call appears in Tier 3 by default when Instagram is present.**

**Conflict**: Fundamental structural difference. Your spec treats Call as Action Trio-only. Implementation treats Call as Tier 3 by default, swapping to Actions only when IG is missing.

---

### 3. SWAP LOGIC COMPARISON

#### Your Spec:

| If missing... | Replace with... |
|---------------|-----------------|
| Instagram | Call takes IG slot (slot 3) |
| Website | Call takes slot 1 (if IG exists) |
| Instagram + Call | TBD |
| Instagram + Website | TBD |

#### Current Implementation:

| If missing... | Replace with... |
|---------------|-----------------|
| Instagram | Call swaps from Tier 3 to Action Cards middle position |

**Conflict**: 
- Your spec: Call is always in Action Trio, preferring slot 3 (IG position)
- Implementation: Call defaults to Tier 3, only swaps to Actions when IG missing

---

### 4. CALL CARD DEFAULT POSITION

#### Your Spec:
- **Call lives in Action Trio**
- Default shows: Website, Directions, Instagram
- When IG missing: Call takes IG's slot
- When Website missing: Call takes Website's slot (if IG exists)

#### Current Implementation:
- **Call lives in Tier 3 (Content Row)**
- Default shows: Hours + Map + Call
- When IG missing: Call swaps UP to Action Cards
- When IG present: Call stays in Tier 3

**Question for You**: Which behavior do you prefer?

**Option A (Your Spec)**: Call is always in top row (Action Trio), competing for slots  
**Option B (Implementation)**: Call has dedicated spot in Tier 3, only promoted to Actions when needed

---

### 5. HOURS CARD LAYOUT

#### Your Spec:
```
Two columns (4 days | 3 days):
Mon | Fri
Tue | Sat  
Wed | Sun
Thu |
```

#### Current Implementation:
```
Two columns (4 days | 3 days):
M  9-5 | F  9-9
T  9-5 | S  9-9
W  9-5 | Su Closed
Th 9-5 |
```

**Alignment**: ✅ Both use two-column layout with M-Th | F-Su split

**Minor Difference**: 
- Your spec: Full day names (Mon, Tue, Wed)
- Implementation: Abbreviations (M, T, W, Th, F, S, Su)

---

### 6. MAP CARD LAYOUT

#### Your Spec:
```
Horizontal layout:
┌──────────────────────┐
│ ┌────────┐           │
│ │ MAP    │ Address   │
│ │ 120px  │ Text      │
│ └────────┘           │
└──────────────────────┘
```

**Map preview**: 120px wide, left side  
**Address**: Right side, vertical center  
**Action**: Opens Expanded Map View in Saiko ✅

#### Current Implementation:
```
Vertical layout:
┌──────────────────────┐
│        MAP           │
│   ┌──────────┐       │
│   │  · · · · │       │
│   │  · ● · · │       │
│   │  · · · · │       │
│   └──────────┘       │
│                      │
│   Street Address     │
│   City, State        │
└──────────────────────┘
```

**Map preview**: Full width, top  
**Address**: Below map, centered  
**Action**: Opens Expanded Map View ✅

**Conflict**: Layout orientation — your spec is horizontal, implementation is vertical.

---

### 7. VISUAL SPECS COMPARISON

#### Action Card Specs:

| Attribute | Your Spec | Implementation | Status |
|-----------|-----------|----------------|--------|
| Icon size | 24×24px | 20px | ⚠️ Difference |
| Icon color | Khaki #C3B091 | Khaki #C3B091 | ✅ Match |
| Value font | Libre Baskerville 13px | 12px | ⚠️ Difference |
| Value color | Charcoal #36454F | Charcoal #36454F | ✅ Match |
| Padding | 20px 16px | 14px 12px | ⚠️ Difference |
| Gap | 10px | 6px | ⚠️ Difference |
| Border radius | 12px | 12px | ✅ Match |
| Hover | box-shadow + translateY(-1px) | background fade | ⚠️ Different effect |

#### Hours Card Specs:

| Attribute | Your Spec | Implementation | Status |
|-----------|-----------|----------------|--------|
| Day abbreviation | Mon, Tue (12px, weight 500) | M, T, W (10px) | ⚠️ Different |
| Time font | Libre Baskerville 11px | Libre Baskerville 11px | ✅ Match |
| Today highlight | rgba(195,176,145,0.18) bg | Bold text only | ⚠️ Different |
| Closed style | Italic, 50% opacity | Regular, 60% opacity | ⚠️ Slight difference |
| Status footer | None (hero shows status) | Status dot + text | ⚠️ Implementation adds footer |

#### Map Card Specs:

| Attribute | Your Spec | Implementation | Status |
|-----------|-----------|----------------|--------|
| Layout | Horizontal (map left, address right) | Vertical (map top, address bottom) | ⚠️ Different |
| Map width | 120px | Full width | ⚠️ Different |
| Pin color | #D64541 (coral) | #D64541 | ✅ Match |
| Pin size | 12px | 14px | ⚠️ Slight difference |
| Address font | Libre Baskerville 14px | Libre Baskerville 12px (street) | ⚠️ Different |

---

## Edge Cases Review

### Your Spec Lists:

| Scenario | Your Spec Behavior | Implementation |
|----------|-------------------|----------------|
| No website | Call → slot 1, Directions → slot 2, IG → slot 3 | IG stays in Actions, Call stays in Tier 3 |
| No Instagram | Call takes IG slot | ✅ Call swaps to Actions middle |
| No phone | Website, Directions, Instagram | ✅ Same (IG in Actions, no Call anywhere) |
| No IG + no phone | **TBD** (two cards? wider?) | Website, Directions only (2 cards) |
| No hours data | Map spans full width | ✅ tier3Row adjusts via CSS Grid |

---

## Open Questions from Your Spec

### 1. Two-card fallback
**Your Question**: If only Website + Directions (no IG, no Call), should they display as two wider cards or maintain three-column grid?

**Current Implementation**: Uses two wider cards (CSS Grid adjusts automatically)

**Recommendation**: Keep implementation behavior — cleaner than empty slot.

### 2. Call when both IG + Call available
**Your Question**: Should Call appear anywhere else on page if IG takes its slot?

**Current Implementation**: YES — Call stays in Tier 3 (Content Row) when IG is present

**This resolves your question!** Call has a dedicated home in Tier 3.

### 3. Irregular hours
**Your Question**: How to display "by appointment only" in two-column grid?

**Current Implementation**: Displays as text in first column, second column empty

**Needs Design**: Consider alternative layout for non-standard hours formats.

---

## Recommendations

### Option 1: Update Implementation to Match Your Spec (Bigger Changes)

**Changes needed**:
1. ✅ Keep Action Cards icon + value only (already matches)
2. 🔄 Reorder Action Trio: Website → Directions → Instagram
3. 🔄 Remove Call from Tier 3 (Content Row)
4. 🔄 Make Call exclusive to Action Trio
5. 🔄 Update swap logic to prioritize Call in Action Trio slots
6. 🔄 Change Map card to horizontal layout (map left, address right)
7. 🔄 Adjust visual specs (icon size 24px, padding 20px 16px, etc.)
8. 🔄 Add hover translateY effect
9. 🔄 Add today highlight background to Hours card
10. 🔄 Remove status footer from Hours card

**Pros**: Matches your locked spec exactly  
**Cons**: Significant refactor, removes Call from dedicated Tier 3 spot

---

### Option 2: Update Your Spec to Match Implementation (Smaller Changes)

**Changes needed**:
1. ✅ Keep Action Cards icon + value only (already matches)
2. 🔄 Update Action Trio order: Website → Instagram → Directions
3. 🔄 Add Call card to Content Row (Hours + Map + Call = 3 cards)
4. 🔄 Document that Call defaults to Tier 3, swaps to Actions only when IG missing
5. 🔄 Update swap logic: "If IG missing, Call swaps from Tier 3 to Action middle position"
6. 🔄 Change Map card layout to vertical (map top, address bottom)
7. 🔄 Adjust visual specs to match implementation (icon 20px, etc.)
8. 🔄 Document status footer in Hours card
9. ✅ Resolve "Call when both IG + Call available" question (it goes to Tier 3)

**Pros**: Minimal code changes, Call has dedicated home in Tier 3  
**Cons**: Your locked spec needs updates

---

### Option 3: Hybrid Approach (Recommended)

**Keep from your spec**:
- ✅ Icon + value only (NO labels)
- ✅ Two-column Hours layout
- ✅ Field Notes aesthetic
- ✅ Expanded Map View action
- 🔄 Action Trio order: Website → Directions → Instagram (your order makes more sense)
- 🔄 Horizontal Map card layout (more compact, better use of space)
- 🔄 Larger icons (24px) and refined padding (20px 16px)
- 🔄 Hover translateY effect

**Keep from implementation**:
- ✅ Call in Tier 3 by default (gives it dedicated home)
- ✅ Swap logic: Call moves to Actions only when IG missing
- ✅ tier3Row structure (3 cards: Hours + Map + Call)
- ✅ Status footer in Hours card (useful context)

**Result**: Best of both worlds — your design vision with practical Call placement.

---

## Critical Decision Points

### Decision 1: Action Trio Order
**A**: Website → Directions → Instagram (your spec)  
**B**: Website → Instagram → Directions (implementation)

**My Recommendation**: **A** — Directions in middle makes more sense (most actionable item between two informational items)

### Decision 2: Call Card Home
**A**: Call exclusive to Action Trio (your spec)  
**B**: Call defaults to Tier 3, swaps to Actions when needed (implementation)

**My Recommendation**: **B** — Call benefits from dedicated spot in Tier 3, especially when IG is present. Tier 3 becomes "Contact & Location" (Hours + Map + Call).

### Decision 3: Map Card Layout
**A**: Horizontal: map left (120px), address right (your spec)  
**B**: Vertical: map top (full width), address bottom (implementation)

**My Recommendation**: **A** — More compact, better use of space, especially in Tier 3 with 3 cards.

### Decision 4: Content Row Structure
**A**: 2 cards (Hours + Map) — Call always in Action Trio (your spec)  
**B**: 3 cards (Hours + Map + Call) — Call swaps when needed (implementation)

**My Recommendation**: **B** — More consistent, Call doesn't compete for Action Trio slots unnecessarily.

---

## Next Steps

1. **You decide**: Which recommendations to adopt
2. **I'll update**: Both implementation AND documentation to match your decisions
3. **We align**: All three docs (spec, implementation, design patterns) to single source of truth

**What do you want to do?**

---

## Files to Update (Based on Your Decisions)

- `/Users/bobbyciccaglione/Downloads/saiko-bento-cards-spec.md` (your design spec)
- `/Users/bobbyciccaglione/saiko-maps/docs/MERCHANT_PAGE_BENTO_GRID.md` (implementation spec)
- `/Users/bobbyciccaglione/saiko-maps/app/(viewer)/place/[slug]/page.tsx` (actual code)
- `/Users/bobbyciccaglione/saiko-maps/app/(viewer)/place/[slug]/place.module.css` (styles)

Let me know your decisions and I'll make it happen! 🎯
