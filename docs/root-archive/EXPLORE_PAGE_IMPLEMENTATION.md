# Saiko Maps — Explore Page Implementation Summary

**Date:** February 10, 2026  
**Status:** ✅ Complete — Ready for API Integration  
**Reference:** `docs/wireframes/saiko-explore-wireframe-v1.html`

---

## Overview

Built the complete Explore page with two modes:
- **Browse Mode** (no query): Editorial sections with discovery-first feel
- **Search Mode** (query present): Results with Priority Zone logic

---

## Components Created

### File Structure

```
app/explore/
├── page.tsx                        ← Main explore page
├── types.ts                        ← TypeScript interfaces
└── components/
    ├── ExploreSearchBar.tsx        ← Prominent centered search
    ├── FilterTabs.tsx              ← Horizontal scrolling filters
    ├── ViewToggle.tsx              ← Global grid/list toggle
    ├── SectionHeader.tsx           ← Section titles with optional links
    ├── ExploreMapCard.tsx          ← Map cards (standard + featured)
    ├── MapListItem.tsx             ← Map list items (2-col grid)
    ├── PlaceListItem.tsx           ← Place list items (search results)
    ├── SearchResultsHeader.tsx     ← Query + count display
    ├── EmptyState.tsx              ← No results state
    └── index.ts                    ← Barrel export

docs/
├── saiko-explore-implementation-spec.md
└── wireframes/
    └── saiko-explore-wireframe-v1.html
```

---

## Mode Logic

### Browse Mode (Default)

**URL:** `/explore`

**Sections (in order):**
1. **Popular This Week** — Discovery-first, peer cards only
2. **Curator Picks** — Editorial, featured 2×2 allowed
3. **By Neighborhood** — List view only

**Features:**
- Global view toggle (grid/list) applies to all sections
- Filter tabs affect all sections
- "Near Me" requests location permission only on tap

### Search Results Mode

**URL:** `/explore?q={query}`

**Layout:**
1. Search results header with query + counts
2. Maps section with Priority Zone rule
3. Places section (list view, max 6 shown)

**Priority Zone Rule (CRITICAL):**
- First 4 map cards must be equal weight (standard size)
- No featured 2×2 cards in first 4 results
- Featured cards only allowed after scrolling past first block
- This preserves trust: "these are matches" not "this is the answer"

---

## Components

### 1. ExploreSearchBar

**Styling:**
- Background: `#FFFDF7`
- Border: `1px solid rgba(195, 176, 145, 0.3)`
- Border radius: `12px`
- Padding: `14px 20px`
- Box shadow: `0 2px 8px rgba(139, 115, 85, 0.06)`
- Placeholder: Libre Baskerville italic

**Behavior:**
- Form-based GET to `/explore?q=...`
- Clear button appears when text entered
- Submit on Enter

### 2. FilterTabs

**Filters:**
- All
- Restaurants
- Coffee
- Bars
- Neighborhoods
- Near Me

**Styling:**
- Active: `bg: #36454F`, `color: #F5F0E1`
- Inactive: `bg: rgba(195, 176, 145, 0.15)`, `color: #8B7355`
- Padding: `8px 16px`
- Border radius: `20px`
- Font: `11px uppercase, letter-spacing 1px`

**"Near Me" behavior:**
- Only requests location permission on tap
- Never on page load
- If denied: Alert + fallback to "All" filter

### 3. ViewToggle

**Modes:** Grid | List

**Styling:**
- Container: `bg: rgba(195, 176, 145, 0.15)`, `padding: 4px`, `border-radius: 8px`
- Active button: `bg: #FFFDF7`, `color: #36454F`
- Inactive button: `bg: transparent`, `color: #8B7355`

**Behavior:**
- One toggle for entire page (not per-section)
- Persists across sections in Browse mode

### 4. ExploreMapCard

**Two sizes:**
- Standard: Single column span
- Featured: 2 column span (only in browse mode Curator Picks)

**Card anatomy:**
1. Image (16:10 aspect ratio, or 16:9 for featured)
2. Curator badge (if applicable, inside card body or image overlay)
3. Title (Libre Baskerville italic, 14px or 18px featured)
4. Tagline (1 line, 12-13px, leather color)
5. Meta: `{placeCount} places · {creatorName}`

**Visual:**
- Border: `1px solid rgba(195, 176, 145, 0.15)`
- Hover: lift -2px + shadow
- Featured: Curator Pick badge overlays image top-left

### 5. MapListItem

**Layout:** 2-column grid on desktop, 1-column mobile

**Anatomy:**
1. Thumbnail (44×44px, 6px radius)
2. Info block (title, tagline, meta)
3. Badge (right side, if curator pick)

**Meta format:** `{placeCount} places · {creatorName}`

### 6. PlaceListItem

**Layout:** Same as MapListItem

**Meta format:** `{neighborhood} · On {mapCount} maps`

### 7. SearchResultsHeader

**Displays:**
- Query in quotes (Libre Baskerville italic, 20px)
- Result counts: `{maps} maps · {places} places`

### 8. EmptyState

**Shows when:** Search returns 0 results

**Content:**
- Search icon (48px, opacity 0.3)
- "No maps or places found"
- "Try a different search term or browse our curator picks"

---

## Responsive Breakpoints

