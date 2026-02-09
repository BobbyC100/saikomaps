# Design Decisions Alignment Analysis

**Date**: February 7, 2026  
**Source**: `saiko-design-decisions.md` (Single Source of Truth)  
**Comparing against**: Current implementation + documentation

---

## Executive Summary

Your design decisions doc **resolves most conflicts** and provides clear direction! Here's the status:

### ✅ What's Already Aligned:
1. Action Cards: Icon + value only (NO labels)
2. Call swap logic (matches our recommended Option B)
3. Action Card order: [Website] [Instagram] [Directions]
4. Call defaults to Tier 3, swaps to Actions when IG missing
5. Directions opens native maps, Map card opens Expanded View in Saiko

### ⚠️ Implementation Updates Needed:
1. **Visual specs** (icon size, padding, fonts) - implementation uses smaller values
2. **Map card layout** - implementation is vertical, design doc specifies horizontal
3. **Hours card** - implementation has status footer, design doc says no status pill
4. **Today highlight** - design doc specifies background color, implementation uses bold text only

---

## Detailed Comparison

### 1. ACTION CARDS STRUCTURE ✅

**Design Decisions Doc**:
```
Icon + value only — NO LABELS
Value is the label. URL = website, address = directions, @handle = social, phone = call.
```

**Current Docs**: ✅ Aligned  
**Implementation**: ✅ Aligned

**Status**: ✅ GOOD - Everyone agrees on this

---

### 2. CALL SWAP LOGIC ✅

**Design Decisions Doc**:
```
When Instagram IS available:
  Action Cards:  [ Website ]  [ Instagram ]  [ Directions ]
  Tier 3:        [ Hours ]    [ Map ]        [ Call ]

When Instagram is NOT available:
  Action Cards:  [ Website ]  [ Call ]  [ Directions ]
  Tier 3:        [ Hours ]    [ Map ]
```

**Current Docs**: ✅ Aligned  
**Implementation**: ✅ Aligned

**Status**: ✅ GOOD - This resolves the conflict! Implementation already does this correctly.

---

### 3. ACTION CARD ORDER ✅

**Design Decisions Doc**: [Website] [Instagram] [Directions]  
**Current Docs**: ✅ Aligned  
**Implementation**: ✅ Aligned

**Status**: ✅ GOOD - Matches implementation

**Note**: This differs from `saiko-bento-cards-spec.md` which had Directions in middle position. Design decisions doc supersedes.

---

### 4. VISUAL SPECS ⚠️

#### Action Card Specs:

| Property | Design Decisions | Implementation | Status |
|----------|------------------|----------------|--------|
| Icon size | 24×24px | 20px | ⚠️ Update needed |
| Icon color | Khaki #C3B091 | Khaki #C3B091 | ✅ Match |
| Value font | Libre Baskerville 13px | 12px | ⚠️ Update needed |
| Padding | 20px 16px | 14px 12px | ⚠️ Update needed |
| Gap | (not specified) | 6px | ℹ️ Add to spec |
| Border radius | 12px | 12px | ✅ Match |
| Hover | box-shadow + translateY(-1px) | background fade | ⚠️ Update needed |

#### Hours Card Specs:

| Property | Design Decisions | Implementation | Status |
|----------|------------------|----------------|--------|
| Day abbreviation | 12px, weight 500 (700 today) | 10px | ⚠️ Update needed |
| Time font | Libre Baskerville 11px | 11px | ✅ Match |
| Today highlight | rgba(195,176,145,0.18) bg | Bold text only | ⚠️ Update needed |
| **Hours status** | Status footer with "Open · Closes 11 PM" or "Closed · Opens 7 AM" | Has status footer | ✅ Match | Hero shows binary status; footer shows actionable timing |

#### Map Card Specs:

