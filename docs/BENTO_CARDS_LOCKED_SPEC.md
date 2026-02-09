# Bento Cards Spec - LOCKED AND READY FOR BUILD

**Date**: February 7, 2026  
**Status**: ✅ LOCKED - All specifications finalized

---

## Final Status

### ✅ All Open Questions Resolved

1. ✅ **Two-card fallback** — CSS Grid adjusts to two wider cards
2. ✅ **Call when IG available** — Call lives in Tier 3 by default
3. ✅ **Irregular hours** — "Hours vary" + "View on Google →" fallback

### ✅ All Conflicts Resolved

1. ✅ **Action Trio order** — [Website] [Instagram] [Directions]
2. ✅ **Call placement** — Tier 3 default, swaps to Actions when IG missing
3. ✅ **Hours status** — Status footer provides actionable timing
4. ✅ **Content Row structure** — 3 cards (Hours + Map + Call) by default

### ✅ All Documentation Aligned

1. ✅ `saiko-bento-cards-spec.md` — Detailed visual/interaction spec
2. ✅ `saiko-design-decisions.md` — Single source of truth
3. ✅ `MERCHANT_PAGE_BENTO_GRID.md` — Technical implementation guide
4. ✅ `BENTO_CARD_DESIGN_PATTERNS.md` — Quick reference

---

## Final Specifications

### Action Cards (Tier 1)

**Layout**: 3 equal cards  
**Design**: Icon + value only (NO labels)  
**Order**: [Website] [Instagram] [Directions]

