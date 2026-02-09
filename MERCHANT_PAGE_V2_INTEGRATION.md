# Merchant Page v2 — Integration Guide

**Date:** February 9, 2026  
**Status:** All components ready, integration in progress

---

## Component Inventory (All Complete!)

### Hero & Actions
- ✅ `HeroSection.tsx` + CSS — Photo, badges, name, meta, status
- ✅ `ActionStrip.tsx` + CSS — Directions, Call, Instagram
- ✅ `GalleryLightbox.tsx` + CSS — Fullscreen photo viewer

### Bento Grid Cards
- ✅ `HoursCard.tsx` + CSS — 2-col, expand/collapse
- ✅ `CoverageCard.tsx` + CSS — 4-col, quote with vibe tag
- ✅ `GalleryCard.tsx` + CSS — 3-col, thumbnail collage
- ✅ `CuratorCard.tsx` + CSS — 3-col, lighter editorial
- ✅ `MapCard.tsx` + CSS — 6-col, preview + address
- ✅ `DetailsCard.tsx` + CSS — 6-col, info rows
- ✅ `VibeCard.tsx` + CSS — 6-col, tag cloud
- ✅ `AlsoOnCard.tsx` + CSS — 6-col, related maps

---

## Page Structure Template

```tsx
'use client';

import { useState } from 'react';
import { HeroSection } from '@/components/merchant/HeroSection';
import { ActionStrip } from '@/components/merchant/ActionStrip';
import { GalleryLightbox } from '@/components/merchant/GalleryLightbox';
import { HoursCard } from '@/components/merchant/HoursCard';
import { CoverageCard } from '@/components/merchant/CoverageCard';
import { GalleryCard } from '@/components/merchant/GalleryCard';
import { CuratorCard } from '@/components/merchant/CuratorCard';
import { MapCard } from '@/components/merchant/MapCard';
import { DetailsCard } from '@/components/merchant/DetailsCard';
import { VibeCard } from '@/components/merchant/VibeCard';
import { AlsoOnCard } from '@/components/merchant/AlsoOnCard';

export default function MerchantPage() {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // ... fetch data ...

  // Handlers
  const openGallery = (index: number = 0) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: location.name,
          text: location.tagline || `Check out ${location.name}`,
          url: window.location.href,
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <div style={{ background: '#F5F0E1', minHeight: '100vh' }}>
      {/* Hero Section */}
      <HeroSection
        name={location.name}
        category={location.category}
        neighborhood={location.neighborhood}
        price={priceSymbol}
        isOpen={hoursData.isOpen}
        statusText={statusText}
        photoUrl={location.photoUrl}
        photoCount={location.photoUrls?.length || 0}
        onHeroClick={() => openGallery(0)}
        onShareClick={handleShare}
      />

      {/* Action Strip */}
      <ActionStrip
        latitude={location.latitude}
        longitude={location.longitude}
        phone={location.phone}
        instagram={location.instagram}
      />

      {/* Bento Grid */}
      <div
        style={{
          padding: '16px 20px',
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: 12,
        }}
      >
        {/* Row 1: Hours (2) + Coverage (4) */}
        <HoursCard
          todayHours={hoursData.today}
          isOpen={hoursData.isOpen}
          statusText={statusText}
          fullWeek={hoursData.fullWeek}
          isIrregular={hoursData.isIrregular}
        />
        <CoverageCard
          pullQuote={location.pullQuote}
          pullQuoteSource={location.pullQuoteSource}
          pullQuoteAuthor={location.pullQuoteAuthor}
          sources={location.sources}
          vibeTag={location.vibeTags?.[0]}
        />

        {/* Row 2: Gallery (3) + Curator (3) */}
        {location.photoUrls && location.photoUrls.length > 0 && (
          <GalleryCard
            photos={location.photoUrls}
            onThumbnailClick={openGallery}
          />
        )}
        {location.curatorNote && (
          <CuratorCard note={location.curatorNote} />
        )}

        {/* Row 3: Map (6) */}
        <MapCard
          address={location.address}
          neighborhood={location.neighborhood}
          latitude={location.latitude}
          longitude={location.longitude}
          onMapClick={() => {
            // Open Expanded Map View
          }}
        />

        {/* Row 4: Details (6) */}
        <DetailsCard
          website={location.website}
          restaurantGroupName={restaurantGroup?.name}
          restaurantGroupSlug={restaurantGroup?.slug}
          serviceOptions={serviceOptions}
          reservationsNote={reservationsNote}
          parkingNote={parkingNote}
          isAccessible={isAccessible}
        />

        {/* Row 5: Vibe (6) */}
        <VibeCard vibeTags={location.vibeTags} />

        {/* Row 6: Also On (6) */}
        <AlsoOnCard maps={appearsOn} />
      </div>

      {/* Gallery Lightbox */}
      {lightboxOpen && location.photoUrls && (
        <GalleryLightbox
          photos={location.photoUrls}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  );
}
```

---

## Graceful Degradation Logic

### Coverage/Curator Row

