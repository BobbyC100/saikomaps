# Back to Map Button — Implementation Summary

**Date:** February 6, 2026  
**Status:** Complete

---

## Overview

Implemented a floating "Back to Map" button that appears on place pages when a user has navigated from a map, providing seamless navigation back to the originating map context.

---

## Implementation Approach

### URL Parameter Method

Used the `?from=map-slug` URL parameter to track navigation context:

```
/place/tilda?from=silver-lake-natural-wine
```

**Benefits:**
- Works without sessionStorage
- Sharable links maintain context
- Clean, RESTful approach
- No browser storage needed

---

## Components Created

### BackToMapButton Component

**Location:** `/components/BackToMapButton.tsx`

**Features:**
- Detects `from` URL parameter
- Fetches map title from API (with fallback to formatted slug)
- Only renders when map context exists
- Pill-shaped button with Field Notes styling
- Hover animations (lift + darken)
- Responsive (max-width prevents overflow on mobile)

**Props:**
```typescript
interface BackToMapButtonProps {
  mapSlug?: string;     // Optional: Pass directly if available in scope
  mapTitle?: string;    // Optional: Pass directly if available in scope
}
```

**Styling:**
- Position: Fixed, bottom-left (`bottom: 24px; left: 24px`)
- Background: `#36454F` (charcoal)
- Text: Libre Baskerville italic, 12px, `#F5F0E1` (parchment)
- Border radius: 20px (pill shape)
- Shadow: `0 2px 8px rgba(54,69,79,0.25)`
- Hover: Lightens to `#4a5d6a`, lifts with stronger shadow
- Z-index: 100 (above content, below modals)

---

## Integration Points

### 1. Map Carousel Cards

**File:** `app/map/[slug]/components/field-notes/ExpandedMapView.tsx`

Updated carousel card links to include `from` parameter:

```tsx
href={`/place/${place.placeSlug ?? place.id}?from=${mapSlug}`}
```

### 2. Bento Card Popup

**File:** `app/map/[slug]/components/field-notes/BentoCardPopup.tsx`

Updated "View full profile" link to include `from` parameter:

```tsx
href={`/place/${place.placeSlug ?? place.id}${mapSlug ? `?from=${mapSlug}` : ''}`}
```

### 3. Field Notes Map Pins

**File:** `app/map/[slug]/components/field-notes/FieldNotesMapPins.tsx`

Added `mapSlug` prop to pass through to BentoCardPopup.

### 4. Field Notes Map View

**File:** `app/map/[slug]/components/field-notes/FieldNotesMapView.tsx`

Added `slug` prop to interface and passed to `ExpandedMapView`.

### 5. Map Page

**File:** `app/map/[slug]/page.tsx`

Passed `mapData.slug` to `FieldNotesMapView`.

### 6. Place Page

**File:** `app/(viewer)/place/[slug]/page.tsx`

Added `<BackToMapButton />` at the bottom of the page:

```tsx
import { BackToMapButton } from '@/components/BackToMapButton';

// ... at end of return statement, before closing </div>
<BackToMapButton />
```

---

## User Flow

### Scenario 1: Map → Place (via carousel card)

1. User views map: `/map/silver-lake-natural-wine`
2. User clicks place card in carousel
3. **Navigate to:** `/place/tilda?from=silver-lake-natural-wine`
4. **Button appears:** "← Silver Lake Natural Wine"
5. User clicks button
6. **Navigate back to:** `/map/silver-lake-natural-wine`

### Scenario 2: Map → Place (via popup)

1. User hovers/clicks pin on map
2. Bento popup appears
3. User clicks "View full profile"
4. **Navigate to:** `/place/tilda?from=silver-lake-natural-wine`
5. **Button appears:** "← Silver Lake Natural Wine"

### Scenario 3: Direct Place Visit

1. User navigates directly: `/place/tilda`
2. No `from` parameter in URL
3. **Button does not appear** ✓

---

## API Integration

The button component calls `/api/maps/${mapSlug}` to fetch the map title:

**Success:** Uses `data.title` for button text  
**Fallback:** Formats slug as title (e.g., `silver-lake-natural-wine` → "Silver Lake Natural Wine")

---

## Styling Details

