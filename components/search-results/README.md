# HorizontalBentoCard Component

Reusable card component for displaying place information in search results, lists, and collections.

## Spec Compliance

Built according to `saiko-search-results-spec.md` (February 2026).

## Features

### Layout
- **35% photo / 65% info** grid layout
- **180px minimum height**
- **Responsive hover states** - subtle lift and shadow
- **Field Notes aesthetic** - Libre Baskerville, khaki/charcoal palette

### Data Display (with graceful degradation)

#### Always Shown (Required)
- Place name (Libre Baskerville, 17px italic)
- Category (uppercase, khaki)
- Neighborhood

#### Optional Fields (handles missing data gracefully)
- **Photo** - Shows gradient placeholder if missing
- **Price** - $, $$, $$$
- **Cuisine** - More specific than category
- **Status** - Open/Closed with dot indicator + time
- **Signals** - Editorial badges (Eater 38, Michelin, etc.)
- **Coverage Quote** - Editorial excerpt with source attribution
- **Vibe Tags** - Max 3 tags shown
- **Distance** - Miles from user (if location available)

### Graceful Degradation

The card works with minimal data. Only `slug`, `name`, `category`, and `neighborhood` are required. Everything else enriches but isn't required.

**Minimum viable card:**
```tsx
<HorizontalBentoCard 
  place={{
    slug: 'restaurant-name',
    name: 'Restaurant Name',
    category: 'Eat',
    neighborhood: 'Echo Park',
  }}
/>
```

**Fully enriched card:**
```tsx
<HorizontalBentoCard 
  place={{
    slug: 'burritos-la-palma',
    name: 'Burritos La Palma',
    category: 'Tacos',
    neighborhood: 'Echo Park',
    price: '$',
    cuisine: 'Mexican',
    photoUrl: 'https://...',
    isOpen: true,
    closesAt: '10pm',
    signals: [
      { type: 'eater38', label: 'Eater 38' },
      { type: 'chefrec', label: 'Chef Rec' },
    ],
    coverageQuote: 'The flour tortillas are made to order...',
    coverageSource: 'Eater LA',
    vibeTags: ['Cash only', 'No frills', 'Counter service'],
    distanceMiles: 0.4,
  }}
/>
```

## Usage

### In Search Results Page
```tsx
import { HorizontalBentoCard } from '@/components/search-results/HorizontalBentoCard';

<div className="results-grid">
  {places.map(place => (
    <HorizontalBentoCard key={place.slug} place={place} />
  ))}
</div>
```

### Responsive Grid
```css
.results-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

@media (min-width: 900px) {
  .results-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
}
```

## Signal Types

Supported editorial signals:
- `eater38` - Eater 38
- `latimes101` - LA Times 101
- `michelin` - Michelin Guide
- `chefrec` - Chef Recommendation
- `infatuation` - The Infatuation

## Design Tokens

From Field Notes palette:
- `#FFFDF7` - Warm white (card background)
- `#36454F` - Charcoal (text)
- `#C3B091` - Khaki (meta text)
- `#8B7355` - Leather (tags, source)
- `#4A7C59` - Open green (status)
- Libre Baskerville - Serif for names and quotes
- System sans - UI text

## Demo

View the component with various data states:
```
http://localhost:3001/search-results-demo
```

## Future Enhancements

- [ ] Skeleton loading state
- [ ] Save/bookmark button (optional prop)
- [ ] Analytics tracking on click
- [ ] Larger "featured" variant for homepage (40% photo)
