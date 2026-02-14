# 4-Column Bento Grid System - Complete

**Date:** February 7, 2026  
**Status:** ✅ Complete and Ready

---

## What Was Built

### Card Components (All 4 Sizes)

1. **PlaceCard1x1** (`/components/search-results/PlaceCard1x1.tsx`)
   - Minimal teaser card
   - 60% photo / 40% info
   - Name + category only
   - 1 column × 1 row

2. **PlaceCard1x2** (`/components/search-results/PlaceCard1x2.tsx`)
   - Full vertical card
   - 55% photo / 45% info
   - Name + meta + quote + footer
   - 1 column × 2 rows

3. **PlaceCard2x1** (`/components/search-results/PlaceCard2x1.tsx`)
   - Horizontal card (based on HorizontalBentoCard)
   - 40% photo left / 60% info right
   - Name + meta + quote + footer
   - 2 columns × 1 row

4. **PlaceCard2x2** (`/components/search-results/PlaceCard2x2.tsx`)
   - Hero card (explore mode only)
   - 55% photo / 45% info
   - Name + meta + quote + source + footer
   - Larger typography (16px name)
   - 2 columns × 2 rows

### Grid System

**BentoGrid Component** (`/components/search-results/BentoGrid.tsx`)
- 4-column CSS Grid with dense packing
- Auto-rows: 120px, gap: 12px
- Mode toggle: `search` | `explore`
- Responsive breakpoints:
  - Desktop (>900px): 4 columns
  - Tablet (641-900px): 2 columns
  - Mobile (≤640px): 1 column

### Shared Types

**types.ts** (`/components/search-results/types.ts`)
- `PlaceCardData` interface
- `Signal` and `SignalType` types
- Used across all card components

### Demo Page

**Updated Demo** (`/app/(viewer)/search-results-demo/page.tsx`)
- Shows canonical priority zone layout (search mode)
- Four 1×2 cards in first 2 rows (equal weight)
- Additional cards demonstrating grid packing
- Educational callouts explaining priority zone concept

---

## Key Design Decisions

### Priority Zone (First 2 Rows)
In **search mode**:
- No 2×2 Place cards allowed
- Weight distributed across multiple 1×2 or 2×1 cards
- Signals "multiple strong matches" not "editorial curation"

In **explore mode**:
- 2×2 Place cards allowed anywhere
- Hero framing is appropriate

### Responsive Behavior

**Mobile (≤640px)**:
- All cards span 1 column
- 2×1 cards flip to vertical layout (photo top, info bottom)
- Height spans preserved (1×2 = 2 rows, etc.)

**Tablet (641-900px)**:
- 2-column grid
- 2-wide cards span 2, 1-wide span 1

**Desktop (>900px)**:
- Full 4-column layout
- Dense packing (no gaps)

---

## File Structure

```
components/search-results/
├── BentoGrid.tsx           # Grid container
├── PlaceCard1x1.tsx        # Minimal teaser
├── PlaceCard1x2.tsx        # Vertical full
├── PlaceCard2x1.tsx        # Horizontal
├── PlaceCard2x2.tsx        # Hero (explore)
├── types.ts                # Shared interfaces
├── index.ts                # Barrel exports
├── HorizontalBentoCard.tsx # Legacy (replaced by PlaceCard2x1)
└── README.md               # Documentation

app/(viewer)/
└── search-results-demo/
    └── page.tsx            # 4-column demo
```

---

## Usage

### Basic Grid

```tsx
import { BentoGrid, PlaceCard1x2, PlaceCard2x1 } from '@/components/search-results';

<BentoGrid mode="search">
  <PlaceCard1x2 place={place1} />
  <PlaceCard1x2 place={place2} />
  <PlaceCard2x1 place={place3} />
</BentoGrid>
```

### Search Mode (Default)

```tsx
// No 2×2 cards in priority zone
<BentoGrid mode="search">
  {/* Priority zone: Four 1×2 cards */}
  <PlaceCard1x2 place={places[0]} />
  <PlaceCard1x2 place={places[1]} />
  <PlaceCard1x2 place={places[2]} />
  <PlaceCard1x2 place={places[3]} />
  
  {/* After priority zone: Any size OK */}
  <PlaceCard2x2 place={places[4]} />
</BentoGrid>
```

### Explore Mode

```tsx
// 2×2 cards allowed anywhere
<BentoGrid mode="explore">
  <PlaceCard2x2 place={heroPlace} />
  <PlaceCard1x2 place={place1} />
  <PlaceCard1x2 place={place2} />
</BentoGrid>
```

---

## Spec Compliance

### ✅ Card Sizes
- [x] 1×1 (120×120px base)
- [x] 1×2 (120×252px base)
- [x] 2×1 (252×120px base)
- [x] 2×2 (252×252px base)

### ✅ Grid Properties
- [x] 4 columns at desktop
- [x] Dense packing (no gaps)
- [x] 120px row height
- [x] 12px gap
- [x] Responsive (4 → 2 → 1)

### ✅ Priority Zone Rules
- [x] No 2×2 Place cards in search mode
- [x] Distributed weight (4× 1×2 canonical layout)
- [x] 2×2 allowed in explore mode

### ✅ Typography & Colors
- [x] Libre Baskerville for names/quotes
- [x] 10px minimum (--text-micro)
- [x] Field Notes palette
- [x] Signal badges overlay

### ✅ Responsive Breakpoints
- [x] Mobile: 1 column, 2×1 flips vertical
- [x] Tablet: 2 columns
- [x] Desktop: 4 columns

---

## View the Demo

```
http://localhost:3000/search-results-demo
```

You should see:
- **4-column grid** at desktop width
- **Four 1×2 cards** in priority zone (rows 1-2)
- **Mixed sizes** below (2×1, 1×1)
- **Responsive collapse** when resizing
- **Hover effects** on all cards

---

## Next Steps

Now that the bento grid system is complete, you can:

1. **Build the full search results page** (`/app/(viewer)/search/page.tsx`)
   - Header with back button, query, map toggle
   - Filter pills (price, open now, signals)
   - BentoGrid with real data
   - Empty state

2. **Connect to database**
   - Use transformer (`/lib/transformers/placeToCard.ts`)
   - Query places from Prisma
   - Map to PlaceCardData

3. **Add Spotlight & Quiet cards**
   - Create Spotlight2x2, Spotlight2x1
   - Create Quiet1x1, Quiet2x1
   - Mix into grid for editorial surfaces

4. **Map view overlay**
   - Field Notes styled map
   - Pins with labels
   - Card drawer

---

## Migration from HorizontalBentoCard

The original `HorizontalBentoCard` is now `PlaceCard2x1`:
- Same layout (photo left, info right)
- Same proportions (40% / 60%)
- Fits perfectly in 4-column grid as 2×1

Old code using `HorizontalBentoCard` can be updated:

```tsx
// Before
import { HorizontalBentoCard } from '@/components/search-results/HorizontalBentoCard';
<HorizontalBentoCard place={place} />

// After
import { PlaceCard2x1 } from '@/components/search-results';
<PlaceCard2x1 place={place} />
```

---

**Everything is ready for the full search results page implementation!**
