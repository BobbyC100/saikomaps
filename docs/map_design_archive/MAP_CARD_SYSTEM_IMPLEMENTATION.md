# Map Card System — Implementation Complete

**Date:** February 10, 2026  
**Status:** ✅ Ready for Integration

---

## Overview

Built a complete Map Card component system for displaying maps (curated collections) in search results and editorial surfaces. Maps are visually distinct from Place cards and work within the existing bento grid.

---

## Components Created

### File Structure

```
components/
└── map-cards/
    ├── types.ts              ← TypeScript interfaces
    ├── MapCard2x1.tsx        ← Horizontal layout for search
    ├── MapCard2x2.tsx        ← Featured/editorial layout
    ├── MapTitleBlock.tsx     ← Text-only variant
    └── index.ts              ← Barrel export
```

### Three Variants

#### 1. `MapCard2x1` — Search Results (Primary)

**Use:** Search results, neighborhood pages, mixed grids  
**Layout:** Horizontal — image left (35% width), content right  
**Grid span:** `grid-column: span 2`

```tsx
import { MapCard2x1 } from '@/components/map-cards'

<MapCard2x1 map={{
  slug: 'silver-lake-coffee',
  title: 'Silver Lake Coffee Crawl',
  description: 'The essential stops for a caffeine-fueled afternoon.',
  placeCount: 8,
  coverImageUrl: '/images/maps/silver-lake-coffee.jpg',
  neighborhoods: ['Silver Lake'],
  authorType: 'user',
  authorUsername: 'bobby'
}} />
```

**Responsive behavior:**
- Desktop/Tablet (> 600px): Horizontal layout, spans 2 columns
- Mobile (≤ 600px): Flips to vertical, single column, 160px image height

#### 2. `MapCard2x2` — Featured / Editorial

**Use:** Homepage features, "Map of the week", editorial surfaces  
**Layout:** Vertical — image top (full width), content below  
**Grid span:** `grid-column: span 2; grid-row: span 2`

```tsx
import { MapCard2x2 } from '@/components/map-cards'

<MapCard2x2 map={{
  slug: 'la-natural-wine-trail',
  title: 'The LA Natural Wine Trail',
  description: 'From Silver Lake to Venice — every bottle shop, bar, and restaurant pouring the good stuff.',
  placeCount: 15,
  coverImageUrl: '/images/maps/wine-trail.jpg',
  neighborhoods: ['Silver Lake', 'Venice'],
  authorType: 'saiko'
}} />
```

**Responsive behavior:**
- Desktop (> 900px): 2x2 grid span, 180px image
- Tablet (601–900px): 2x1 grid span, 160px image
- Mobile (≤ 600px): 1x1 grid span, 180px image

#### 3. `MapTitleBlock` — Standalone (No Image)

**Use:** Sidebars, "Featured on X maps" links, fallback when no image  
**Layout:** Text only, no image  
**Grid span:** Flexible (single column)

```tsx
import { MapTitleBlock } from '@/components/map-cards'

// Full variant
<MapTitleBlock map={{...}} />

// Compact variant (1-line description)
<MapTitleBlock map={{...}} compact />
```

---

## Props Interface

```typescript
interface MapCardData {
  slug: string;
  title: string;
  description?: string;
  placeCount: number;
  coverImageUrl?: string;
  neighborhoods?: string[];  // e.g. ["Silver Lake", "Echo Park"]
  authorType: 'saiko' | 'user';
  authorUsername?: string;  // Required if authorType === 'user'
}

interface MapCardProps {
  map: MapCardData;
  variant?: '2x1' | '2x2' | 'title-block';
  compact?: boolean; // For title-block only
}
```

---

## Content Hierarchy (All Variants)

Renders in this order:

1. **Type label** — Always visible, always first
   ```
   MAP · {placeCount} PLACES
   ```
   - Font: 9px, uppercase, letter-spacing 1.5px
   - Color: `#8B7355` (khaki-dark)

2. **Title**
   - Font: Libre Baskerville, italic
   - Size: 17px (2x1), 22px (2x2), 18px (title block)
   - Color: `#36454F` (charcoal)