```css
/* Desktop: 4 columns */
@media (min-width: 901px) {
  .map-grid { grid-template-columns: repeat(4, 1fr); }
}

/* Tablet: 2 columns */
@media (min-width: 501px) and (max-width: 900px) {
  .map-grid { grid-template-columns: repeat(2, 1fr); }
}

/* Mobile: 1 column */
@media (max-width: 500px) {
  .map-grid { grid-template-columns: 1fr; }
}

/* List view: 2 cols → 1 col */
@media (max-width: 700px) {
  .map-list { grid-template-columns: 1fr; }
}
```

**Featured card behavior:**
- Desktop: spans 2 columns
- Mobile (≤500px): collapses to 1 column

---

## API Integration (TODO)

### Endpoints Needed

```typescript
// Browse mode
GET /api/maps/popular          // Popular This Week
GET /api/maps/curated          // Curator Picks
GET /api/maps/by-neighborhood  // By Neighborhood

// Search mode
GET /api/search?q={query}      // Returns: { maps: [], places: [] }
```

### Sample Response Schema

```typescript
// /api/maps/popular
{
  maps: [
    {
      id: string,
      slug: string,
      title: string,
      description: string,        // Use as tagline (truncate to 1 line)
      placeCount: number,
      coverImageUrl: string,
      author: {
        username: string,
        type: 'saiko' | 'user'
      },
      neighborhoods: string[],
      updatedAt: Date
    }
  ]
}

// /api/search
{
  query: string,
  maps: MapResult[],
  places: PlaceResult[]
}
```

### Query Logic

```sql
-- Popular This Week (most viewed in last 7 days)
SELECT * FROM lists
WHERE published = true
ORDER BY view_count DESC
LIMIT 12;

-- Curator Picks (Saiko-authored only)
SELECT * FROM lists
WHERE published = true
  AND author_type = 'saiko'
ORDER BY updated_at DESC
LIMIT 10;

-- By Neighborhood
SELECT * FROM lists
WHERE published = true
GROUP BY neighborhood
ORDER BY neighborhood ASC;
```

---

## Current State

### ✅ Complete
- All 9 components built
- Browse mode layout
- Search mode layout
- Priority Zone logic
- Filter tabs + view toggle
- Responsive breakpoints
- Empty state
- Mock data for testing

### 🔄 Using Mock Data
- Browse mode shows hardcoded maps
- Search mode shows empty results
- Ready for API integration

### 📋 Next Steps
1. Create API endpoints (`/api/maps/popular`, `/api/maps/curated`, etc.)
2. Replace mock data with real fetches
3. Add loading states
4. Test with real map/place data
5. Add "See all" page routes

---

## Color Palette (Field Notes)

| Token | Value | Usage |
|-------|-------|-------|
| `--parchment` | `#F5F0E1` | Page background |
| `--warm-white` | `#FFFDF7` | Card backgrounds |
| `--charcoal` | `#36454F` | Primary text, active states |
| `--khaki` | `#C3B091` | Meta text, borders |
| `--leather` | `#8B7355` | Taglines, secondary text |

---

## Key Decisions

### 1. Why "Curator Pick" not "Saiko Maps"?
More humble and subtle. Doesn't compete with user attribution.

### 2. Why Priority Zone rule in search?
Preserves trust calibration. First 4 results are equal peers — no editorial bias in top results.

### 3. Why global view toggle?
Simpler UX. User sets preference once, applies everywhere.

### 4. Why featured only in Curator Picks?
Editorial context allows bigger cards. Popular section stays discovery-first with peer cards.

### 5. Why list view for "By Neighborhood"?
Higher density for browsing many neighborhoods. Grid would be too sparse.

---

## Testing Checklist

### Browse Mode
- [ ] Visit `/explore` (no query)
- [ ] See 3 sections: Popular, Curator Picks, By Neighborhood
- [ ] View toggle switches all sections
- [ ] Filter tabs affect results
- [ ] "Near Me" prompts location only on tap
- [ ] Featured 2×2 appears in Curator Picks only
- [ ] All cards link to `/map/[slug]`

### Search Mode
- [ ] Visit `/explore?q=coffee`
- [ ] See search results header with counts
- [ ] First 4 map cards are equal size (Priority Zone)
- [ ] Places section shows below maps
- [ ] Empty state appears for no results
- [ ] View toggle switches maps section only

### Responsive
- [ ] Desktop (>900px): 4 column grid
- [ ] Tablet (501-900px): 2 column grid
- [ ] Mobile (≤500px): 1 column grid
- [ ] List view: 2 cols → 1 col at 700px
- [ ] Featured cards collapse on mobile

---

## Known Limitations

1. **Mock data only** — No real API calls yet
2. **No pagination** — Shows limited results per section
3. **No "See all" routes** — Links exist but pages not built
4. **No loading skeleton** — Shows simple "Loading..." text
5. **Filter functionality** — Filters change state but don't affect results yet

All of these are expected for this implementation phase and can be added incrementally.

---

## Summary

✅ **Explore page is structurally complete** with:
- 9 reusable components
- Browse and Search modes
- Priority Zone logic
- Responsive grid/list layouts
- Filter tabs + view toggle
- Curator Pick attribution
- Empty states

Ready for API integration and real data testing.

---

**Date:** February 10, 2026  
**Status:** ✅ Components complete, ready for API layer
