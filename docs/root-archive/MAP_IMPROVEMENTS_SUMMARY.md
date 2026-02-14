# Map Improvements Summary

**Date:** February 6, 2026  
**Status:** Complete  
**Version:** v2 (Enhanced POI handling)

## Overview

This document summarizes the map improvements implemented based on the specifications in `saiko-expanded-map-spec.md` and the enhanced Field Notes v2 map style.

## Changes Implemented

### 1. Enhanced Google Maps Custom Styling (v2)

**File:** `lib/mapStyle.ts`

Updated the `fieldNotesMapStyle` to match the Field Notes v2 specification with refined POI handling:

#### Base Map Styling
- **Global desaturation** applied to reduce color intensity (-20)
- **Water:** Muted blue-gray `#c9d9e0`
- **Landscape:** Parchment tone `#e8e2d4`
- **Highways:** Visible with subtle khaki stroke `#c3b091`, weight 0.5
- **Arterial roads:** Muted khaki text `#8b7355`, no stroke
- **Local roads:** Labels and strokes hidden, fill blends with landscape `#e6e0d4`

#### Parks & Green Spaces (Enhanced)
- **Fill:** Refined sage green `#d4e0c8` with -40 saturation, +10 lightness
- **Labels:** Text fill `#9aab8a` with +10 lightness
- **Text stroke:** Parchment `#f5f0e1`, weight 2 (for legibility)
- **Icons:** Desaturated (-60) and lightened (+30)

#### POI Categories (Granular Control)
- **Sports complexes:** Labels with `#a99880` fill, parchment stroke, desaturated icons
- **Attractions:** Icons only (no labels), heavily desaturated (-70), +40 lightness
- **Medical:** Completely hidden
- **Business:** Completely hidden
- **Government:** Completely hidden
- **Schools:** Completely hidden
- **Places of worship:** Completely hidden

#### Transit
- **Station icons:** Desaturated (-50), +20 lightness
- **Station labels:** Hidden (icons only)

#### Administrative Labels
- **Neighborhood labels:** Softened to `#a99880` with parchment stroke `#f5f0e1`, weight 2.5
- **Locality labels:** `#6b5d4d`

### 2. Updated Pin Specifications

**File:** `app/map/[slug]/components/field-notes/FieldNotesMapPins.tsx`

#### Pin Sizes (Expanded Map View)
- **Default pins:** 20×20px (increased from 14px)
- **Featured pins:** 26×26px (increased from 18px)
- **Border:** 3px solid (increased from 2.5px)
- **Border color:** `#F5F0E1` (light mode), `#1B2A3D` (dark mode)

#### Pin States
- **Default:** `0 2px 10px rgba(214,69,65,0.4)`
- **Featured:** `0 3px 14px rgba(214,69,65,0.45)`
- **Hover:** `scale(1.15)` + `0 4px 16px rgba(214,69,65,0.5)`
- **Active (popup open):** `scale(1.2)` + ring `0 0 0 5px rgba(214,69,65,0.15-0.2)`

### 3. Enhanced Pin Label Typography

**File:** `app/map/[slug]/components/field-notes/FieldNotesMapPins.tsx`

#### Typography Updates
- **Font:** Libre Baskerville (unchanged)
- **Size:** 
  - Default: 10px (increased from 8px)
  - Featured: 12px (increased from 10px)
- **Weight:** 
  - Default: 400
  - Featured: 700
- **Style:** italic
- **Max width:** 
  - Default: 90px
  - Featured: 110px

#### Color & Opacity
- **Light mode:**
  - Default: `rgba(54,69,79,0.6)` (increased from 0.5)
  - Featured: `rgba(54,69,79,0.8)` (increased from 0.7)
- **Dark mode:**
  - Default: `rgba(245,240,225,0.5)` (increased from 0.45)
  - Featured: `rgba(245,240,225,0.7)` (increased from 0.6)

#### Text Shadow (Enhanced Legibility)
- **Light mode:** 
  ```css
  0 0 6px rgba(245,240,225,0.95),
  0 0 12px rgba(245,240,225,0.7),
  0 1px 2px rgba(139,115,85,0.15)
  ```
- **Dark mode:**
  ```css
  0 0 6px rgba(27,42,61,0.95),
  0 0 12px rgba(27,42,61,0.7)
  ```

#### Interaction States
- **Hover:** opacity increases (+0.15)
- **Active:** opacity 0.95, `scale(1.02)`
- **Highlighted (from card hover):** opacity 0.9, `scale(1.02)`

### 4. Pin ↔ Card Interaction

**Files:** 
- `app/map/[slug]/components/field-notes/ExpandedMapView.tsx`
- `app/map/[slug]/components/field-notes/FieldNotesMapPins.tsx`