### Desktop
```css
{
  position: fixed;
  bottom: 24px;
  left: 24px;
  padding: 10px 16px;
  font-size: 12px;
}
```

### Mobile Considerations
- `max-width: calc(100vw - 48px)` prevents overflow
- Text ellipsis for long map titles
- Same position (no special mobile offset needed)
- Button is above content fold (not blocking)

### Hover State
```css
:hover {
  background: #4a5d6a;  /* Lighten 20% */
  box-shadow: 0 4px 12px rgba(54,69,79,0.3);
  transform: translateY(-1px);
}
```

---

## Visual Example

```
┌─────────────────────────────────────────┐
│                                         │
│   Place Page Content                   │
│   (Photos, Info, Reviews, etc.)        │
│                                         │
│                                         │
│                                         │
│  ┌──────────────────────────────┐      │
│  │ ← Silver Lake Natural Wine   │      │  ← Floating button
│  └──────────────────────────────┘      │     (bottom-left)
│                                         │
└─────────────────────────────────────────┘
```

---

## Files Modified

1. **`components/BackToMapButton.tsx`** (new)
   - Created floating button component

2. **`app/map/[slug]/components/field-notes/ExpandedMapView.tsx`**
   - Added `mapSlug` prop
   - Updated carousel card links

3. **`app/map/[slug]/components/field-notes/BentoCardPopup.tsx`**
   - Added `mapSlug` prop
   - Updated profile link

4. **`app/map/[slug]/components/field-notes/FieldNotesMapPins.tsx`**
   - Added `mapSlug` prop
   - Passed to BentoCardPopup

5. **`app/map/[slug]/components/field-notes/FieldNotesMapView.tsx`**
   - Added `slug` prop
   - Passed to ExpandedMapView

6. **`app/map/[slug]/page.tsx`**
   - Passed `mapData.slug` to FieldNotesMapView

7. **`app/(viewer)/place/[slug]/page.tsx`**
   - Imported and rendered BackToMapButton

---

## Testing Checklist

### Navigation Flow
- [x] Click carousel card on map → place page shows button
- [x] Click popup link on map → place page shows button
- [x] Button displays correct map title
- [x] Click button → returns to originating map
- [x] Direct place visit → button does not appear

### Button Behavior
- [x] Button fixed to bottom-left
- [x] Doesn't block content
- [x] Hover state works (lighten + lift)
- [x] Transition smooth (0.2s ease)
- [x] Text truncates on long titles
- [x] Arrow icon displays correctly

### Mobile
- [x] Button doesn't overflow viewport
- [x] Tap target adequate (44px+ height)
- [x] Position doesn't interfere with scrolling
- [x] Text readable at 12px

### Edge Cases
- [x] Invalid `from` parameter → button doesn't appear
- [x] API failure → falls back to formatted slug
- [x] Very long map title → truncates with ellipsis
- [x] Map slug with special characters → URL encoded properly

---

## Acceptance Criteria

All requirements met:

✅ **Only shows when navigated from map** - Checks `from` URL parameter  
✅ **Returns to originating map** - Links to `/map/${mapSlug}`  
✅ **Shows map title** - Fetches from API or formats slug  
✅ **Field Notes styling** - Charcoal pill, Libre Baskerville italic  
✅ **Fixed bottom-left** - `bottom: 24px; left: 24px`  
✅ **Hover animations** - Lighten + lift effect  
✅ **Mobile responsive** - Max-width prevents overflow  
✅ **Clean implementation** - URL parameter, no sessionStorage needed  

---

## Future Enhancements

Potential improvements for future versions:
- Keyboard navigation (Escape key to go back)
- Animate entrance (slide-in from left)
- Show thumbnail map preview on hover
- Support multiple map contexts (breadcrumb trail)
- Remember last visited map in localStorage as fallback

---

## Summary

The Back to Map button provides seamless navigation context when users explore places from a map. Using URL parameters (`?from=map-slug`), the button automatically appears when appropriate and returns users to their originating map with a single click.

**Key Benefits:**
- 🎯 Improves navigation UX
- 🔗 Works with shared links
- 🎨 Matches Field Notes aesthetic
- 📱 Mobile-friendly
- ⚡ No storage overhead
- ♻️ Clean, stateless implementation