**Visual Specs**:
- Icon: 24×24px, khaki (#C3B091)
- Value: Libre Baskerville, 13px, charcoal (#36454F)
- Padding: 20px 16px
- Gap: 10px
- Hover: box-shadow + translateY(-1px)

**Swap Logic**:
- Instagram present: Standard order, Call in Tier 3
- Instagram missing: [Website] [Call] [Directions], Tier 3 = Hours + Map

---

### Hours Card (Tier 3)

**Layout**: Two-column grid (M-Th | F-Su) + status footer

**Regular Hours**:
- Day: 12px, charcoal, weight 500 (700 for today)
- Time: Libre Baskerville, 11px
- Today highlight: rgba(195,176,145,0.18) background
- Status footer: "Open · Closes 11 PM" or "Closed · Opens 7 AM"

**Irregular Hours Fallback**:
```
┌──────────────────────────────────┐
│            HOURS                 │
│                                  │
│         Hours vary               │
│      View on Google →            │
│                                  │
└──────────────────────────────────┘
```

- "Hours vary": Libre Baskerville italic, 13px, charcoal, centered
- "View on Google →": 10px uppercase, khaki, letter-spacing 1px, centered
- Links to Google Maps listing
- Use when: "by appointment only", seasonal hours, or any non-standard format

---

### Map Card (Tier 3)

**Layout**: Horizontal (preview left, address right)

**Map Preview**:
- 120px wide, fills card height
- Field Notes grid lines (rgba(195,176,145,0.15), 20px spacing)
- Red pin centered (#D64541, 12px, white border)
- Rounded corners (8px)

**Address**:
- Street: Libre Baskerville, 14px, charcoal
- City/State/Zip: 11px, leather tone

**Action**: Opens Expanded Map View in Saiko (NOT external maps)

---

### Call Card (Tier 3)

**Layout**: Vertical (icon above number)

**Visual Specs**:
- Icon: Phone, 32px, khaki
- Number: Libre Baskerville, 14px, charcoal
- Padding: 20px
- Centered content

**Position**: 
- Default: Tier 3 (Hours + Map + Call)
- When IG missing: Swaps to Action Trio middle position

**Action**: Opens phone dialer (tel: protocol)

---

## Edge Cases - All Documented

| Scenario | Behavior |
|----------|----------|
| No website | Action: IG + Directions; Tier 3: Hours + Map + Call |
| No Instagram | Action: Website + Call + Directions; Tier 3: Hours + Map |
| No phone | Action: Website + IG + Directions; Tier 3: Hours + Map |
| No IG + no phone | Action: Website + Directions (2 wider); Tier 3: Hours + Map |
| No hours | Tier 3: Map + Call (or just Map if Call in Actions) |
| Irregular hours | Hours card shows "Hours vary" + Google link |
| No address | Not possible (required field) |

---

## Implementation Checklist

### Phase 1: Core Structure ✅
- [x] Action Trio order documented
- [x] Call swap logic documented
- [x] Tier 3 structure documented
- [x] All visual specs defined

### Phase 2: Hours Card
- [ ] Implement two-column grid layout
- [ ] Add today highlight background
- [ ] Add status footer
- [ ] Implement irregular hours fallback
- [ ] Add "View on Google →" link

### Phase 3: Visual Polish
- [ ] Update icon sizes (20px → 24px)
- [ ] Update font sizes (12px → 13px for values)
- [ ] Update padding (14px 12px → 20px 16px)
- [ ] Implement hover translateY effect
- [ ] Add today highlight background to Hours

### Phase 4: Map Card
- [ ] Change layout from vertical → horizontal
- [ ] Resize preview: full width → 120px
- [ ] Position address on right side
- [ ] Ensure Field Notes grid lines visible

### Phase 5: Call Card
- [ ] Implement swap logic (IG present/missing)
- [ ] Style for both contexts (Action Card + Tier 3)
- [ ] Test tel: protocol on mobile/desktop

### Phase 6: Edge Cases
- [ ] Test all missing data scenarios
- [ ] Verify CSS Grid graceful degradation
- [ ] Test irregular hours display
- [ ] Verify all links work correctly

---

## Files Ready for Implementation

### Design Specs:
✅ `/Downloads/saiko-bento-cards-spec.md` — Detailed visual/interaction spec (LOCKED)  
✅ `saiko-design-decisions.md` — Single source of truth (LOCKED)

### Implementation Guides:
✅ `/docs/MERCHANT_PAGE_BENTO_GRID.md` — Technical spec with code examples  
✅ `/docs/BENTO_CARD_DESIGN_PATTERNS.md` — Quick reference

### Implementation Targets:
- `/app/(viewer)/place/[slug]/page.tsx` — Main component
- `/app/(viewer)/place/[slug]/place.module.css` — Styles

---

## Color Palette (Field Notes)

```css
--fn-parchment: #F5F0E1  /* Page background */
--fn-white: #FFFDF7      /* Card background */
--fn-khaki: #C3B091      /* Accent/labels */
--fn-charcoal: #36454F   /* Text */
--fn-sage: #4A7C59       /* Open status */
--fn-coral: #D64541      /* Map pin */
--fn-blue: #89B4C4       /* Links */
```

---

## Typography

- **Place name**: Libre Baskerville, 32px, italic
- **Action card value**: Libre Baskerville, 13px
- **Hours time**: Libre Baskerville, 11px
- **"Hours vary"**: Libre Baskerville, 13px, italic
- **Map address**: Libre Baskerville, 14px (street), 11px (city)
- **Call number**: Libre Baskerville, 14px
- **Labels**: System sans, 9px uppercase, letter-spacing 2.5px

---

## Success Criteria

✅ All Action Cards show icon + value only (no labels)  
✅ Action Trio maintains 3 cards always  
✅ Call swaps correctly based on IG availability  
✅ Hours shows 2-column grid with status footer  
✅ Irregular hours shows "Hours vary" fallback  
✅ Map card is horizontal (120px preview + address)  
✅ All visual specs match design decisions  
✅ All edge cases handled gracefully  
✅ Mobile responsive (single column stack)  
✅ Field Notes aesthetic maintained throughout

---

**STATUS**: ✅ LOCKED AND READY FOR BUILD  
**OPEN QUESTIONS**: 0  
**CONFLICTS**: 0  
**ALIGNMENT**: 100%

**BEGIN IMPLEMENTATION** 🚀