| Property | Design Decisions | Implementation | Status |
|----------|------------------|----------------|--------|
| Layout | Horizontal (preview + address) | Vertical | ⚠️ Update needed |
| Preview width | 120px | Full width | ⚠️ Update needed |
| Pin color | #D64541 | #D64541 | ✅ Match |

**Action Required**: Update implementation to match design decisions doc specs

---

### 5. TIER 3 STRUCTURE ✅

**Design Decisions Doc**:
- Hours (two-column grid)
- Map (horizontal: preview + address)
- Call (icon + number)

**Current Docs**: ✅ Aligned (documented correctly)  
**Implementation**: ⚠️ Map layout needs update (currently vertical)

---

### 6. DIRECTIONS vs MAP ✅

**Design Decisions Doc**:
```
Directions = external native maps
Map = in-app Expanded Map View
Different use cases: "get me there" vs "explore the area"
```

**Current Docs**: ✅ Aligned  
**Implementation**: ✅ Aligned

**Status**: ✅ GOOD - Clear distinction documented and implemented

---

### 7. HOURS CARD STATUS ✅

**Design Decisions Doc** (UPDATED):
```
Hours status: Status footer with "Open · Closes 11 PM" or "Closed · Opens 7 AM"
Hero shows binary status; footer shows actionable timing
```

**Current Implementation**: Has status footer with dot + "Open · Closes 11 PM"

**Rationale**: Hero shows simple Open/Closed state. Hours card footer adds actionable context (when it closes/opens).

**Status**: ✅ KEEP status footer - provides additional value

---

## Implementation Update Checklist

### High Priority (Visual Alignment):

- [ ] **Action Cards**:
  - [ ] Update icon size: 20px → 24px
  - [ ] Update value font: 12px → 13px (Libre Baskerville)
  - [ ] Update padding: 14px 12px → 20px 16px
  - [ ] Update hover effect: background fade → box-shadow + translateY(-1px)

- [ ] **Hours Card**:
  - [ ] Update day abbreviation: 10px → 12px
  - [ ] Add today highlight background: rgba(195,176,145,0.18)
  - [ ] ✅ **Keep status footer** (provides actionable timing context)
  - [ ] Update day weight: 700 for today (currently uses separate class)

- [ ] **Map Card**:
  - [ ] Change layout: Vertical → Horizontal
  - [ ] Resize map preview: Full width → 120px wide
  - [ ] Position address: Below map → Right side of map
  - [ ] Ensure Field Notes grid lines on preview

### Medium Priority (Documentation):

- [ ] Update `MERCHANT_PAGE_BENTO_GRID.md` with correct visual specs
- [ ] Add gap values to design decisions doc (currently missing)
- [ ] Document card hover states in detail
- [ ] Add mobile breakpoint specs to design decisions doc

### Low Priority (Clean Up):

- [ ] Mark `saiko-bento-cards-spec.md` as superseded by design decisions doc
- [ ] Update `BENTO_CARD_DESIGN_PATTERNS.md` to match visual specs
- [ ] Remove or archive superseded HTML concepts per design decisions doc

---

## Files That Need Updates

### Code Files (Implementation):
1. `/app/(viewer)/place/[slug]/page.tsx` - Remove Hours status footer
2. `/app/(viewer)/place/[slug]/place.module.css` - Update all visual specs
3. Component structure may need adjustment for horizontal Map card

### Documentation Files:
1. `/docs/MERCHANT_PAGE_BENTO_GRID.md` - Update visual specs section
2. `/docs/BENTO_CARD_DESIGN_PATTERNS.md` - Update visual reference
3. `/docs/BENTO_CARDS_SPEC_REVIEW.md` - Mark as resolved by design decisions doc

---

## Resolved Conflicts

Your design decisions doc **resolves** these conflicts we identified earlier:

### ✅ Call Placement
**Was**: Two competing specs (Call in Actions vs Call in Tier 3)  
**Now**: **Clear** - Call defaults to Tier 3, swaps to Actions only when IG missing  
**Source**: Design decisions doc, Merchant Page Bento Grid section

