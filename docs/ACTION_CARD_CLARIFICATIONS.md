# Action Card & Tier 3 Clarifications - Update Log

**Date**: February 7, 2026 (Second Update)  
**Context**: Clarifications requested before design review

---

## Changes Made

### 1. ✅ Action Card Labels REMOVED

**OLD Design**:
```
┌─────────┐
│  Icon   │
│ Label   │  ← REMOVED
│ Value   │
└─────────┘
```

**NEW Design**:
```
┌─────────┐
│  Icon   │
│ Value   │  ← Only icon + value now
└─────────┘
```

**Impact**: Cleaner, more minimal design. Icon + value only.

---

### 2. ✅ Action Card Swap Logic Documented

**Scenario A: Instagram Present (Default)**
```
Action Cards:  [Website 🌐] [Instagram 📷] [Directions 📍]
Tier 3 Row:    [Hours]       [Map]          [Call ☎️]
```

**Scenario B: Instagram Missing (Call Swaps Up)**
```
Action Cards:  [Website 🌐] [Call ☎️]       [Directions 📍]
Tier 3 Row:    [Hours]       [Map]
```

**Rationale**: 
- Action Cards row should always have 3 cards
- Instagram presence is prioritized (social > phone)
- When Instagram unavailable, Call becomes primary contact method
- Ensures consistent visual rhythm in Action Cards row

---

### 3. ✅ Action Card Behaviors Clarified

| Card | Action | Target | Notes |
|------|--------|--------|-------|
| **Website** | Opens merchant website or Google Maps listing | `_blank` | Falls back to GMaps if no website |
| **Instagram** | Opens @handle on Instagram | `_blank` | Direct link to profile |
| **Call** | Initiates phone call | `tel:` protocol | Only appears when IG missing |
| **Directions** | Opens **native maps app** | System default | Apple Maps (iOS), Google Maps (other) |

**Key Distinction**:
- **Directions Card** → Opens external native maps (for navigation)
- **Map Card** (Tier 3) → Opens Expanded Map View in Saiko (for exploration)

---

### 4. ✅ Tier 3 Layout Variations

**Configuration 1: Instagram Present (3 cards)**
```css
.tier3Row {
  grid-template-columns: 1.2fr 1fr 0.8fr;
  /* Hours     Map   Call */
}
```

**Configuration 2: Instagram Missing, Call in Actions (2 cards)**
```css
.tier3Row {
  grid-template-columns: 1.2fr 1fr;
  /* Hours     Map   */
}
```

**Configuration 3: No Hours (2 cards)**
```css
.tier3Row.noHours {
  grid-template-columns: 1fr 0.8fr;
  /* Map   Call */
}
```

**Configuration 4: Only Map (1 card)**
```css
.tier3Row.onlyMap {
  grid-template-columns: 1fr;
  /* Map */
}
```

---

### 5. ✅ Map Card Action Documented

**What it does**: Opens **Expanded Map View in Saiko**
- Full interactive map
- Centered on current location
- Shows other nearby places from same map/collection
- Stays within Saiko app (does not open external maps)

**Why separate from Directions**:
- **Map Card**: Exploration within Saiko ecosystem
- **Directions Card**: Navigation in native maps app
- Different use cases, different behaviors

---

## Files Updated

1. **`docs/MERCHANT_PAGE_BENTO_GRID.md`**
   - Removed labels from Action Cards design spec
   - Added swap logic section
   - Documented all action card behaviors
   - Clarified Map card action (Expanded Map View)
   - Updated Tier 3 layout variations

2. **`docs/BENTO_CARD_DESIGN_PATTERNS.md`**
   - Updated Action Cards visual pattern (no labels)
   - Added swap logic diagrams
   - Documented action behaviors
   - Added decision tree for Call placement
   - Clarified Directions vs Map card actions

---

## Design Implications

### For Action Cards Design:
- Remove label text ("Website", "Instagram", "Directions")
- Focus on clear, recognizable icons (20px, khaki)
- Value text must be descriptive enough without label (domain, @handle, address)
- Consider hover states to reveal full context if needed

### For Call Card Design:
- Must work in TWO contexts:
  1. As Action Card (when IG missing): Icon + value, no label
  2. As Tier 3 card (when IG present): Full card with label
- Consider unified visual treatment that works in both

### For Tier 3 Layout:
- Hours + Map is the "base" layout when Call is in Actions
- CSS Grid graceful degradation handles all missing block scenarios
- All cards stretch to match tallest (no fixed heights)

---

## Implementation Checklist

When building these features:

### Action Cards Swap Logic
- [ ] Detect if Instagram handle/URL exists
- [ ] If IG present: render [Website] [Instagram] [Directions]
- [ ] If IG missing: render [Website] [Call] [Directions]
- [ ] Ensure Call card uses Action Card styling when in this row
- [ ] Test with all combinations (IG present/missing, phone present/missing)

### Action Card Behaviors
- [ ] Website: Opens in new tab, falls back to Google Maps listing if no website
- [ ] Instagram: Opens @handle in new tab
- [ ] Call: Uses `tel:` protocol (works on mobile, graceful on desktop)
- [ ] Directions: Opens native maps with lat/lng or address
  - [ ] Detect iOS → Apple Maps
  - [ ] Detect Android/other → Google Maps
  - [ ] Format URL correctly for each platform

### Map Card Action
- [ ] Implement "Expanded Map View" in Saiko
- [ ] Centers on current location
- [ ] Shows nearby places from collection
- [ ] Remains in-app (no external navigation)
- [ ] Consider URL structure: `/map/[slug]?place=[placeSlug]`

### Tier 3 Responsive Layout
- [ ] Default: `grid-template-columns: 1.2fr 1fr 0.8fr` (3 cards)
- [ ] No Call: `grid-template-columns: 1.2fr 1fr` (2 cards)
- [ ] No Hours: `grid-template-columns: 1fr 0.8fr` (2 cards)
- [ ] Only Map: `grid-template-columns: 1fr` (1 card)
- [ ] Mobile: All stack vertically (single column)

---

## Testing Scenarios

### Swap Logic
1. **Full data**: IG present, phone present → IG in Actions, Call in Tier 3
2. **No IG**: Phone present → Call in Actions, Tier 3 = Hours + Map
3. **No phone**: IG present → IG in Actions, Tier 3 = Hours + Map (no Call)
4. **Neither**: No IG, no phone → Actions = Website + Directions only(?), Tier 3 = Hours + Map

### Action Behaviors
1. **Directions on iOS**: Opens Apple Maps app
2. **Directions on Android**: Opens Google Maps app
3. **Directions on web**: Opens Google Maps web
4. **Call on mobile**: Opens phone dialer
5. **Call on desktop**: Shows tel: in browser (graceful degradation)
6. **Map card**: Opens Expanded Map View within Saiko

---

## Open Questions for Design Review

1. **3-card minimum**: What happens if merchant has no IG AND no phone? 
   - Show only Website + Directions (2 cards)?
   - Add placeholder card?
   - Show Call anyway (even if no number)?

2. **Call card visual**: Should it look identical in both contexts (Actions vs Tier 3)?
   - Same icon size?
   - Same layout?
   - Or adapt to context?

3. **Expanded Map View**: What should this look like?
   - Full-screen overlay?
   - Slide-in panel?
   - New page?

4. **Native maps deeplink**: Do we pass any context to maps app?
   - Business name in query?
   - Just lat/lng?
   - Formatted address?

---

**Status**: ✅ Clarifications complete, ready for design review  
**Next**: Bobby to provide full doc response with designs
