# Bento Icon Cards Implementation

**Date:** February 9, 2026  
**Status:** ✅ Complete — Ready for Testing

---

## Summary

Implemented two new 1×1 bento icon cards (Phone and Map) to create a cleaner, more compact merchant page layout. These replace the previous 6-column MapCard.

---

## New Layout Structure

### Before
```
Row 1: Hours (2/6) + Coverage (3-5)
Row 2: Gallery (3/6) + Curator (3)
Row 3: Map (6) ← Large card with address + preview
Row 4: Details (6)
Row 5: Vibe (6)
Row 6: Also On (6)
```

### After
```
Row 1: Hours (2/6) + Coverage (3-5)
Row 2: Gallery (3/6) + Curator (3)
Row 3: Phone (1) + Map Icon (1) + Details (4/5) ← NEW ROW
Row 4: Vibe (6)
Row 5: Also On (6)
```

---

## Components Created

### 1. PhoneIconCard

**File:** `/components/merchant/PhoneIconCard.tsx`

**Visual Design:**
- Nokia 5110 top contour (cropped below screen)
- Shows antenna, earpiece hint, screen edge
- Saiko red dot as power button
- Woodcut/atlas style matching Map icon

**Behavior:**
- Click opens phone dialer via `tel:` protocol
- Only renders if phone number exists
- Standard bento hover treatment (shadow + lift)

**Grid:** `span 1`, `aspect-ratio: 1`

---

### 2. MapIconCard

**File:** `/components/merchant/MapIconCard.tsx`

**Visual Design:**
- LA River's Glendale Narrows meander (Frogtown S-curve)
- Subtle hydrology contour lines
- Saiko red pin with parchment border
- Vintage California atlas aesthetic

**Behavior:**
- Click opens Expanded Map View (placeholder console.log)
- Always renders (no conditional)
- Standard bento hover treatment

**Grid:** `span 1`, `aspect-ratio: 1`

---

## Shared Visual Language

Both icons use matching design tokens:

| Element | Color | Usage |
|---------|-------|-------|
| Background | `linear-gradient(155deg, #F5F0E1 0%, #EBE6D6 100%)` | Card background |
| Paper texture | Fractal noise SVG | Overlay at 0.035 opacity |
| Contours | `#8B7355` (khaki) | Main line work |
| Accent | `#89B4C4` (ocean blue) | Screen (phone) / River (map) |
| Pin/Button | `#D64541` (Saiko red) | Power button / Map pin |
| Pin border | `#F5F0E1` (parchment) | Dot outline |

---

## DetailsCard Modifications

**Updated:** `/components/merchant/DetailsCard.tsx`

### New Props
- `address?: string | null` — Full street address
- `neighborhood?: string | null` — For display alongside address
- `span?: number` — Grid column span (4 or 5, default 6)

### Address Row
- Appears as first row if address exists
- Display format: `{address} · {neighborhood}`
- Links to Google Maps search
- Uses italic Libre Baskerville font (matching website links)

### Graceful Degradation
```tsx
span={location.phone ? 4 : 5}
```
- With phone: Phone (1) + Map (1) + Details (4)
- No phone: Map (1) + Details (5)

---

## Files Modified

| File | Change |
|------|--------|
| `app/(viewer)/place/[slug]/page.tsx` | Replaced MapCard with PhoneIconCard + MapIconCard + updated DetailsCard props |
| `components/merchant/DetailsCard.tsx` | Added address display, span prop |

---

## Files Created

| File | Purpose |
|------|---------|
| `components/merchant/PhoneIconCard.tsx` | Nokia 5110 icon component |
| `components/merchant/PhoneIconCard.module.css` | Icon card styles |
| `components/merchant/MapIconCard.tsx` | LA River icon component |
| `components/merchant/MapIconCard.module.css` | Icon card styles |

---

## Files Deleted

| File | Reason |
|------|--------|
| `components/merchant/MapCard.tsx` | Replaced by MapIconCard |
| `components/merchant/MapCard.module.css` | No longer needed |

---

## Testing Checklist

### Visual Verification
- [ ] Phone icon renders as Nokia 5110 silhouette with red power button
- [ ] Map icon renders as LA River path with red pin
- [ ] Both icons have paper texture overlay
- [ ] Icons are square (1:1 aspect ratio)
- [ ] Details card spans 4 columns when phone exists, 5 when it doesn't

### Interaction
- [ ] Phone icon click opens phone dialer
- [ ] Map icon click logs "Open Expanded Map View"
- [ ] Both icons have hover lift animation
- [ ] Address in Details card links to Google Maps

### Data Scenarios
- [ ] **With phone:** Stir Crazy — Shows Phone (1) + Map (1) + Details (4)
- [ ] **No phone:** Test a place without phone — Map (1) + Details (5)
- [ ] Address displays correctly in Details card

### Test URLs
```
http://localhost:3000/place/stir-crazy
http://localhost:3000/place/seco
http://localhost:3000/place/pizzeria-mozza-melrose
```

---

## Design Intent

These icons are **symbolic, editorial signifiers** — not functional previews:

- **Phone:** Vintage Nokia reference signals "call this place" in a nostalgic, lo-fi way
- **Map:** LA River path is an insider signal for locals, reads like an atlas fragment

Both match the Field Notes aesthetic: muted tones, paper texture, vintage cartography.

**Do not:**
- Make them look like modern UI buttons
- Add text labels or bright colors
- Use high contrast or glossy effects

---

## Next Steps

1. **Test in browser** — Verify layout and interactions
2. **Wire up Expanded Map View** — Replace console.log with actual handler
3. **Mobile responsive** — Ensure icons work at 640px breakpoint
4. **Scale testing** — Test with long addresses, missing data

---

## Related Specs

- `MAP_BENTO_ICON_SPEC.md` — Full Map icon design spec
- `PHONE_BENTO_ICON_SPEC.md` — Full Phone icon design spec
- `MERCHANT_PAGE_V2_COMPLETE.md` — Overall page structure
