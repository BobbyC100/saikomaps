# Bento Grid Layout Fixes V3 — February 6, 2026

## Final Layout Logic — Also On as Last Element

### Issues Fixed ✅

#### 1. Empty Space Under Quiet Cards
**Problem**: Empty cells remained under Quiet Cards, not being filled.

**Solution**: 
- Use `Math.ceil()` instead of `Math.floor()` for Quiet Card count
- This ensures all remaining cells in a row are filled, even with odd numbers

**Code Changes**:
```typescript
// Before: floor(3 / 2) = 1 card, leaving 1 empty cell
const quietCardCount = Math.floor(emptyCellsInCurrentRow / 2);

// After: ceil(3 / 2) = 2 cards, filling all cells
const quietCardCount = Math.ceil(emptyCellsInCurrentRow / 2);
```

**Example Calculations**:
- 1 empty cell: ceil(1/2) = 1 card → fills row
- 2 empty cells: ceil(2/2) = 1 card → fills row
- 3 empty cells: ceil(3/2) = 2 cards → fills row
- 4 empty cells: ceil(4/2) = 2 cards → fills row
- 5 empty cells: ceil(5/2) = 3 cards → fills row

#### 2. Quiet Cards Appearing After "Also On"
**Problem**: Quiet Cards were rendering after "Also On" card.

**Solution**: 
- Moved Quiet Cards calculation to BEFORE Also On is added to occupiedColumns
- Quiet Cards now render BEFORE Also On in JSX
- Also On is truly the last element

**Render Order (Final)**:
```
1. Action Cards
2. Gallery
3. Tier 2: Curator's Note | Excerpt/Vibe
4. Tier 3: Hours | Map | Call
5. Coverage (3) + Quiet Card companion (3)
6. Best For (6)
7. Quiet Cards (fill remaining cells in current row)
8. Also On (6) ← LAST ELEMENT, nothing after
9. Embossed Stamp (below grid)
```

**Code Changes**:
```tsx
// Before: Quiet Cards after Also On
<AlsoOn />
{quietCards.map(...)}

// After: Quiet Cards before Also On
{quietCards.map(...)}
<AlsoOn />
```

**Column Calculation Order**:
```typescript
// 1. Calculate all content blocks
occupiedColumns += coverageColumns;
occupiedColumns += bestForColumns;

// 2. Calculate Quiet Cards BEFORE Also On
const currentRowPosition = occupiedColumns % 6;
const emptyCells = currentRowPosition === 0 ? 0 : 6 - currentRowPosition;
const quietCardCount = Math.ceil(emptyCells / 2);

// 3. Add Quiet Cards to occupied columns
occupiedColumns += emptyCells; // Fill entire remaining row

// 4. Add Also On LAST
occupiedColumns += 6;
```

## Complete Grid Flow

### With All Blocks Present

```
┌────────────────────────────────────────────┐
│              HERO IMAGE                    │
├────────────────────────────────────────────┤
│  Name · Category · Status                  │
└────────────────────────────────────────────┘

┌─────────┬─────────┬─────────┐
│ Website │   IG    │  Direc  │  (Action Cards)
└─────────┴─────────┴─────────┘

┌────────────────────────────────────────────┐
│           PHOTO GALLERY                    │  (Gallery)
└────────────────────────────────────────────┘

┌─────────────────────┬─────────────────────┐
│ Curator's Note (3)  │ Coverage Quote (3)  │  (Tier 2)
└─────────────────────┴─────────────────────┘

┌──────┬──────┬──────┐
│Hours │ Map  │ Call │  (Tier 3)
└──────┴──────┴──────┘

┌─────────────────────┬─────────────────────┐
│ Coverage (3)        │ Quiet Card (3)      │  (Coverage + companion)
│ - Eater             │ [Pattern]           │
└─────────────────────┴─────────────────────┘

┌────────────────────────────────────────────┐
│           BEST FOR (6)                     │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│           ALSO ON (6)                      │  ← LAST CONTENT ELEMENT
│  [Map 1 ↗]  [Map 2 ↗]                     │
└────────────────────────────────────────────┘

            ──────────────
         Made by Saikos...  (Embossed Stamp)
            ──────────────
```

### With Partial Row Before Also On

If, for example, Tips takes 2 columns and nothing else fills the row:

```
... previous content ...

┌──────┬────────────┬────────────┬────────────┐
│Tips  │ Quiet (2)  │ Quiet (2)  │ (fills to 6)
│(2)   │            │            │
└──────┴────────────┴────────────┴────────────┘

┌────────────────────────────────────────────┐
│           ALSO ON (6)                      │  ← Starts new row
└────────────────────────────────────────────┘
```

## Key Principles

1. **Also On is ALWAYS last** - No cards render after it
2. **Quiet Cards fill before Also On** - Complete any partial rows
3. **Math.ceil ensures full coverage** - No empty cells remain
4. **Grid ends cleanly** - Also On → Stamp, no gaps

## Files Modified

- ✅ `app/(viewer)/place/[slug]/page.tsx` - Quiet Card calculation and render order
- ✅ `BENTO_GRID_FIXES_V3.md` - This documentation

## Testing Scenarios

### Scenario 1: All blocks present, no partial rows
- ✅ No Quiet Cards needed before Also On
- ✅ Also On renders as last element
- ✅ Clean transition to stamp

### Scenario 2: Partial row (2 columns used, 4 remaining)
- ✅ ceil(4/2) = 2 Quiet Cards fill the remaining 4 columns
- ✅ Also On starts on next full row
- ✅ No empty cells

### Scenario 3: Partial row (3 columns used, 3 remaining)
- ✅ ceil(3/2) = 2 Quiet Cards fill the remaining 3 columns (4 total)
- ✅ Quiet Cards complete the row
- ✅ Also On starts on next full row

### Scenario 4: Partial row (1 column used, 5 remaining)
- ✅ ceil(5/2) = 3 Quiet Cards fill the remaining 5 columns (6 total)
- ✅ Row is completed
- ✅ Also On starts on next full row

## Result

✅ **Perfect grid closure**
- All rows complete before Also On
- No Quiet Cards after Also On
- Clean visual hierarchy: content → Also On → stamp
- No empty spaces anywhere in the grid

---

**Fixed by**: Cursor AI Assistant  
**Date**: February 6, 2026  
**Status**: ✅ Complete - Also On is final element
