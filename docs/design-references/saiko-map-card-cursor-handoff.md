# Map Card System — Cursor Implementation Handoff

## Overview

We need a new `MapCard` component system for displaying maps (curated collections) in search results and editorial surfaces. Maps should be visually distinct from Place cards but work within the existing bento grid.

**Reference prototypes:**
- `saiko-map-card-system.html` — All variants with styling
- `saiko-map-card-responsive.html` — Responsive behavior test

---

## Three Variants to Build

### 1. `MapCard2x1` — Search Results (Primary)
- **Use:** Search results, neighborhood pages, mixed grids
- **Layout:** Horizontal — image left (35% width), content right
- **Grid span:** `grid-column: span 2`

### 2. `MapCard2x2` — Featured / Editorial
- **Use:** Homepage features, "Map of the week", editorial surfaces
- **Layout:** Vertical — image top (full width), content below
- **Grid span:** `grid-column: span 2; grid-row: span 2`

### 3. `MapTitleBlock` — Standalone (No Image)
- **Use:** Sidebars, "Featured on X maps" links, fallback when no image
- **Layout:** Text only, no image
- **Grid span:** Single column (flexible)

---

## Props Interface

```typescript
interface MapCardProps {
  map: {
    slug: string;
    title: string;
    description?: string;
    placeCount: number;
    coverImageUrl?: string;
    neighborhoods?: string[];  // e.g. ["Silver Lake", "Echo Park"]
    authorType: 'saiko' | 'user';
    authorUsername?: string;  // Required if authorType === 'user'
  };
}
```

---

## Content Hierarchy (All Variants)

Render in this order:

1. **Type label** — Always visible, always first
   ```
   MAP · {placeCount} PLACES
   ```
   - Font: 9px, uppercase, letter-spacing 1.5px
   - Color: `--khaki-dark` (#8B7355)

2. **Title**
   - Font: Libre Baskerville, italic
   - Size: 17px (2x1), 22px (2x2), 18px (title block)
   - Color: `--charcoal` (#36454F)

3. **Description** (if exists)
   - Font: System, 12-13px
   - Color: `--khaki-dark`
   - Line clamp: 2 lines max

4. **Meta row**
   - Author + Area, separated by `·`
   - Font: 9px uppercase, letter-spacing 1px
   - Color: `--khaki` (#C3B091)

---

## Author Attribution Logic

```typescript
// In meta row:
if (map.authorType === 'saiko') {
  // Render Curator Pick badge
  <span className="curator-badge">Curator Pick</span>
} else {
  // Render username
  <span>By @{map.authorUsername}</span>
}
```

**Curator Pick badge styling:**
```css
.curator-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 8px;
  text-transform: uppercase;
  letter-spacing: 1px;
  padding: 3px 8px;
  background: rgba(195, 176, 145, 0.2);
  border-radius: 3px;
  color: var(--khaki-dark);
  font-weight: 600;
}

.curator-badge::before {
  content: '★';
  font-size: 7px;
}
```

**Important:** Never show "Saiko Maps" or "Staff Pick" — only "Curator Pick" for Saiko-authored maps.

---

## Visual Differentiation from Place Cards

Map cards must be instantly distinguishable:

| Property | Map Cards | Place Cards |
|----------|-----------|-------------|
| Border | **2px solid #C3B091** | 1px solid rgba(195, 176, 145, 0.2) |
| Type label | `MAP · X PLACES` | None (category in meta) |
| Layout (2x1) | Horizontal | Usually vertical |

---

## Responsive Behavior

### Breakpoints

```css
/* Desktop: 4 columns */
@media (min-width: 901px) { ... }

/* Tablet: 2 columns */
@media (min-width: 601px) and (max-width: 900px) { ... }

/* Mobile: 1 column */
@media (max-width: 600px) { ... }
```

### MapCard2x1 Responsive

```css
/* Desktop & Tablet: Horizontal */
.map-card-2x1 {
  grid-column: span 2;
  display: flex;
  flex-direction: row;
}

.map-card-2x1 .photo {
  width: 35%;
  min-height: 140px;
}

/* Mobile: Flip to vertical */
@media (max-width: 600px) {
  .map-card-2x1 {
    grid-column: span 1;
    flex-direction: column;
  }
  
  .map-card-2x1 .photo {
    width: 100%;
    height: 160px;
    min-height: auto;
  }
}
```

### MapCard2x2 Responsive

```css
/* Desktop */
.map-card-2x2 {
  grid-column: span 2;
  grid-row: span 2;
}

/* Tablet: Full width, single row */
@media (max-width: 900px) {
  .map-card-2x2 {
    grid-column: span 2;
    grid-row: span 1;
  }
}

/* Mobile: Single column */
@media (max-width: 600px) {
  .map-card-2x2 {
    grid-column: span 1;
    grid-row: span 1;
  }
}
```

---

## CSS Variables (Field Notes Palette)

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

## Component Structure Example

```tsx
// MapCard2x1.tsx
export function MapCard2x1({ map }: MapCardProps) {
  return (
    <Link 
      href={`/map/${map.slug}`}
      className="map-card-2x1"
    >
      {map.coverImageUrl && (
        <div 
          className="photo"
          style={{ backgroundImage: `url(${map.coverImageUrl})` }}
        />
      )}
      <div className="info">
        <div className="type-label">
          Map · {map.placeCount} {map.placeCount === 1 ? 'place' : 'places'}
        </div>
        <h3 className="title">{map.title}</h3>
        {map.description && (
          <p className="description">{map.description}</p>
        )}
        <div className="meta-row">
          {map.authorType === 'saiko' ? (
            <span className="curator-badge">Curator Pick</span>
          ) : (
            <span>By @{map.authorUsername}</span>
          )}
          {map.neighborhoods?.length > 0 && (
            <>
              <span className="separator">·</span>
              <span>{map.neighborhoods.slice(0, 2).join(', ')}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
```

---

## File Locations

Create components in:
```
app/components/
  MapCard2x1.tsx
  MapCard2x2.tsx
  MapTitleBlock.tsx
```

Or as a single file with variants:
```
app/components/MapCard.tsx  (with MapCard2x1, MapCard2x2, MapTitleBlock exports)
```

---

## Integration with Search Results

The existing search page at `app/(viewer)/search/page.tsx` uses `BentoGrid` with Place cards. Map cards should:

1. Appear in the same grid alongside Place cards
2. Use the 2x1 variant for search results
3. Be visually distinct via the 2px border + type label

**Suggested placement:** Maps appear at the top of results (before Places), limited to 2-3 max. If more maps match, show "See all maps →" link.

---

## Checklist

- [ ] Create `MapCard2x1` component
- [ ] Create `MapCard2x2` component  
- [ ] Create `MapTitleBlock` component
- [ ] Add Curator Pick badge styling
- [ ] Implement responsive breakpoints
- [ ] Add hover states (translateY -2px, box-shadow)
- [ ] Integrate with search results grid
- [ ] Test with real map data

---

## Questions?

Reference the prototype files for exact styling. The responsive test file (`saiko-map-card-responsive.html`) is interactive — resize browser to see all breakpoints.
