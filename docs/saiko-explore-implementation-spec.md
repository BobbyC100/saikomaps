# Saiko Maps — Explore Page Implementation Spec

**For Cursor · February 2026**
Reference wireframe: `saiko-explore-wireframe-v1.html`

---

## Overview

The Explore page is where users browse and search for maps. Two modes:
- **Browse** (no query): Editorial framing allowed, discovery-first
- **Search** (query present): Distributed weight required, no featured cards in Priority Zone

---

## Page Structure

```
┌─────────────────────────────────────────────────┐
│ Header: Logo (left) | Search + Profile (right)  │
├─────────────────────────────────────────────────┤
│ Search Bar (centered, prominent)                │
├─────────────────────────────────────────────────┤
│ Filter Tabs (horizontal scroll)                 │
├─────────────────────────────────────────────────┤
│ Global View Toggle: [Grid] [List]               │
├─────────────────────────────────────────────────┤
│ Content Sections...                             │
└─────────────────────────────────────────────────┘
```

---

## Route

```
/explore
/explore?q={searchQuery}
```

---

## Mode Logic

```typescript
type ExploreMode = 'browse' | 'search';
type LayoutMode = 'explore' | 'search';

// Determine mode from URL
const exploreMode: ExploreMode = searchParams.q ? 'search' : 'browse';

// Layout rules follow mode
const layoutMode: LayoutMode = exploreMode === 'search' ? 'search' : 'explore';
```

**Layout constraints by mode:**

| Mode | Featured 2×2 allowed? | Priority Zone rule |
|------|----------------------|-------------------|
| `explore` | Yes (after first section) | N/A |
| `search` | Only after 4+ peer cards | First 4 cards must be equal weight |

---

## Components

### 1. Search Bar

```tsx
// Centered, max-width 600px
// Libre Baskerville italic placeholder
<SearchBar 
  placeholder="Search maps, places, or neighborhoods..."
  onSearch={(query) => router.push(`/explore?q=${query}`)}
/>
```

**Styling:**
- Background: `#FFFDF7` (warm white)
- Border: `1px solid rgba(195, 176, 145, 0.3)`
- Border radius: `12px`
- Padding: `14px 20px`
- Box shadow: `0 2px 8px rgba(139, 115, 85, 0.06)`

---

### 2. Filter Tabs

```tsx
const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'restaurants', label: 'Restaurants' },
  { id: 'coffee', label: 'Coffee' },
  { id: 'bars', label: 'Bars' },
  { id: 'neighborhoods', label: 'Neighborhoods' },
  { id: 'near-me', label: 'Near Me' },
];
```

**Styling:**
- Active: `bg: #36454F`, `color: #F5F0E1`
- Inactive: `bg: rgba(195, 176, 145, 0.15)`, `color: #8B7355`
- Padding: `8px 16px`
- Border radius: `20px`
- Font: `11px uppercase, letter-spacing 1px`

**"Near Me" behavior:**
- Only request location permission on tap (never on page load)
- If denied: show fallback message "Use a neighborhood filter instead"

---

### 3. Global View Toggle

One toggle for entire page (not per-section).

```tsx
type ViewMode = 'grid' | 'list';

<ViewToggle 
  value={viewMode} 
  onChange={setViewMode}
/>
```

**Styling:**
- Container: `bg: rgba(195, 176, 145, 0.15)`, `padding: 4px`, `border-radius: 8px`
- Active button: `bg: #FFFDF7`, `color: #36454F`
- Inactive button: `bg: transparent`, `color: #8B7355`

---

### 4. Map Card (Grid View)

Two sizes:
- **Standard (2×1)**: 1 column span
- **Featured (2×2)**: 2 column span (only in `explore` mode, after Priority Zone)

```tsx
interface MapCardProps {
  id: string;
  title: string;
  tagline?: string;        // NEW: 1-line description
  placeCount: number;
  creatorName: string;
  isCuratorPick: boolean;
  coverImageUrl?: string;
  featured?: boolean;      // Only true in explore mode, after first section
}
```

**Card anatomy (top to bottom):**
1. Image area (16:10 aspect ratio, no overlays)
2. Card body:
   - Badge (if curator pick): `CURATOR PICK`
   - Title: Libre Baskerville italic
   - Tagline: 1 line, leather color
   - Meta: `{placeCount} places · {creatorName}`

**Styling:**
```css
.map-card {
  background: #FFFDF7;
  border-radius: 12px;
  border: 1px solid rgba(195, 176, 145, 0.15);
  overflow: hidden;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.map-card:hover {
  box-shadow: 0 4px 20px rgba(139, 115, 85, 0.12);
  transform: translateY(-2px);
}

.map-card-image {
  aspect-ratio: 16 / 10;
}

.map-card-body {
  padding: 14px 16px;
}

.map-card-badge {
  display: inline-block;
  font-size: 8px;
  text-transform: uppercase;
  letter-spacing: 1px;
  padding: 4px 8px;
  border-radius: 4px;
  margin-bottom: 8px;
}

.map-card-badge.curator {
  background: #36454F;
  color: #F5F0E1;
}

.map-card-title {
  font-family: 'Libre Baskerville', serif;
  font-size: 14px;  /* 18px for featured */
  font-style: italic;
  color: #36454F;
  margin-bottom: 4px;
}

.map-card-tagline {
  font-size: 12px;
  color: #8B7355;
  margin-bottom: 6px;
  line-height: 1.4;
}

.map-card-meta {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #C3B091;
}
```

---

### 5. Map List Item (List View)