### ✅ Action Card Order
**Was**: Directions in middle (bento-cards-spec) vs IG in middle (implementation)  
**Now**: **Clear** - [Website] [Instagram] [Directions]  
**Source**: Design decisions doc Call Swap Logic diagrams

### ✅ Directions vs Map Actions
**Was**: Unclear which opened what  
**Now**: **Clear** - Directions = native maps (external), Map = Expanded View (in-app)  
**Source**: Design decisions doc Locked Decisions table

---

## Open Questions

### 1. Hours Card Status Footer ✅
**Design doc now says**: Status footer with "Open · Closes 11 PM" or "Closed · Opens 7 AM"  
**Implementation has**: Status footer ✅ Correct

**Rationale**: Hero shows binary status (Open/Closed), footer adds actionable timing (when it closes/opens).

**Resolution**: ✅ Keep implementation as-is - provides value beyond hero status.

### 2. Map Card in Mobile
**Design doc spec**: Horizontal layout (120px preview + address)  
**Mobile consideration**: Does this horizontal layout work on mobile, or should it stack vertically on small screens?

**Recommendation**: Keep horizontal even on mobile (120px is reasonable), but allow address to wrap.

### 3. Gap Between Icon and Value
**Design doc**: Doesn't specify  
**Implementation**: 6px  
**Your bento-cards-spec**: 10px

**Recommendation**: Add to design decisions doc - which do you prefer?

---

## Next Steps

### Immediate:
1. **You confirm**: Are the visual specs in design decisions doc the final values?
2. **I'll update**: Implementation code to match all specs
3. **I'll align**: All documentation to reference design decisions doc as source of truth

### CSS Updates Needed:
```css
/* Action Cards */
.actionIcon {
  width: 24px;   /* was 20px */
  height: 24px;  /* was 20px */
}

.actionDetail {
  font-size: 13px;  /* was 12px */
}

.actionCard {
  padding: 20px 16px;  /* was 14px 12px */
}

.actionCard:hover {
  box-shadow: 0 4px 20px rgba(139,115,85,0.12);
  transform: translateY(-1px);  /* was: background fade */
}

/* Hours Card */
.hoursRowDay {
  font-size: 12px;  /* was 10px */
}

.hoursRow.hoursRowToday {
  background: rgba(195, 176, 145, 0.18);  /* NEW */
  font-weight: 700;
}

/* Keep hoursStatusFooter - provides actionable timing context */

/* Map Card - NEW LAYOUT */
.mapCard {
  display: flex;
  flex-direction: row;  /* was: column */
  gap: 16px;
}

.mapTileStyled {
  width: 120px;  /* was: 100% */
  flex-shrink: 0;
}

.mapAddressBlock {
  text-align: left;  /* was: center */
  flex: 1;
}
```

---

## Source of Truth Hierarchy

Going forward, reference order:

1. **`saiko-design-decisions.md`** ← Single source of truth (THIS FILE)
2. **Production code** ← When design decisions silent on detail
3. **`MERCHANT_PAGE_BENTO_GRID.md`** ← Implementation technical spec (should match #1)
4. ~~`saiko-bento-cards-spec.md`~~ ← Superseded by design decisions doc

---

## Summary

**Good News**: Your design decisions doc confirms most of what we documented! The main work is:

✅ Logic & behavior → Already correct  
⚠️ Visual specs → Need updates (font sizes, padding, layout)  
⚠️ Hours status footer → Remove (redundant)  
⚠️ Map layout → Change to horizontal

**Ready to proceed?** I can update the implementation to match your design decisions doc exactly. Just confirm these visual specs are final and I'll make it happen.

---

**Status**: ✅ Conflicts resolved by design decisions doc  
**Next**: Update implementation to match locked visual specs  
**Awaiting**: Your confirmation to proceed with updates