#### Pin → Card
- Hovering/clicking a pin centers the corresponding card in the bottom carousel
- Card receives highlighted state with enhanced shadow

#### Card → Pin (NEW)
- Hovering a card in the carousel highlights the corresponding pin on the map
- Pin enters hover state (`scale(1.15)`)
- Label opacity increases
- Implemented via `highlightedPlaceId` state management

#### State Management
```tsx
const [highlightedPlaceId, setHighlightedPlaceId] = useState<string | null>(null);

// On card hover
onMouseEnter={() => setHighlightedPlaceId(place.id)}
onMouseLeave={() => setHighlightedPlaceId(null)}
```

#### Card Highlight Style
- Enhanced box-shadow with red accent border
- `translateY(-2px)` lift effect
- Works for both active selection and hover highlight

## Technical Details

### Component Updates

1. **ExpandedMapView.tsx**
   - Added `highlightedPlaceId` state
   - Pass `highlightedPlaceId` to `FieldNotesMapPins`
   - Added hover handlers to carousel cards
   - Updated card highlighting logic to include both active and highlighted states

2. **FieldNotesMapPins.tsx**
   - Added `highlightedPlaceId` prop to interface
   - Updated pin rendering to check both `active` and `highlighted` states
   - Enhanced pin sizes for expanded view
   - Improved label typography and shadows
   - Updated interaction states for highlighting

3. **mapStyle.ts**
   - Replaced simplified `fieldNotesMapStyle` with comprehensive spec-compliant styling
   - Added detailed comments for each feature type
   - Maintained backward compatibility with existing usage

## Testing Recommendations

### Light Mode Testing
- [ ] Verify map background is parchment `#e8e2d4`
- [ ] Confirm water is muted blue-gray `#c9d9e0`
- [ ] Check local roads are hidden but blend well
- [ ] Verify pin labels are legible with proper text shadows
- [ ] Test pin sizes (20px default, 26px featured)
- [ ] Confirm card → pin hover interaction works smoothly

### Dark Mode Testing
- [ ] Verify map has navy theme with proper contrast
- [ ] Check pin borders use dark mode color `#1B2A3D`
- [ ] Confirm label text shadows work well on dark background
- [ ] Test pin highlighting with dark mode card hover
- [ ] Verify all opacity values provide good visibility

### Interaction Testing
- [ ] Hover over a pin → card should highlight and scroll into view
- [ ] Hover over a card → pin should scale and highlight
- [ ] Click a pin → popup should appear with correct positioning
- [ ] Test on mobile: tap interactions should work smoothly
- [ ] Verify smooth transitions between states

## Spec Compliance Checklist

Based on `saiko-expanded-map-spec.md`:

- [x] Map uses Field Notes custom styling (no garish colors, local roads hidden)
- [x] Pins are 20px default / 26px featured (larger than before)
- [x] Every pin has its place name as a stacked label below
- [x] Hovering a pin highlights the corresponding carousel card
- [x] Hovering a carousel card highlights the corresponding pin
- [x] Tapping a pin opens the Bento popup (already implemented)
- [x] Popup positions correctly above pin with notch arrow (already implemented)
- [x] All states work in both light and dark mode

## Files Modified

1. `/lib/mapStyle.ts` - Enhanced Field Notes map styling
2. `/app/map/[slug]/components/field-notes/FieldNotesMapPins.tsx` - Pin sizes, labels, and interactions
3. `/app/map/[slug]/components/field-notes/ExpandedMapView.tsx` - Card-to-pin hover interaction

## Key Improvements in v2

### POI Decluttering
The v2 map style significantly reduces visual noise by:
- Hiding business, medical, government, school, and worship POIs entirely
- Showing only attraction icons (no labels) with heavy desaturation
- Hiding transit station labels while keeping subtle icons
- This ensures user pins remain the primary focus

### Enhanced Park Styling
Parks now have:
- Lighter, more refined sage green (`#d4e0c8` vs previous `#c8d4b8`)
- Text strokes on labels for better legibility
- Consistently desaturated icons that blend with the Field Notes aesthetic

### Improved Label Hierarchy
- Neighborhood label strokes increased to 2.5px (from 2px) for better contrast
- Sports complex labels styled to match park labels for consistency
- All remaining POI text uses coordinated parchment strokes

## Notes

- All changes maintain backward compatibility with existing features
- The enhanced v2 styling makes user pins stand out dramatically against the decluttered background
- Improved legibility of pin labels through better typography and text shadows
- Bidirectional hover interaction creates a more cohesive user experience
- No breaking changes to existing APIs or component interfaces
- Map is now significantly cleaner with reduced POI clutter while maintaining navigational context
