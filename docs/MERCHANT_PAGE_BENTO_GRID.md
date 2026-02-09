# Merchant Page Bento Grid Layout System

## Overview

The Merchant Page uses a **6-column bento grid system** to display place information in a beautiful, magazine-style layout inspired by Field Notes journals. The grid adapts intelligently based on available data, ensuring rich content when available and graceful degradation when sparse.

## Design Philosophy

1. **Editorial First**: Layout prioritizes storytelling and discovery over rigid data display
2. **Adaptive Grid**: Content blocks resize and reposition based on data availability
3. **Visual Balance**: Empty spaces are filled with subtle "Quiet Cards" to maintain rhythm
4. **Responsive**: 6-column grid on desktop, single column on mobile

## Grid System

### Column Spans

Blocks can span different numbers of columns:
- **6 columns** (full width): Hero, Action Cards (wrapper), Gallery, Tips, Best For, Also On
- **3 columns** (half width): Curator's Note, Pull Quote, Excerpt, Vibe, Coverage (in Coverage Row)
- **2 columns** (third width): Hours, Map, Call (in tier3Row — Call swaps to Action Cards when IG missing)

### Layout Tiers

The grid is organized into semantic tiers:

#### Tier 0: Hero + Meta
- **Hero Image** (180px height)
- **Name** (Libre Baskerville 32px italic)
- **Tagline** (14px, appears directly under name) - Optional tagline/subtitle
- **Meta Row** (Category · Neighborhood · Cuisine · Price · Status)

#### Tier 1: Primary Actions & Gallery
- **Action Cards** (6 col) - Website, Instagram, Directions
- **Gallery** (6 col) - Photo collage (1-4+ photos)

#### Tier 2: Editorial Content
- **Curator's Note** (3 col when paired, 6 col alone)
- **Pull Quote** (3 col when paired with Vibe, 6 col alone) - Curated quote from approved sources
- **Excerpt** (3 col when paired, 6 col alone) - Quote from editorial source (only shows if no Pull Quote)
- **Vibe** (3 col when paired, 6 col alone) - Atmosphere tags with dot separators

#### Tier 3: Practical Information
- **Hours** (2 col in tier3Row) - Two-column week view + status footer
- **Map** (2 col in tier3Row) - Stylized Field Notes map tile, opens Expanded Map View
- **Call** (2 col in tier3Row OR swaps to Action Cards) - Phone number card

**Note**: Call swaps into Action Cards row when Instagram is missing. When Call is in Action Cards, Tier 3 becomes Hours + Map only (2 cards).

#### Tier 4: Secondary Content
- **Tips** (6 col) - Multi-column grid of helpful tips with khaki bullets
- **Coverage Row** (6 col total) - Coverage block (50%) + 2 stacked Quiet Cards (50%)
- **Best For** (6 col) - Summary description
- **Also On** (6 col) - Other maps featuring this place

## Content Blocks

### 1. Action Cards (Tier 1)
```tsx
<div className={styles.actionCardsRow}>
  <a className={styles.actionCard} href={websiteUrl}>
    <Globe />
    <span className={styles.actionDetail}>domain.com</span>
  </a>
  <a className={styles.actionCard} href={instagramUrl}>
    <Instagram />
    <span className={styles.actionDetail}>@handle</span>
  </a>
  <a className={styles.actionCard} href={directionsUrl}>
    <MapPin />
    <span className={styles.actionDetail}>Address</span>
  </a>
</div>
```

**Purpose**: Primary user actions (navigate to website, social, maps)  
**Layout**: 3 equal cards in a row — **Icon + value only (NO labels)**  
**Span**: 6 columns (full width wrapper)  
**Behavior**: 
- **Website**: Opens website or Google Maps listing (target="_blank")
- **Instagram**: Opens @handle on Instagram (target="_blank")
- **Directions**: Opens native maps (Apple Maps on iOS, Google Maps on Android/web)

**Swap Logic**:
- **If Instagram missing**: Call card swaps into middle position (Website | Call | Directions)
- **If Instagram present**: Call remains in Tier 3 with Hours + Map