```tsx
// Determine what editorial content exists
const hasCoverage = !!(
  location.pullQuote ||
  (location.sources?.length && location.sources.some(s => s.publication && s.title))
);
const hasCurator = !!location.curatorNote;

// Apply graceful degradation
{hasCoverage && (
  <CoverageCard
    {...coverageProps}
    // Coverage is 4-col by default
    // If no Curator, it can stay 4-col (Gallery will be 6-col on next row)
  />
)}

{hasCurator && (
  <CuratorCard
    note={location.curatorNote}
    // Curator is 3-col by default
    // If no Coverage, expand to 4-col via CSS override or inline style
  />
)}
```

### Gallery Row

```tsx
// Gallery size depends on whether Curator exists
const hasGallery = location.photoUrls && location.photoUrls.length > 0;

{hasGallery && (
  <GalleryCard
    photos={location.photoUrls}
    onThumbnailClick={openGallery}
    // Gallery is 3-col by default
    // If no Curator (or no Coverage), Gallery expands to 6-col
    // Handle via CSS class or inline style based on hasCurator
  />
)}
```

### Expansion Strategy

| Scenario | Coverage | Curator | Gallery | Implementation |
|----------|----------|---------|---------|----------------|
| Full data | 4-col | 3-col | 3-col (new row) | Default spans |
| No Curator | 4-col | — | 6-col (new row) | Gallery: `grid-column: span 6` |
| No Coverage | — | 4-col | 3-col (same row) | Curator: `grid-column: span 4`, Gallery: `span 3` |
| No editorial | — | — | 3-col (pairs with Hours?) | Gallery: `span 3` or `span 6` based on Hours |

**Simplest approach:** Use conditional inline styles or className based on presence checks:

```tsx
<CoverageCard ... />
<GalleryCard 
  style={{ 
    gridColumn: hasCurator ? 'span 3' : 'span 6' 
  }}
  ...
/>
<CuratorCard 
  style={{ 
    gridColumn: hasCoverage ? 'span 3' : 'span 4' 
  }}
  ...
/>
```

---

## Data Preparation

### Hours Parsing

Use existing `parseHours()` utility from current page.tsx:

```tsx
const hoursData = parseHours(location.hours);
// Returns: { today, isOpen, closesAt, opensAt, fullWeek, isIrregular }
```

### Status Text

```tsx
const statusText = hoursData.isOpen
  ? `Open · Closes ${hoursData.closesAt}`
  : `Closed · Opens ${hoursData.opensAt}`;
```

### Price Symbol

```tsx
const priceSymbol = location.priceLevel
  ? '$'.repeat(Math.min(location.priceLevel, 3))
  : null;
```

### Service Options

```tsx
// From Google Places (when available)
const serviceOptions = [];
if (location.delivery) serviceOptions.push('Delivery');
if (location.takeout) serviceOptions.push('Takeout');
if (location.dineIn) serviceOptions.push('Dine-in');
```

### Reservations Note

```tsx
// Logic based on reservationUrl or reservable flag
const reservationsNote = location.reservationUrl
  ? 'Recommended'
  : location.reservable
  ? 'Accepted'
  : 'Not accepted';
```

---

## API Updates Needed

The API route `/app/api/places/[slug]/route.ts` should include:

```typescript
// Include restaurant group
include: {
  restaurantGroup: {
    select: {
      name: true,
      slug: true,
      website: true,
    },
  },
},

// Select fields for DetailsCard
select: {
  // ... existing fields ...
  restaurantGroupId: true,
  // Add when Google fields available:
  // delivery: true,
  // takeout: true,
  // dineIn: true,
  // wheelchairAccessible: true,
}
```

---

## CSS Grid Setup

```css
.bentoGrid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12px;
  padding: 16px 20px;
}

/* No need for grid-auto-rows or align-items — let cards size naturally */
```

---

## Mobile Responsive

```css
@media (max-width: 640px) {
  .bentoGrid {
    grid-template-columns: 1fr;
  }
  
  /* All span classes become full-width */
  .col2,
  .col3,
  .col4,
  .col6 {
    grid-column: span 1 !important;
  }
  
  /* Action Strip stacks vertically */
  .actionStrip {
    flex-direction: column;
    align-items: stretch;
  }
}
```

---

## Implementation Checklist

**Components:**
- [x] HeroSection
- [x] ActionStrip
- [x] GalleryLightbox
- [x] HoursCard
- [x] CoverageCard
- [x] GalleryCard
- [x] CuratorCard
- [x] MapCard
- [x] DetailsCard
- [x] VibeCard
- [x] AlsoOnCard

**Integration:**
- [ ] Update main `/app/(viewer)/place/[slug]/page.tsx`
- [ ] Implement graceful degradation logic
- [ ] Wire up gallery lightbox
- [ ] Wire up share functionality
- [ ] Wire up Expanded Map View
- [ ] Update API to include restaurantGroup
- [ ] Update CSS for new grid structure

**Testing:**
- [ ] All cards render with full data
- [ ] Graceful degradation works (missing Coverage, Curator, Gallery)
- [ ] Gallery lightbox keyboard navigation
- [ ] Share button (native or fallback)
- [ ] Hours expand/collapse
- [ ] Details expand/collapse (if >4 rows)
- [ ] Mobile responsive layout
- [ ] All links work correctly

---

**Next:** Integrate components into main page.tsx