2-column grid layout on desktop, 1-column on mobile.

```tsx
interface MapListItemProps {
  id: string;
  title: string;
  tagline?: string;
  placeCount: number;
  creatorName: string;
  isCuratorPick: boolean;
  thumbnailUrl?: string;
  updatedAt?: Date;
}
```

**Item anatomy (left to right):**
1. Thumbnail: 44×44px, 6px radius
2. Info block:
   - Title: Libre Baskerville italic, 13px
   - Tagline: 1 line, 11px, leather color
   - Meta: `{placeCount} places · {creatorName}` or `Updated {timeAgo}`
3. Badge (right, if curator pick)

**Styling:**
```css
.map-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1px;
  background: rgba(195, 176, 145, 0.15);
  border-radius: 12px;
  overflow: hidden;
}

@media (max-width: 700px) {
  .map-list { grid-template-columns: 1fr; }
}

.map-list-item {
  background: #FFFDF7;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.map-list-thumb {
  width: 44px;
  height: 44px;
  border-radius: 6px;
  flex-shrink: 0;
}

.map-list-title {
  font-family: 'Libre Baskerville', serif;
  font-size: 13px;
  font-style: italic;
  color: #36454F;
}

.map-list-tagline {
  font-size: 11px;
  color: #8B7355;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.map-list-meta {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #C3B091;
}

.map-list-badge {
  font-size: 8px;
  text-transform: uppercase;
  letter-spacing: 1px;
  padding: 3px 8px;
  border-radius: 4px;
  flex-shrink: 0;
}
```

---

### 6. Place List Item (Search Results)

Used in search results under "Places matching {query}".

```tsx
interface PlaceListItemProps {
  id: string;
  slug: string;
  name: string;
  tagline?: string;        // From Voice Engine or editorial
  neighborhood: string;
  mapCount: number;        // "On X maps"
  thumbnailUrl?: string;
}
```

**Meta format:** `{neighborhood} · On {mapCount} maps`

---

## Browse Mode Sections

Order matters — discovery first, editorial second:

```tsx
// Browse mode section order
const BROWSE_SECTIONS = [
  { id: 'popular', title: 'Popular This Week', featured: false },
  { id: 'curator', title: 'Curator Picks', featured: true },    // 2×2 allowed here
  { id: 'neighborhoods', title: 'By Neighborhood', viewMode: 'list' },
];
```

---

## Search Results Mode

```tsx
// Search results structure
interface SearchResults {
  query: string;
  maps: MapResult[];
  places: PlaceResult[];
}
```

**Layout:**
1. Query header: `"{query}"` in Libre Baskerville italic, 20px
2. Result count: `{maps.length} maps · {places.length} places` in khaki uppercase
3. Maps section: **4 peer cards first** (no featured in Priority Zone)
4. Places section: List view with "View all {count} →" link

**Priority Zone rule (critical):**
- First 4 map cards must be equal weight (standard 2×1)
- Featured 2×2 cards only allowed after scrolling past first block
- This preserves trust calibration: "these are matches" not "this is the answer"

---

## Responsive Grid

```css
.map-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

@media (max-width: 900px) {
  .map-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 500px) {
  .map-grid { grid-template-columns: 1fr; }
}

/* Featured card spans 2 columns (collapses to 1 on mobile) */
.map-card.featured {
  grid-column: span 2;
}

@media (max-width: 500px) {
  .map-card.featured { grid-column: span 1; }
}
```

---

## Empty State

When search returns no results:

```tsx
<EmptyState
  icon={<SearchIcon />}
  title="No maps or places found"
  description="Try a different search term or browse our curator picks"
/>
```

---

## Data Requirements

### API Endpoints

```typescript
// Browse mode
GET /api/maps/popular    // Popular This Week
GET /api/maps/curated    // Curator Picks
GET /api/maps/by-neighborhood?neighborhood={slug}

// Search mode
GET /api/search?q={query}
// Returns: { maps: MapResult[], places: PlaceResult[] }
```

### Tagline Source

Taglines come from:
1. Map `description` field (truncated to 1 line)
2. Place `descriptor` field (curator note) or Voice Engine tagline
3. Fallback: omit tagline if none available

---

## Color Reference (Field Notes)

| Token | Value | Usage |
|-------|-------|-------|
| `--parchment` | `#F5F0E1` | Page background |
| `--warm-white` | `#FFFDF7` | Card backgrounds |
| `--charcoal` | `#36454F` | Primary text |
| `--khaki` | `#C3B091` | Meta text, inactive states |
| `--leather` | `#8B7355` | Taglines, secondary text |

---

## Files to Create

```
app/explore/page.tsx           # Main explore page
app/explore/components/
  SearchBar.tsx
  FilterTabs.tsx
  ViewToggle.tsx
  MapCard.tsx
  MapListItem.tsx
  PlaceListItem.tsx
  SearchResultsHeader.tsx
  EmptyState.tsx
  SectionHeader.tsx
app/explore/explore.module.css  # Styles
```

---

## Checklist

- [ ] Search bar with Libre Baskerville placeholder
- [ ] Filter tabs with horizontal scroll
- [ ] Global view toggle (grid/list)
- [ ] Map cards with taglines
- [ ] List items with taglines (2-col grid)
- [ ] Browse mode: Popular → Curator Picks → By Neighborhood
- [ ] Search mode: 4 peers first, no featured in Priority Zone
- [ ] Empty state
- [ ] Responsive: 4-col → 2-col → 1-col
- [ ] "Near Me" only prompts location on tap