### 2. Gallery (Tier 1)
```tsx
<div className={`${styles.bentoBlock} ${styles.span6}`}>
  <div className={styles.galleryBento4}>
    {/* Dynamic layout: 1, 2, 3, or 4+ photos */}
  </div>
</div>
```

**Purpose**: Photo showcase  
**Layout**: Bento collage (hero photo + thumbnails)  
**Span**: 6 columns

### 3. Curator's Note (Tier 2)
```tsx
<div className={`${styles.bentoBlock} ${styles.fieldNoteBlock} ${styles.span3}`}>
  <div className={styles.blockLabel}>Curator's Note</div>
  <p className={styles.fieldNoteText}>{curatorNote}</p>
  <div className={styles.fieldNoteAttribution}>— {curatorName}</div>
</div>
```

**Purpose**: Personal recommendation from map creator  
**Font**: Libre Baskerville 15px italic  
**Span**: 3 columns (when paired), 6 columns (alone)

### 4. Excerpt (Tier 2)
```tsx
<div className={`${styles.bentoBlock} ${styles.excerptBlock} ${styles.span3}`}>
  "{quote}" — {publication}
</div>
```

**Purpose**: Pull quote from editorial source (only shows if no Pull Quote exists)  
**Style**: Left border accent, serif font  
**Span**: 3 columns

### 5. Pull Quote (Tier 2)
```tsx
<div className={`${styles.bentoBlock} ${styles.excerptBlock} ${styles.span3}`}>
  <div className={styles.blockLabel}>Review</div>
  <div style={{ fontFamily: '"Libre Baskerville", Georgia, serif', fontSize: 15, fontStyle: 'italic' }}>
    "{pullQuote}"
  </div>
  <div>— {pullQuoteSource}, {pullQuoteAuthor}</div>
</div>
```

**Purpose**: Curated quote from approved sources (takes priority over Excerpt)  
**Font**: Libre Baskerville 15px italic  
**Span**: 3 columns (when paired with Vibe), 6 columns (alone)

### 6. Vibe (Tier 2)
```tsx
<div className={`${styles.bentoBlock} ${styles.vibeBlock} ${styles.span3}`}>
  <div className={styles.blockLabel}>Vibe</div>
  <div className={styles.vibeTags}>
    <span>Low-key</span> · <span>Surf crowd</span> · <span>Standing room</span>
  </div>
</div>
```

