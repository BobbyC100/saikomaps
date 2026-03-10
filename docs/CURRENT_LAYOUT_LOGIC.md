# Current Layout Logic - Actual Code Analysis

**Date:** February 9, 2026  
**File:** `app/(viewer)/place/[slug]/page.tsx`

---

## Grid Container

**Lines 417-423:**
```tsx
<div
  style={{
    padding: '16px 20px',
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',  // ← 6-column grid
    gap: 12,
  }}
>
```

✅ **Grid is correctly set up as 6 columns**

---

## Component Column Spans

### Row 1: Hours + Coverage

**HoursCard (Line 426-432):**
```tsx
<HoursCard ... />
```
- Uses CSS class: `styles.col2`
- Defined as: `grid-column: span 2;`
- **Result: Spans 2 columns** ✅

**CoverageCard (Line 434-442):**
```tsx
{hasCoverage && (
  <CoverageCard
    pullQuote={location.pullQuote}
    pullQuoteSource={location.pullQuoteSource}
    pullQuoteAuthor={location.pullQuoteAuthor}
    sources={location.sources}      // ← Passed but missing pullQuoteUrl!
    vibeTag={location.vibeTags?.[0] || null}
  />
)}
```
- Uses inline style: `gridColumn: span ${columnSpan}`
- columnSpan = 3 (short), 4 (medium), or 5 (long)
- **Result: Dynamic width** ✅
- **BUG:** Missing `pullQuoteUrl` prop!

### Row 2: Gallery + Curator

**GalleryCard (Line 446-452):**
```tsx
{hasGallery && (
  <GalleryCard
    photos={location.photoUrls!.slice(1)}
    onThumbnailClick={(idx) => openGallery(idx + 1)}
    span={3}                      // ← Hardcoded to 3
  />
)}
```
- Uses inline style: `gridColumn: span 3`
- **Result: Always 3 columns** ✅

**CuratorCard (Line 454-459):**
```tsx
{hasCurator && (
  <CuratorCard 
    note={location.curatorNote!} 
    span={3}                      // ← Hardcoded to 3
  />
)}
```
- Uses inline style: `gridColumn: span 3`
- **Result: Always 3 columns** ✅

### Row 3: Map

**MapCard (Line 462-473):**
```tsx
{location.address && (
  <MapCard
    address={location.address}
    neighborhood={location.neighborhood}
    latitude={...}
    longitude={...}
    onMapClick={() => console.log('Open Expanded Map View')}
  />
)}
```
- Uses CSS class: `styles.col6`
- Defined as: `grid-column: span 6;`
- **Result: Spans 6 columns (full width)** ✅

### Row 4: Details

**DetailsCard (Line 476-484):**
```tsx
<DetailsCard
  website={location.website}
  restaurantGroupName={...}
  ...
/>
```
- Uses CSS class: `styles.col6`
- Defined as: `grid-column: span 6;`
- **Result: Spans 6 columns** ✅

---

## Expected Layout for Pizzeria Mozza

**Given this data:**
- hasGallery: true (10 photos)
- hasCurator: false (no descriptor)
- hasCoverage: false (no real content)

**Expected Grid:**
```
┌──────────┬──────────┬──────────┬──────────┬──────────┬──────────┐
│ Hours (2 cols)     │ [Empty - no Coverage]                       │
├──────────┴──────────┼──────────┬──────────┬──────────┬──────────┤
│ Gallery (3 cols)   │ [Empty - no Curator]                       │
├────────────────────┴──────────┴──────────┴──────────┴──────────┤
│ Map (6 cols - full width)                                       │
├─────────────────────────────────────────────────────────────────┤
│ Details (6 cols - full width)                                   │
└─────────────────────────────────────────────────────────────────┘
```

**This looks weird** because Row 1 has Hours (2 cols) + 4 empty columns.

---

## The Problem

When Coverage Card doesn't render, Row 1 becomes:
```
[Hours: 2 cols] [Nothing: 4 empty cols]
```

This creates visual imbalance.

---

## Solutions

### Option A: Let Hours Expand When No Coverage
```tsx
<HoursCard 
  span={hasCoverage ? 2 : 6}  // Full-width if no coverage
  ...
/>
```

### Option B: Always Show Coverage with Fallback
Even for thin data, show:
```
EDITORIAL
Featured in Michelin Guide
```

### Option C: Rethink Row 1 Layout
Maybe Hours should always be full-width and Coverage should be in Row 2?

---

## Missing Prop Bug

**Line 436-440:**
```tsx
<CoverageCard
  pullQuote={location.pullQuote}
  pullQuoteSource={location.pullQuoteSource}
  pullQuoteAuthor={location.pullQuoteAuthor}
  sources={location.sources}
  vibeTag={location.vibeTags?.[0] || null}
/>
```

**BUG:** Missing `pullQuoteUrl` prop that CoverageCard interface expects!

**Fix needed:**
```tsx
<CoverageCard
  pullQuote={location.pullQuote}
  pullQuoteSource={location.pullQuoteSource}
  pullQuoteAuthor={location.pullQuoteAuthor}
  pullQuoteUrl={location.pullQuoteUrl}  // ← ADD THIS
  sources={location.sources}
  vibeTag={location.vibeTags?.[0] || null}
/>
```

---

## Recommendation

1. **Fix the missing prop** (`pullQuoteUrl`)
2. **Make Hours expand** when no Coverage: `span={hasCoverage ? 2 : 6}`
3. **Test both cases:**
   - Stir Crazy (has content → Coverage shows, Hours is 2-col)
   - Pizzeria Mozza (no content → No Coverage, Hours is 6-col)

This way the layout always feels balanced.
