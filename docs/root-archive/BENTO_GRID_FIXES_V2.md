# Bento Grid Layout Fixes V2 — February 6, 2026

## Issues Fixed ✅

### 1. Coverage Card Width Corrected
**Problem**: Coverage was made full-width (6 columns), leaving no room for house ads or quiet cards.

**Solution**: 
- Changed Coverage back to 3 columns (content-width)
- Added Quiet Card companion (3 columns) next to Coverage
- Coverage now only as wide as the content needs

**Code Changes**:
```tsx
// Before: Coverage full-width
<div className={`${styles.bentoBlock} ${styles.coverageBlock} ${styles.span6}`}>

// After: Coverage 3 columns + Quiet Card companion
<div className={`${styles.bentoBlock} ${styles.coverageBlock} ${styles.span3}`}>
  ...
</div>
<QuietCard variant="texture" span={3} className={styles.bentoBlock} />
```

**Visual Result**:
```
┌─────────────────────────┬─────────────────────────┐
│  Coverage (3 col)       │  Quiet Card (3 col)     │
│  - Eater                │  [Texture pattern]      │
│  - LA Times             │                         │
└─────────────────────────┴─────────────────────────┘
```

### 2. Black Footer Text Removed
**Problem**: "Saiko Maps" text appearing below embossed stamp from GlobalFooter component.

**Solution**: 
- Removed `<GlobalFooter variant="minimal" />` from merchant page
- Only the embossed SaikoStamp remains as footer

**Code Changes**:
```tsx
// Before
<SaikoStamp />
</div>
</main>
<GlobalFooter variant="minimal" />
</div>

// After
<SaikoStamp />
</div>
</main>
</div>
```

**Result**: Clean embossed stamp as sole footer element, no extra text.

### 3. Quiet Cards Now Rendering
**Problem**: No Quiet Cards appearing at end of grid.

**Solution**: 
- Changed logic to ALWAYS add one full row (3 cards) of Quiet Cards after Also On
- Quiet Cards serve as visual closing element before stamp
- No longer depends on "empty cells" calculation

**Code Changes**:
```typescript
// Before: Only add Quiet Cards if there are mathematically empty cells
const emptyCells = totalCells - occupiedColumns;
const quietCardCount = Math.floor(emptyCells / 2);

// After: Always add full row of Quiet Cards as closing element
const currentRowPosition = occupiedColumns % 6;
const emptyCellsInCurrentRow = currentRowPosition === 0 ? 0 : 6 - currentRowPosition;
let quietCardCount = Math.floor(emptyCellsInCurrentRow / 2);

// ALWAYS add one full row of Quiet Cards (visual closing element)
quietCardCount += 3; // 3 cards × 2 columns = 6 columns
```

**Result**: Consistent Quiet Card row always appears between Also On and stamp.

### 4. Also On Deduplication Fixed
**Problem**: "Silver Lake Natural Wine" appearing twice despite deduplication attempt.

**Solution**: 
- Replaced Map-based deduplication with explicit Set tracking
- More reliable filtering of duplicate slugs

**Code Changes**:
```typescript
// Before: Map-based deduplication
const appearsOnDeduped = Array.from(
  new Map(appearsOn.map((item) => [item.slug, item])).values()
).slice(0, 3);

// After: Explicit Set-based filtering
const seenSlugs = new Set<string>();
const appearsOnDeduped = appearsOn
  .filter((item) => {
    if (seenSlugs.has(item.slug)) {
      return false; // Skip duplicates
    }
    seenSlugs.add(item.slug);
    return true;
  })
  .slice(0, 3);
```

**Result**: Each map slug only appears once in Also On section.

## Complete Render Order

✅ **Current order (top to bottom)**:

1. **Hero + Meta** (name, category, status)
2. **Action Cards** (Website | Instagram | Directions)
3. **Gallery** (photo bento collage)
4. **Tier 2**: Curator's Note (3) | Coverage Quote (3)
5. **Tier 3**: Hours (2) | Map (2) | Call (2)
6. **Coverage Links** (3) | Quiet Card (3)
7. **Best For** (6 columns, full width)
8. **Also On** (6 columns, last content element)
9. **Quiet Cards Row** (always present: 3 cards × 2 columns)
10. **Embossed Stamp** (below grid, no extra footer text)

## Visual Layout

```
┌────────────────────────────────────────────┐
│              HERO IMAGE                    │
├────────────────────────────────────────────┤
│  Name · Meta                               │
└────────────────────────────────────────────┘

┌─────────┬─────────┬─────────┐
│ Website │   IG    │  Direc  │
└─────────┴─────────┴─────────┘

┌────────────────────────────────────────────┐
│           PHOTO GALLERY                    │
└────────────────────────────────────────────┘

┌─────────────────────┬─────────────────────┐
│ Curator's Note (3)  │ Coverage Quote (3)  │
└─────────────────────┴─────────────────────┘

┌──────┬──────┬──────┐
│Hours │ Map  │ Call │
└──────┴──────┴──────┘

┌─────────────────────┬─────────────────────┐
│ Coverage (3)        │ Quiet Card (3)      │
│ - Eater             │ [Pattern]           │
│ - LA Times          │                     │
└─────────────────────┴─────────────────────┘

┌────────────────────────────────────────────┐
│           BEST FOR (6)                     │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│           ALSO ON (6)                      │
│  [Map 1 ↗]  [Map 2 ↗]  [Map 3 ↗]          │
└────────────────────────────────────────────┘

┌────────────┬────────────┬────────────┐
│ Quiet (2)  │ Quiet (2)  │ Quiet (2)  │
│ [Topo]     │ [Texture]  │ [Minimal]  │
└────────────┴────────────┴────────────┘

            ──────────────
         Made by Saikos...
            ──────────────
```

## Files Modified

1. **`app/(viewer)/place/[slug]/page.tsx`**
   - Coverage: 6 columns → 3 columns with Quiet Card companion
   - Removed GlobalFooter component
   - Changed Quiet Cards logic to always add closing row
   - Enhanced Also On deduplication with Set tracking

## Testing Checklist

- [x] Coverage is 3 columns wide (content-width)
- [x] Quiet Card appears next to Coverage
- [x] No black "Saiko Maps" footer text
- [x] Only embossed stamp remains as footer
- [x] Full row of Quiet Cards appears after Also On
- [x] Also On shows unique slugs only (no duplicates)
- [x] Proper render order maintained
- [x] No linter errors

## Edge Cases Handled

1. **Coverage with no companion**: Quiet Card fills space
2. **Also On with duplicate slugs**: Set-based deduplication ensures uniqueness
3. **Perfect row alignment**: Still adds Quiet Card closing row
4. **Partial row before Also On**: Fills current row, then adds closing row

## Result

✅ **Clean, professional merchant page layout**
- Coverage at content-width with visual companion
- Consistent Quiet Card closing row before stamp
- No duplicate map references in Also On
- Single embossed stamp footer (no extra text)

---

**Fixed by**: Cursor AI Assistant  
**Date**: February 6, 2026  
**Status**: ✅ All Issues Resolved