**Purpose**: Atmosphere tags  
**Font**: Libre Baskerville 15px italic  
**Separators**: Dot separators between tags  
**Span**: 3 columns (when paired with Pull Quote or Curator's Note)

### 7. Hours (Tier 3)
```tsx
<div className={`${styles.bentoBlock} ${styles.hoursBlock}`}>
  <div className={styles.blockLabel}>HOURS</div>
  {hasRegularHours ? (
    <>
      <div className={styles.hoursGrid}>
        {/* Two columns: M-Th and F-Su */}
      </div>
      <div className={styles.hoursStatusFooter}>
        <div className={styles.hoursStatusDot} />
        Open · Closes 11 PM
      </div>
    </>
  ) : (
    <div className={styles.hoursIrregular}>
      <div className={styles.hoursVaryText}>Hours vary</div>
      <a href={googleMapsUrl} className={styles.hoursGoogleLink}>
        View on Google →
      </a>
    </div>
  )}
</div>
```

**Purpose**: Business hours with current status  
**Layout**: Two columns (M-Th, F-Su) + status footer  
**Status Footer**: Shows actionable timing ("Open · Closes 11 PM" or "Closed · Opens 7 AM")  
**Rationale**: Hero shows binary status; footer adds when it closes/opens  
**Irregular Hours Fallback**: When hours don't fit 7-day grid (e.g., "by appointment only"):
  - "Hours vary" — Libre Baskerville italic, 13px, charcoal, centered
  - "View on Google →" — 10px uppercase, khaki, centered, links to Google Maps
**Span**: 2 columns (in tier3Row)

### 8. Map (Tier 3)
```tsx
<a className={`${styles.bentoBlock} ${styles.mapCard}`} onClick={openExpandedMapView}>
  <div className={styles.mapCardLabel}>MAP</div>
  <div className={styles.mapTileStyled}>
    {/* Stylized Field Notes map */}
  </div>
  <div className={styles.mapAddressBlock}>
    <div className={styles.mapAddressLine1}>{street}</div>
    <div className={styles.mapAddressLine2}>{city}</div>
  </div>
</a>
```

**Purpose**: Stylized map with address  
**Design**: Field Notes aesthetic with roads + pin  
**Action**: Opens **Expanded Map View** in Saiko (NOT external maps)  
**Span**: 2 columns (in tier3Row)

### 9. Call (Tier 3)
```tsx
<a className={`${styles.bentoBlock} ${styles.callCard}`} href={`tel:${phoneNumber}`}>
  <div className={styles.callCardLabel}>CALL</div>
  <div className={styles.callCardContent}>
    <Phone /> {phoneNumber}
  </div>
</a>
```

**Purpose**: Phone number (tel: link)  
**Span**: 2 columns (in tier3Row) OR swaps to Action Cards middle position  
**Swap Logic**: When Instagram is missing, Call moves to Action Cards row (Website | **Call** | Directions)  
**Action**: Initiates phone call via tel: protocol

### 10. Tips (Tier 4)
```tsx
<div className={`${styles.bentoBlock} ${styles.span6}`}>
  <div className={styles.blockLabel}>Tips</div>
  <div style={{ 
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px'
  }}>
    {tips.map((tip) => (
      <div><span style={{ color: '#C3B091' }}>•</span> {tip}</div>
    ))}
  </div>
</div>
```

**Purpose**: Helpful visitor tips  
**Style**: Multi-column responsive grid with khaki bullets  
**Span**: 6 columns (full width)

### 11. Coverage Row (Tier 4)
```tsx
<div className={styles.coverageRow}>
  <div className={`${styles.bentoBlock} ${styles.coverageBlock}`}>
    <div className={styles.blockLabel}>Coverage</div>
    <a className={styles.coverageLink}>
      <span className={styles.coverageSource}>Eater</span>
      <span className={styles.coverageTitle}>Best Coffee in Biarritz</span>
    </a>
  </div>
  <div className={styles.coverageQuietStack}>
    <QuietCard variant="texture" span={3} />
    <QuietCard variant="minimal" span={3} />
  </div>
</div>
```

**Purpose**: Editorial mentions with visual balance  
**Layout**: Coverage block (50%) + 2 stacked Quiet Cards (50%)  
**Span**: 6 columns total (special nested row)

### 12. Best For (Tier 4)
```tsx
<div className={`${styles.bentoBlock} ${styles.bestForBlock} ${styles.span6}`}>
  {description}
</div>
```

**Purpose**: Summary description  
**Span**: 6 columns (full width)

### 13. Also On (Tier 4)
```tsx
<div className={`${styles.bentoBlock} ${styles.span6}`}>
  <div className={styles.blockLabel}>Also on</div>
  <div className={styles.alsoOnLinks}>
    <Link className={styles.alsoOnLink}>Map Name ↗</Link>
  </div>
</div>
```

**Purpose**: Cross-references to other maps  
**Span**: 6 columns (full width)

### 14. Quiet Cards
```tsx
<QuietCard variant="topo" span={3} />
```

**Purpose**: Visual balance in the Coverage Row only  
**Variants**: topo, texture, minimal (rotate through)  
**Usage**: Currently only used as 2 stacked cards (50% width) in the Coverage Row  
**Note**: General grid filling with Quiet Cards is a future enhancement

## Layout Rules

### Action Card Behavior & Design

**Visual Design**:
- **NO LABELS** — Icon + value only (removes "Website", "Instagram", "Directions" text)
- Icon: 20px, khaki color (#C3B091)
- Value: 12px text (domain, @handle, or street address)
- Equal width cards, centered content

**Actions**:
1. **Website Card**: Opens merchant website or Google Maps listing (target="_blank")
2. **Instagram Card**: Opens @handle on Instagram (target="_blank")  
3. **Call Card** (when swapped in): Initiates phone call via tel: protocol
4. **Directions Card**: Opens **native maps** (Apple Maps on iOS, Google Maps on Android/web)

**Swap Logic**:

### Pairing Logic

**Tier 2 blocks pair side-by-side (3-3 split):**

| Left (3 col) | Right (3 col) |
|--------------|---------------|
| Curator's Note | Pull Quote |
| Curator's Note | Vibe |
| Pull Quote | Vibe |

**Priority order:**
1. Pull Quote takes precedence over Excerpt when both exist
2. If only one Tier 2 block exists, it spans full width (6 col)
3. If two Tier 2 blocks exist, they pair side-by-side (3-3 split)

**Tier 3 blocks share a row (tier3Row):**
- **Default**: `Hours (2) + Map (2) + Call (2) = 6 columns`
- **When Call swaps to Actions**: `Hours (2) + Map (2) = 4 columns` (remaining space handled by CSS Grid)
- If Hours missing: remaining blocks expand proportionally using CSS Grid

### Action Card Swap Logic

**Instagram Present (Default)**:
```
Action Cards:  [Website] [Instagram] [Directions]
Tier 3:        [Hours]   [Map]       [Call]
```

**Instagram Missing (Call Swaps Up)**:
```
Action Cards:  [Website] [Call]      [Directions]
Tier 3:        [Hours]   [Map]
```

This ensures Action Cards row always has 3 cards, prioritizing social presence but falling back to phone contact.

### Graceful Degradation

When content is missing, blocks automatically adjust:

```css
/* Hours + Map only (no Call) */
.tier3Row.noPhone {
  grid-template-columns: 1.2fr 1fr;
}

/* Map + Call only (no Hours) */
.tier3Row.noHours {
  grid-template-columns: 1fr 0.8fr;
}

/* Map only */
.tier3Row.onlyMap {
  grid-template-columns: 1fr;
}
```

### Sparse Mode

When `isSparseLayout()` returns true (≤1 enriched content blocks):
- Currently detected but visual treatment is minimal
- Quiet Cards are NOT automatically added in sparse mode (future enhancement)
- Layout remains clean and focused on essential information only

## Data Schema

### Location Interface

```typescript
interface LocationData {
  // Basic info
  name: string;
  category: string | null;
  neighborhood: string | null;
  cuisineType: string | null;
  priceLevel: number | null;
  
  // Contact
  phone: string | null;
  website: string | null;
  instagram: string | null;
  address: string | null;
  
  // Media
  photoUrls: string[];
  
  // Hours
  hours: unknown; // Google Places hours object
  
  // Enriched content
  description: string | null;        // Best For
  curatorNote: string | null;        // Curator's Note
  curatorCreatorName: string | null;
  vibeTags: string[] | null;         // Vibe tags
  tips: string[] | null;             // Tips list
  tagline: string | null;            // Tagline (appears under name)
  
  // Pull Quote (curated from approved sources)
  pullQuote: string | null;
  pullQuoteSource: string | null;    // Publication name
  pullQuoteAuthor: string | null;    // Author name (optional)
  pullQuoteUrl: string | null;
  pullQuoteType: string | null;
  
  // Editorial sources
  sources: EditorialSource[];
}
```

### Editorial Source Interface

```typescript
interface EditorialSource {
  source_id?: string;
  publication: string;
  title: string;
  url: string;
  published_at?: string;
  trust_level?: string;
  content?: string;
}
```

## API Integration

### Adding a Tagline

```typescript
await prisma.place.update({
  where: { id: placeId },
  data: {
    tagline: 'Legendary neighborhood spot since 1982'
  }
});
```

### Adding a Pull Quote

```typescript
await prisma.place.update({
  where: { id: placeId },
  data: {
    pullQuote: 'The best coffee in LA, hands down',
    pullQuoteSource: 'LA Times',
    pullQuoteAuthor: 'Jane Smith',
    pullQuoteUrl: 'https://latimes.com/article',
    pullQuoteType: 'review'
  }
});
```

### Adding Vibe Tags

```typescript
// In your API or data pipeline
await prisma.place.update({
  where: { id: placeId },
  data: {
    vibeTags: ['Low-key', 'Surf crowd', 'Standing room']
  }
});
```

### Adding Tips

```typescript
await prisma.place.update({
  where: { id: placeId },
  data: {
    tips: [
      'Go early for a seat',
      'Cash only',
      'Try the flat white'
    ]
  }
});
```

## Styling

### Color Palette (Field Notes)

```css
--fn-parchment: #F5F0E1;  /* Page background */
--fn-white: #FFFDF7;      /* Card background */
--fn-khaki: #C3B091;      /* Accent/labels */
--fn-charcoal: #36454F;   /* Text */
--fn-sage: #4A7C59;       /* Open status */
--fn-coral: #D64541;      /* Map pin */
--fn-blue: #89B4C4;       /* Links */
```

### Typography

- **Headings**: Libre Baskerville (italic)
- **Body**: system-ui (sans-serif)
- **Labels**: 9px uppercase, 2px letter-spacing

### Spacing

- **Grid gap**: 10px between blocks
- **Block padding**: 20px
- **Block border-radius**: 12px

## Responsive Design

### Desktop (> 640px)
- 6-column grid
- Tier 3 row uses CSS Grid for Hours/Map/Call

### Mobile (≤ 640px)
- Single column stacking
- Tier 3 blocks stack vertically
- Action cards remain 3-across
- Hours maintains two-column internal layout

## Performance Considerations

1. **Lazy Load Gallery Images**: Only load hero image initially
2. **Quiet Cards Use SVG Patterns**: Lightweight, scalable
3. **CSS Grid Over Absolute Positioning**: Better for accessibility and SEO
4. **Semantic HTML**: Proper heading hierarchy and ARIA labels

## Accessibility

- All action cards are keyboard navigable
- Map includes alt text for screen readers
- Status indicators use both color and text
- ARIA labels on quiet cards (`aria-hidden="true"`)

## Testing

### Test Scenarios

1. **Rich Data**: All blocks present
2. **Sparse Data**: Only name, category, address
3. **No Photos**: Fallback to initial letter
4. **No Hours**: Graceful tier3Row adjustment
5. **Long Text**: Curator note with 200+ characters
6. **Mobile**: All breakpoints, portrait and landscape

### Visual Regression

Compare against reference mockup: `files/merchant-page-v2.html`

## Future Enhancements

- [ ] Drag-and-drop block reordering (for creators) - use `lib/bento-grid-layout.ts`
- [ ] Dynamic Quiet Card filling for sparse layouts
- [ ] A/B test block order for engagement
- [ ] AI-generated vibe tags
- [ ] Contextual tips based on time/weather
- [ ] Social proof (visitor count, recent activity)
- [ ] Bookmarking and save-to-list
- [ ] Print-friendly version
- [ ] Expand Pull Quote system to support multiple quotes

## Related Files

- `app/(viewer)/place/[slug]/page.tsx` - Main component (layout logic is inline)
- `app/(viewer)/place/[slug]/place.module.css` - Styles
- `lib/bento-grid-layout.ts` - Layout helper functions (NOT currently used, future enhancement)
- `app/components/merchant/QuietCard.tsx` - Quiet card component
- `files/merchant-page-v2.html` - Reference design

**Note**: The page currently calculates layout inline rather than using `bento-grid-layout.ts`. The helper functions in that file are available for future dynamic layout features like drag-and-drop reordering or A/B testing different layouts.

---

**Last Updated**: Feb 7, 2026  
**Maintainer**: Bobby Ciccaglione  
**Design Status**: ✅ Locked (matches merchant-page-v2.html)

## Change Log

**Feb 7, 2026** - Updated documentation to match current implementation:
- Added Pull Quote feature (Tier 2) with priority over Excerpt
- Added Tagline field (Hero section)
- Changed Tips from 2-column (Tier 3) to 6-column full-width (Tier 4)
- Updated Coverage to Coverage Row with nested Quiet Cards
- Clarified Quiet Cards are only used in Coverage Row (not general grid filling)
- Noted `bento-grid-layout.ts` is not currently used (future enhancement)
- Updated all block numbering and spans to match implementation
