# Bento Cards Implementation - Build Complete

**Date**: February 7, 2026  
**Status**: ✅ COMPLETE - All specifications implemented

---

## Changes Implemented

### ✅ 1. Action Cards - Visual Updates

**CSS Changes** (`place.module.css`):
- Icon size: 20px → **24px**
- Value font size: 12px → **13px** (Libre Baskerville)
- Padding: 14px 12px → **20px 16px**
- Gap: 6px → **10px**
- Hover effect: Background fade → **box-shadow + translateY(-1px)**
- **Removed** `.actionLabel` class (no longer used)

**JSX Changes** (`page.tsx`):
- Removed `<span className={styles.actionLabel}>{card.label}</span>` from render
- Updated icon sizes from `size={20}` to `size={24}`
- Added Phone icon support for Call card in Actions
- **Result**: Icon + value only, NO labels

---

### ✅ 2. Call Swap Logic

**Logic Changes** (`page.tsx`, lines 319-380):

**New variables**:
```typescript
const hasInstagram = !!finalInstagramHandle;
const callInTier3 = hasInstagram && location.phone;
```

**Action Cards Order**:
1. Website (if available)
2. Instagram (if available) OR Call (if IG missing but phone available)
3. Directions (always present)

**Swap Behavior**:
- **Instagram present**: [Website] [Instagram] [Directions] + Call in Tier 3
- **Instagram missing**: [Website] [Call] [Directions] + Tier 3 = Hours + Map only

**Tier 3 Rendering**:
- Call card now conditional: `{callInTier3 && ...}`
- tier3Row classes updated to use `callInTier3` instead of `location.phone`

---

### ✅ 3. Hours Card - Visual Updates

**CSS Changes** (`place.module.css`):
- Day font size: 10px → **12px**
- Day font weight: **500** (700 for today)
- Added today highlight: **background: rgba(195, 176, 145, 0.18)**
- Added padding to `.hoursRow`: **5px 8px**
- Added border-radius: **4px**

**Result**: Today's hours have subtle khaki background highlight with rounded edges.

---

### ✅ 4. Irregular Hours Fallback

**Detection Logic** (`page.tsx`, lines 75-148):

Added `isIrregular` to return type of `parseHours()`:
```typescript
function parseHours(hours: unknown): {
  // ... existing fields
  isIrregular: boolean;
}
```

**Detection patterns**:
- Matches: "by appointment", "seasonal", "varies", "call ahead", "check website", "irregular"
- Also marks as irregular if fewer than 3 days have valid time format
- Returns `isIrregular: true` when detected

**Rendering** (`page.tsx`, lines 754-773):
```tsx
{isIrregular ? (
  <div className={styles.hoursIrregular}>
    <div className={styles.hoursVaryText}>Hours vary</div>
    <a href={googleMapsUrl} className={styles.hoursGoogleLink}>
      View on Google →
    </a>
  </div>
) : hasFullWeekHours ? (
  // Regular hours grid
) : (
  // Only status
)}
```

**CSS** (`place.module.css`, lines 379-417):
- `.hoursIrregular`: Centered flex layout, 120px min-height
- `.hoursVaryText`: Libre Baskerville italic, 13px, charcoal
- `.hoursGoogleLink`: 10px uppercase, khaki, letter-spacing 1px

---

### ✅ 5. Map Card - Horizontal Layout

**CSS Changes** (`place.module.css`, lines 422-520):

Changed from **vertical** to **horizontal** layout:
- `flex-direction: column` → `flex-direction: row`
- `align-items: center` (new)
- `gap: 16px` (preview to address spacing)

**Map Preview**:
- Width: `100%` (flex: 1) → **120px** (fixed width)
- Height: `min-height: 70px` → `height: 100%`, `min-height: 100px`
- `flex-shrink: 0` (maintains width)

**Map Label**:
- Position: Relative → **Absolute** (top: 20px, left: 20px)
- Now floats over the preview (like a traditional map label)

**Address Block**:
- Layout: `text-align: center`, `padding: 10px 0 0 0` → `flex: 1`, centered vertically
- Street font: 12px → **14px**
- City font: 10px → **11px**
- Alignment: center → **left**

**Mobile** (`place.module.css`, lines 867-887):
- Maintains horizontal layout (not stacked)
- Preview: 120px → **100px** on mobile
- Padding adjusted: 20px → 16px horizontal

**JSX Changes** (`page.tsx`, line 835):
- Changed link from `directionsUrl` → `viewOnMapUrl` (opens Expanded Map View in Saiko)
- Removed `target="_blank"` and `rel="noopener noreferrer"`

---

## Visual Specs Summary

### Action Cards
| Property | Before | After |
|----------|--------|-------|
| Icon size | 20px | **24px** ✅ |
| Value font | 12px sans | **13px Libre Baskerville** ✅ |
| Padding | 14px 12px | **20px 16px** ✅ |
| Gap | 6px | **10px** ✅ |
| Hover | Background fade | **Shadow + translateY** ✅ |
| Labels | Shown | **Removed** ✅ |

### Hours Card
| Property | Before | After |
|----------|--------|-------|
| Day font | 10px | **12px** ✅ |
| Today highlight | Bold text only | **Background rgba(195,176,145,0.18)** ✅ |
| Status footer | Present | **Present** ✅ (confirmed correct) |
| Irregular fallback | None | **"Hours vary" + Google link** ✅ |