3. **Description** (if exists)
   - Font: System, 12-13px
   - Color: `#8B7355` (khaki-dark)
   - Line clamp: 2 lines max (2x1), full text (2x2)

4. **Meta row**
   - Author + Area, separated by `·`
   - Font: 9px uppercase, letter-spacing 1px
   - Color: `#C3B091` (khaki)

---

## Author Attribution

### Saiko-Authored Maps

Display "Curator Pick" badge:

```tsx
{map.authorType === 'saiko' && (
  <span className="curator-badge">★ Curator Pick</span>
)}
```

**Badge styling:**
- Background: `rgba(195, 176, 145, 0.2)`
- Padding: `3px 8px`
- Font: 8px uppercase, letter-spacing 1px
- Star icon: `★` (7px)

**Important:** Never show "Saiko Maps" or "Staff Pick" — only "Curator Pick"

### User-Created Maps

Display username:

```tsx
{map.authorType === 'user' && (
  <span>By @{map.authorUsername}</span>
)}
```

---

## Visual Differentiation from Place Cards

Map cards are instantly distinguishable:

| Property | Map Cards | Place Cards |
|----------|-----------|-------------|
| Border | **2px solid #C3B091** | 1px solid rgba(195, 176, 145, 0.2) |
| Type label | `MAP · X PLACES` | None (category in meta) |
| Layout (2x1) | Horizontal | Usually vertical |
| Border color | Khaki (#C3B091) | Subtle khaki |

---

## Responsive Breakpoints

```css
/* Desktop: 4 columns */
@media (min-width: 901px) { ... }

/* Tablet: 2 columns */
@media (min-width: 601px) and (max-width: 900px) { ... }

/* Mobile: 1 column */
@media (max-width: 600px) { ... }
```

### Behavior Summary

| Variant | Desktop (>900px) | Tablet (601–900px) | Mobile (≤600px) |
|---------|------------------|--------------------| ----------------|
| 2x1 | Horizontal, 2 cols | Horizontal, 2 cols | Vertical, 1 col |
| 2x2 | 2×2 grid span | 2×1 grid span | 1×1 grid span |
| Title Block | Flexible | Flexible | Flexible |

---

## Integration with Search Results

### Step 1: Update Search API

Modify `app/api/search/route.ts` to return maps:

```typescript
// Example search API response
return Response.json({
  places: [...],
  maps: [
    {
      slug: 'silver-lake-coffee',
      title: 'Silver Lake Coffee Crawl',
      description: '...',
      placeCount: 8,
      coverImageUrl: '/maps/silver-lake-coffee.jpg',
      neighborhoods: ['Silver Lake'],
      authorType: 'user',
      authorUsername: 'bobby',
    },
  ],
});
```

### Step 2: Update Search Page

Modify `app/(viewer)/search/page.tsx`:

```tsx
import { MapCard2x1 } from '@/components/map-cards'
import { BentoGrid, PlaceCard1x1, PlaceCard1x2, PlaceCard2x1 } from '@/components/search-results'

export default function SearchPage() {
  const [maps, setMaps] = useState<MapCardData[]>([])
  const [places, setPlaces] = useState<PlaceCardData[]>([])

  // ... fetch logic

  return (
    <div>
      {/* Maps appear first, limited to 2-3 */}
      {maps.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <BentoGrid mode="search">
            {maps.slice(0, 3).map((map) => (
              <MapCard2x1 key={map.slug} map={map} />
            ))}
          </BentoGrid>
          {maps.length > 3 && (
            <a href="/maps">See all {maps.length} maps →</a>
          )}
        </div>
      )}

      {/* Place results */}
      <BentoGrid mode="search">
        {places.map((place) => (
          <PlaceCard1x2 key={place.slug} place={place} />
        ))}
      </BentoGrid>
    </div>
  )
}
```

---

## CSS Variables (Field Notes Palette)

All components use these existing CSS variables:

```css
:root {
  --parchment: #F5F0E1;
  --warm-white: #FFFDF7;
  --khaki: #C3B091;
  --khaki-dark: #8B7355;
  --charcoal: #36454F;
  --border-light: rgba(195, 176, 145, 0.2);
}
```

---

## Usage Examples

### Search Results with Maps

```tsx
import { MapCard2x1 } from '@/components/map-cards'
import { PlaceCard1x2 } from '@/components/search-results'

<BentoGrid mode="search">
  {/* Maps first */}
  <MapCard2x1 map={coffeeMap} />
  <MapCard2x1 map={wineMap} />
  
  {/* Then places */}
  <PlaceCard1x2 place={place1} />
  <PlaceCard1x2 place={place2} />
  <PlaceCard1x2 place={place3} />
</BentoGrid>
```

### Homepage Featured Map

```tsx
import { MapCard2x2 } from '@/components/map-cards'

<div className="featured-section">
  <h2>Map of the Week</h2>
  <BentoGrid mode="editorial">
    <MapCard2x2 map={featuredMap} />
  </BentoGrid>
</div>
```

### Sidebar "Featured On" Links

```tsx
import { MapTitleBlock } from '@/components/map-cards'

<div className="sidebar">
  <h3>Featured on these maps</h3>
  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
    <MapTitleBlock map={map1} compact />
    <MapTitleBlock map={map2} compact />
    <MapTitleBlock map={map3} compact />
  </div>
</div>
```

---

## Hover States

All variants include hover effects:

```css
/* On hover */
box-shadow: 0 4px 20px rgba(139, 115, 85, 0.15);
transform: translateY(-2px);
transition: all 0.2s ease;
```

2x2 variant has a slightly stronger hover:

```css
/* On hover */
box-shadow: 0 6px 28px rgba(139, 115, 85, 0.18);
transform: translateY(-3px);
```

---

## Checklist

- [x] Create `MapCard2x1` component
- [x] Create `MapCard2x2` component  
- [x] Create `MapTitleBlock` component
- [x] Add Curator Pick badge styling
- [x] Implement responsive breakpoints
- [x] Add hover states
- [ ] Integrate with search results grid
- [ ] Update search API to return maps
- [ ] Test with real map data
- [ ] Add "See all maps" link for 3+ results

---

## Next Steps

### For Integration:

1. **Update Search API** (`app/api/search/route.ts`)
   - Query `lists` table for maps matching search term
   - Join with `map_places` to get `placeCount`
   - Return maps alongside places

2. **Update Search Page** (`app/(viewer)/search/page.tsx`)
   - Import MapCard2x1
   - Render maps at top of results (limit to 2-3)
   - Show "See all maps →" if more than 3

3. **Create Map Index Page** (optional)
   - `/maps` route for browsing all maps
   - Use MapCard2x1 or MapTitleBlock

4. **Add to Homepage** (optional, post-launch)
   - Feature map of the week using MapCard2x2

### Sample Query:

```sql
-- Search for maps
SELECT 
  l.id,
  l.slug,
  l.title,
  l.description,
  l.cover_image_url,
  u.username,
  COUNT(mp.id) as place_count
FROM lists l
LEFT JOIN users u ON l.user_id = u.id
LEFT JOIN map_places mp ON mp.list_id = l.id
WHERE 
  l.published = true
  AND (l.title ILIKE $1 OR l.description ILIKE $1)
GROUP BY l.id, u.username
LIMIT 5;
```

---

## Design Rationale

### Why 2px Border?

Heavier border creates instant visual separation from Place cards (1px border). Map cards need to feel like containers of places, not individual places themselves.

### Why "Curator Pick" instead of "Saiko Maps"?

- More humble and subtle
- Doesn't compete with user attribution
- Signals editorial quality without being heavy-handed

### Why Horizontal Layout for 2x1?

- Differentiates from vertical Place cards
- Better use of space in search results
- Image + text side-by-side scans quickly

---

## Summary

✅ **Complete Map Card System Built**

Three production-ready components:
- MapCard2x1 (search results)
- MapCard2x2 (featured/editorial)
- MapTitleBlock (text-only)

Ready for integration with:
- Search results page
- Homepage features
- Map index/browse pages
- Sidebar links

All components are fully responsive, accessible, and match the Field Notes palette exactly.

---

**Date:** February 10, 2026  
**Status:** ✅ Ready for Integration
