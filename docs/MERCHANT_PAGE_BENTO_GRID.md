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
- **6 columns** (full width): Hero, Action Cards, Gallery, Best For, Also On
- **3 columns** (half width): Curator's Note, Excerpt, Vibe, Coverage
- **2 columns** (third width): Hours, Map, Call, Tips

### Layout Tiers

The grid is organized into semantic tiers:

#### Tier 0: Hero + Meta
- **Hero Image** (180px height)
- **Name** (Libre Baskerville 32px italic)
- **Meta Row** (Category · Neighborhood · Cuisine · Price · Status)

#### Tier 1: Primary Actions & Gallery
- **Action Cards** (6 col) - Website, Instagram, Directions
- **Gallery** (6 col) - Photo collage (1-4+ photos)

#### Tier 2: Editorial Content
- **Curator's Note** (3 col when paired, 6 col alone)
- **Excerpt** (3 col when paired, 6 col alone) - Quote from editorial source
- **Vibe** (3 col when paired, 6 col alone) - Atmosphere tags with dot separators

#### Tier 3: Practical Information
- **Hours** (2 col) - Two-column week view + status footer
- **Map** (2 col) - Stylized Field Notes map tile
- **Call** (2 col) - Phone number card
- **Tips** (2 col) - Bulleted list of helpful tips

#### Tier 4: Secondary Content
- **Coverage** (3 col) - Editorial mentions (publications + article titles)
- **Best For** (6 col) - Summary description
- **Also On** (6 col) - Other maps featuring this place

#### Tier 5: Grid Fillers
- **Quiet Cards** (2 col) - Subtle textured cards to fill empty grid cells

## Content Blocks

### 1. Action Cards (Tier 1)
```tsx
<div className={styles.actionCardsRow}>
  <a className={styles.actionCard}>
    <Globe /> Website
  </a>
  <a className={styles.actionCard}>
    <Instagram /> Instagram
  </a>
  <a className={styles.actionCard}>
    <MapPin /> Directions
  </a>
</div>
```

**Purpose**: Primary user actions (navigate to website, social, maps)  
**Layout**: 3 equal cards in a row  
**Span**: 6 columns (full width wrapper)

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

**Purpose**: Pull quote from editorial source  
**Style**: Left border accent, serif font  
**Span**: 3 columns

### 5. Vibe (Tier 2)
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
**Span**: 3 columns

### 6. Hours (Tier 3)
```tsx
<div className={`${styles.bentoBlock} ${styles.hoursBlock}`}>
  <div className={styles.blockLabel}>HOURS</div>
  <div className={styles.hoursGrid}>
    {/* Two columns: M-Th and F-Su */}
  </div>
  <div className={styles.hoursStatusFooter}>
    <div className={styles.hoursStatusDot} />
    Open · Closes 11 PM
  </div>
</div>
```

**Purpose**: Business hours with current status  
**Layout**: Two columns (M-Th, F-Su) + status footer  
**Span**: 2 columns (in tier3Row)

### 7. Map (Tier 3)
```tsx
<a className={`${styles.bentoBlock} ${styles.mapCard}`}>
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
**Span**: 2 columns (in tier3Row)

### 8. Call (Tier 3)
```tsx
<a className={`${styles.bentoBlock} ${styles.callCard}`}>
  <div className={styles.callCardLabel}>CALL</div>
  <div className={styles.callCardContent}>
    <Phone /> {phoneNumber}
  </div>
</a>
```

**Purpose**: Phone number (tel: link)  
**Span**: 2 columns (in tier3Row)

### 9. Tips (Tier 3)
```tsx
<div className={`${styles.bentoBlock} ${styles.tipsBlock} ${styles.span2}`}>
  <div className={styles.blockLabel}>Tips</div>
  <ul className={styles.tipsList}>
    <li>Go early for a seat</li>
    <li>Cash only</li>
  </ul>
</div>
```

**Purpose**: Helpful visitor tips  
**Style**: Bulleted list with khaki bullets  
**Span**: 2 columns

### 10. Coverage (Tier 4)
```tsx
<div className={`${styles.bentoBlock} ${styles.coverageBlock}`}>
  <div className={styles.blockLabel}>Coverage</div>
  <a className={styles.coverageLink}>
    <span className={styles.coverageSource}>Eater</span>
    <span className={styles.coverageTitle}>Best Coffee in Biarritz</span>
  </a>
</div>
```

**Purpose**: Editorial mentions  
**Span**: 3 columns

### 11. Best For (Tier 4)
```tsx
<div className={`${styles.bentoBlock} ${styles.bestForBlock} ${styles.span6}`}>
  {description}
</div>
```

**Purpose**: Summary description  
**Span**: 6 columns (full width)

### 12. Also On (Tier 4)
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

### 13. Quiet Cards (Tier 5)
```tsx
<QuietCard variant="topo" span={2} />
```

**Purpose**: Fill empty grid cells to maintain visual rhythm  
**Variants**: topo, texture, minimal (rotate through)  
**Span**: 2 columns

## Layout Rules

### Pairing Logic

**Tier 2 blocks pair side-by-side (3-3 split):**

| Left (3 col) | Right (3 col) |
|--------------|---------------|
| Curator's Note | Excerpt |
| Curator's Note | Vibe |
| Excerpt | Vibe |

If only one Tier 2 block exists, it spans full width (6 col).

**Tier 3 blocks share a row (tier3Row):**
- `Hours (2) + Map (2) + Call (2) = 6 columns`
- If one is missing, remaining blocks expand proportionally

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
- Quiet Cards are used more liberally
- Map expands to full width
- Focus shifts to essential information only

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
  vibeTags: string[] | null;         // NEW: Vibe tags
  tips: string[] | null;             // NEW: Tips list
  
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

- [ ] Drag-and-drop block reordering (for creators)
- [ ] A/B test block order for engagement
- [ ] AI-generated vibe tags
- [ ] Contextual tips based on time/weather
- [ ] Social proof (visitor count, recent activity)
- [ ] Bookmarking and save-to-list
- [ ] Print-friendly version

## Related Files

- `app/(viewer)/place/[slug]/page.tsx` - Main component
- `app/(viewer)/place/[slug]/place.module.css` - Styles
- `lib/bento-grid-layout.ts` - Layout logic
- `app/components/merchant/QuietCard.tsx` - Filler cards
- `files/merchant-page-v2.html` - Reference design

---

**Last Updated**: Feb 6, 2026  
**Maintainer**: Bobby Ciccaglione  
**Design Status**: ✅ Locked (matches merchant-page-v2.html)