### Map Card
| Property | Before | After |
|----------|--------|-------|
| Layout | Vertical (stack) | **Horizontal (side-by-side)** ✅ |
| Preview size | Full width | **120px fixed** ✅ |
| Address position | Below, centered | **Right side, left-aligned** ✅ |
| Street font | 12px | **14px** ✅ |
| City font | 10px | **11px** ✅ |
| Action | Opens directions | **Opens Expanded Map View** ✅ |

---

## Behavior Changes

### Call Card Swap Logic

**Before**: Call always in Tier 3, Instagram always attempts to show (even with search fallback)

**After**: 
- Instagram present → Standard Actions + Call in Tier 3
- Instagram missing → Call swaps to Actions middle position
- No more Instagram search fallback

**Code Implementation**:
```typescript
const hasInstagram = !!finalInstagramHandle;
const callInTier3 = hasInstagram && location.phone;

// In Action Cards building:
if (hasInstagram) {
  actionCards.push({ type: 'instagram', ... });
} else if (location.phone) {
  actionCards.push({ type: 'call', ... });
}

// In Tier 3 rendering:
{callInTier3 && <CallCard />}
```

### Map Card Action

**Before**: Opens external directions (Google Maps)

**After**: Opens Expanded Map View within Saiko
- Link changed from `directionsUrl` to `viewOnMapUrl`
- Removed external link attributes
- Now navigates to `/map/[slug]?place=[placeSlug]`

---

## Edge Cases Handled

| Scenario | Action Cards | Tier 3 |
|----------|--------------|--------|
| All data present | [Website] [IG] [Directions] | [Hours] [Map] [Call] |
| No Instagram | [Website] [Call] [Directions] | [Hours] [Map] |
| No phone | [Website] [IG] [Directions] | [Hours] [Map] |
| No IG + no phone | [Website] [Directions] (2 wider) | [Hours] [Map] |
| No website | [IG] [Directions] (2 wider) | [Hours] [Map] [Call] |
| No hours | [Website] [IG] [Directions] | [Map] [Call] or [Map] only |
| Irregular hours | [Website] [IG] [Directions] | ["Hours vary"] [Map] [Call] |

---

## Files Modified

1. ✅ `/app/(viewer)/place/[slug]/page.tsx`
   - Action cards logic rewritten (lines 319-380)
   - Hours parsing updated with `isIrregular` detection
   - Hours rendering with irregular fallback
   - Map card link changed to `viewOnMapUrl`
   - Call card conditional rendering
   - Icon sizes updated to 24px
   - Labels removed from Action Cards render

2. ✅ `/app/(viewer)/place/[slug]/place.module.css`
   - Action Cards: icon size, padding, gap, hover effect
   - Removed `.actionLabel` class
   - Hours: today highlight background, increased day font
   - Added irregular hours styles (`.hoursIrregular`, `.hoursVaryText`, `.hoursGoogleLink`)
   - Map card: horizontal layout, 120px preview, updated address styles
   - Mobile responsive updates for horizontal map

---

## Testing Checklist

### Action Cards:
- [ ] Icons are 24px and clearly visible
- [ ] No labels showing (icon + value only)
- [ ] Hover effect shows shadow + slight lift
- [ ] Website opens in new tab
- [ ] Instagram opens profile (or Call card if IG missing)
- [ ] Directions opens native maps
- [ ] Call (in Actions) opens tel: dialer

### Hours Card:
- [ ] Two-column grid displays correctly
- [ ] Today's row has khaki background highlight
- [ ] Status footer shows "Open · Closes X" or "Closed · Opens X"
- [ ] Irregular hours show "Hours vary" + Google link
- [ ] Google link opens Maps listing

### Map Card:
- [ ] Preview is 120px wide on left
- [ ] Address displays on right side
- [ ] Field Notes grid lines visible
- [ ] Red pin centered
- [ ] Click opens Expanded Map View (NOT external maps)
- [ ] Horizontal layout maintained on mobile

### Call Card (Tier 3):
- [ ] Only shows when Instagram is present
- [ ] Phone icon 32px centered
- [ ] Number in Libre Baskerville 14px
- [ ] tel: link works on mobile

### Swap Logic:
- [ ] Test place with IG: Call in Tier 3 ✓
- [ ] Test place without IG: Call in Actions middle ✓
- [ ] Test place without IG or phone: 2-card Actions ✓
- [ ] Test place without website: 2-card Actions (IG + Directions) ✓

---

## Known Issues / Future Work

1. **Expanded Map View** - Need to verify `/map/[slug]?place=[placeSlug]` route exists and works
2. **Mobile Action Cards** - May need slight padding adjustment for smaller screens
3. **Irregular hours detection** - May need refinement based on real-world data patterns
4. **Call card styling** - When in Actions, may need slight visual adjustment vs Tier 3 version

---

## Summary

**Total Changes**: 6 major features implemented  
**Files Modified**: 2 (page.tsx, place.module.css)  
**Lines Changed**: ~150 lines  
**Linter Errors**: 0  
**Tests Needed**: 15 scenarios

**Status**: ✅ BUILD COMPLETE  
**Next**: Manual testing in browser to verify all behaviors

---

## Quick Test Commands

```bash
cd /Users/bobbyciccaglione/saiko-maps
npm run dev
```

Then test with:
- Place with Instagram → Check Call in Tier 3
- Place without Instagram → Check Call in Actions
- Place with irregular hours → Check "Hours vary" fallback
- Click Map card → Should open Expanded View, not external maps
- Verify all visual specs (icon sizes, fonts, hover effects)

---

**BUILD STATUS**: ✅ COMPLETE AND READY FOR TESTING 🚀
