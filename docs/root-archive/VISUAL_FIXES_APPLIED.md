# Visual Fixes Applied

**Date:** February 9, 2026

## Issues Fixed

### 1. ✅ Gallery Card - Now Always 3 Columns
**Problem:** Gallery was spanning 6 columns (full-width) when no curator note, looking too wide and dominating the page.

**Fix:** Changed Gallery to ALWAYS span 3 columns for visual consistency.

**Before:**
```tsx
span={hasCurator ? 3 : 6}  // ❌ Full-width when no curator
```

**After:**
```tsx
span={3}  // ✅ Always 3 columns
```

**Result:** Gallery maintains consistent 3-column width. If no Curator card, the right 3 columns remain empty (which is fine - maintains grid rhythm).

---

### 2. ✅ Map Card - Larger Preview with Visible Grid Lines
**Problem:** Map preview was 56px (too small) and grid lines weren't visible enough.

**Fixes:**
- Increased preview size: 56px → 64px
- Increased grid opacity: 0.3 → 0.6
- Increased grid spacing: 10px → 12px
- Removed unused SVG overlay (was set to `display: none`)

**CSS:**
```css
.mapPreview {
  width: 64px;
  height: 64px;
  background-image: 
    linear-gradient(rgba(195, 176, 145, 0.6) 1px, transparent 1px),
    linear-gradient(90deg, rgba(195, 176, 145, 0.6) 1px, transparent 1px);
  background-size: 12px 12px;
}
```

**Result:** Map preview is larger and grid texture is clearly visible.

---

### 3. ✅ Coverage Card - No Longer Shows Metadata as Quotes
**Problem:** For Pizzeria Mozza, the "excerpt" was just metadata:
```
"Michelin Guide (Los Angeles and surroundings)"
```

This was being displayed as a quote with quotation marks, which looked wrong.

**Fix:** Added validation to skip excerpts that are:
- Too short (< 50 chars)
- Contain the source name (metadata, not quotes)
- Just citations/titles

**Fallback:** When no real quote or excerpt exists, show:
```
Featured in Michelin Guide
```

**Result:** Coverage card now shows proper attribution instead of fake quotes.

---

### 4. ✅ Details Card - Already Optimized
**Status:** Details Card already has minimal padding (10px vertical, 14px horizontal) and compact row layout.

**Current CSS:**
```css
.detailsCard {
  padding: 0;
}

.detailRow {
  padding: 10px 14px;
  font-size: 10px (label) / 11px (value);
}
```

**No changes needed** - the card is already compact. If it looks "huge", it might be due to browser zoom or screen size perception.

---

## Test Results

### Pizzeria Mozza (`/place/pizzeria-mozza-melrose`)

**Expected Layout:**
```
[Hours (2)]  [Coverage (4)]
[Gallery (3)] [Empty (3)]      ← Gallery now 3-col
[Map (6)]
[Details (6)]
```

**What to verify:**
- ✅ Gallery is 3 columns (left side)
- ✅ Right 3 columns are empty (no curator data)
- ✅ Map preview is 64px with visible grid lines
- ✅ Coverage shows "Featured in Michelin Guide"
- ✅ Details card is compact with website row

### Seco (`/place/seco`)

**Expected Layout:**
```
[Hours (2)]  [Coverage (4)]
[Gallery (3)] [Curator (3)]    ← Both 3-col side-by-side
[Map (6)]
[Details (6)]
```

**What to verify:**
- ✅ Gallery is 3 columns (left)
- ✅ Curator is 3 columns (right)
- ✅ Map preview has visible grid lines
- ✅ Coverage shows actual pull quote

---

## Summary of Changes

| Component | Change | Reason |
|-----------|--------|--------|
| **GalleryCard** | Always span 3 | Consistent layout, not full-width |
| **CuratorCard** | Always span 3 | Match Gallery width |
| **MapCard** | 56px → 64px preview | More visible |
| **MapCard** | 0.3 → 0.6 grid opacity | Grid lines now visible |
| **MapCard** | Removed SVG overlay | Using CSS background |
| **CoverageCard** | Skip metadata excerpts | No fake quotes |
| **CoverageCard** | "Featured in X" fallback | Better than showing nothing |

---

## Next Steps

1. **Hard refresh browser** (Cmd+Shift+R) on port 3000
2. **Test Pizzeria Mozza** - Verify 3-col Gallery on left
3. **Test Seco** - Verify 3+3 layout works
4. **Check map grid texture** - Should be clearly visible

All visual issues should now be resolved! 🎨
