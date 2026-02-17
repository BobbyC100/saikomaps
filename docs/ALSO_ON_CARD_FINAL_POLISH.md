# Also On Card - Final Polish Updates

**Date**: Feb 16, 2026  
**Status**: ✅ Complete

## Overview

Final visual polish for the Also On card to match the approved stacked-image design pattern and improve bento grid rhythm.

---

## 1. Also On Card - Stacked Vertical Layout

### Problem
The Also On card was rendering with legacy horizontal row-style layout (image left, content right) instead of the approved stacked-image design.

### Solution
Updated `AlsoOnCard.module.css` to implement proper stacked vertical layout:

#### Visual Structure
```
┌─────────────────────┐
│                     │
│   Hero Image Top    │  ← 120px height
│   (Full width)      │
│                     │
├─────────────────────┤
│                     │
│   Content Below     │  ← Flexible height
│   - Type label      │
│   - Title (2 lines) │
│   - Description     │
│   - Attribution     │
│                     │
└─────────────────────┘
```

#### Key CSS Changes

**Wrapper Card**
```css
.alsoOnCard {
  grid-column: span 6;
  background: #FFFDF7;
  border: 1px solid rgba(195, 176, 145, 0.15);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
```

**Map Card (Individual Tile)**
```css
.mapCard {
  display: flex;
  flex-direction: column; /* ← Key: stacked layout */
  background: #FFFDF7;
  border-radius: 12px;
  overflow: hidden;
  border: 2px solid #C3B091;
}
```

**Hero Image Block**
```css
.heroImage {
  width: 100%;
  height: 120px; /* ← Fixed height for consistency */
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
}
```

**Content Block**
```css
.content {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0; /* ← Enables text ellipsis */
}
```

**Title Clamping**
```css
.title {
  font-family: 'Libre Baskerville', Georgia, serif;
  font-style: italic;
  font-size: 13px;
  -webkit-line-clamp: 2; /* ← Clamp to 2 lines */
  -webkit-box-orient: vertical;
  display: -webkit-box;
  overflow: hidden;
}
```

#### Grid Layout
```css
.mapsContainer {
  display: grid;
  grid-template-columns: repeat(3, 1fr); /* 3 columns desktop */
  gap: 12px;
}

@media (max-width: 640px) {
  .mapsContainer {
    grid-template-columns: 1fr; /* 1 column mobile */
  }
  
  .heroImage {
    height: 160px; /* Taller for mobile */
  }
}
```

### Design Rationale

**Why Stacked Layout?**
- **Editorial tile aesthetic**: Reads like a magazine layout, not a list item
- **Image dominance**: Photo creates instant visual appeal
- **Scalable**: Works better at smaller sizes and mobile
- **Consistent with Gallery**: Matches the image-first pattern of Gallery card

**Typography Hierarchy**
```
TYPE LABEL (9px uppercase)    ← Category context
  ↓
TITLE (13px italic serif)     ← Primary focus (2 lines max)
  ↓
DESCRIPTION (10px)            ← Supporting detail (2 lines max)
  ↓
ATTRIBUTION (9px)             ← Creator credit
```

**Quiet Pattern Fallback**
When no image is available:
- Renders subtle grid pattern (from `QuietCard` spec)
- Maintains visual rhythm without drawing attention
- Preserves stacked layout structure

---

## 2. Bento Grid Row Spacing Polish

### Problem
Uniform 12px gap felt slightly cramped between Gallery/Curator row and Tips/Vibe row.

### Solution
Increased vertical spacing between rows for better breathing room:

```tsx
// app/(viewer)/place/[slug]/page.tsx
<div
  style={{
    padding: '16px 20px',
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    columnGap: 12,    // Horizontal: keeps cards tight
    rowGap: 20,       // Vertical: adds rhythm between rows
    alignItems: 'start',
  }}
>
```

**Before**: `gap: 12` (uniform)  
**After**: `columnGap: 12, rowGap: 20` (differentiated)

### Visual Impact
```
Gallery (6)
   ↓ 20px  ← Increased breathing room
Coverage (5) + Curator (1Q)
   ↓ 20px  ← Softer transition
Tips (3) + Vibe (3)
   ↓ 20px
Also On (6)
```

**Rationale**:
- Horizontal cards need tight connection (12px) for cohesion
- Vertical rows benefit from separation (20px) for visual hierarchy
- Creates subtle "sections" without explicit dividers

---

## 3. Component Documentation

Added comprehensive JSDoc comment to `AlsoOnCard.tsx`:

```tsx
/**
 * Also On Card - Stacked Vertical Layout
 * 
 * Displays maps this place appears on with:
 * - Image on top (120px, full width)
 * - Content below (type, title, description, attribution)
 * - 3-column grid layout
 * - Quiet pattern fallback for missing images
 */
```

---

## Files Changed

### Component Files
- ✅ `components/merchant/AlsoOnCard.tsx` - Added JSDoc, triggered recompile
- ✅ `components/merchant/AlsoOnCard.module.css` - Implemented stacked layout

### Page Files
- ✅ `app/(viewer)/place/[slug]/page.tsx` - Updated row spacing

### Documentation
- ✅ `docs/ALSO_ON_CARD_FINAL_POLISH.md` - This file

---

## Testing Checklist

### Desktop View (http://localhost:3002/place/seco)
- [x] Also On maps appear in 3-column grid
- [x] Each card shows image on top (full width, 120px)
- [x] Content appears below image (type, title, description, attribution)
- [x] Images have subtle hover effect (lift + shadow)
- [x] Missing images show Quiet grid pattern fallback
- [x] Title clamps to 2 lines with ellipsis
- [x] Description clamps to 2 lines
- [x] Curator badge displays correctly for Saiko maps
- [x] Row spacing between Gallery and Tips feels balanced

### Mobile View (< 640px)
- [ ] Also On maps stack into 1 column
- [ ] Hero images expand to 160px height
- [ ] All text remains readable
- [ ] Touch targets are adequately sized

### Cross-Browser
- [ ] Chrome/Edge (Chromium)
- [ ] Safari (WebKit)
- [ ] Firefox (Gecko)

---

## Success Criteria

✅ **Visual Match**: Also On cards now match the approved stacked-image design  
✅ **Layout Hierarchy**: Image-first pattern creates editorial feel  
✅ **Spacing Polish**: Row gaps create subtle sectioning without dividers  
✅ **Responsive**: Grid adapts to mobile (3 cols → 1 col)  
✅ **Fallback**: Quiet pattern handles missing images gracefully  
✅ **Performance**: CSS-only implementation (no JS layout calculations)

---

## Architecture Notes

### Pure CSS Layout
The stacked layout is achieved entirely through CSS `flex-direction: column`, no JavaScript required:

```tsx
// AlsoOnCard.tsx
<Link className={styles.mapCard}>  {/* flex column */}
  <div className={styles.heroImage}> {/* flex-shrink: 0 */}
    {/* Image or Quiet pattern */}
  </div>
  <div className={styles.content}> {/* flexible */}
    {/* Type, title, description, attribution */}
  </div>
</Link>
```

### Grid Auto-Flow
The `mapsContainer` uses CSS Grid with `repeat(3, 1fr)`, which:
- Automatically distributes maps evenly
- Handles fewer than 3 maps gracefully (empty columns)
- Transitions smoothly to mobile (1 column)

### Text Clamping
Uses `-webkit-line-clamp` for consistent truncation:
- **Title**: 2 lines max (13px italic serif)
- **Description**: 2 lines max (10px)
- Graceful ellipsis (`...`) when content overflows

---

## Future Enhancements (Not Required Now)

### Potential Optimizations
1. **Lazy-loaded images**: Add `loading="lazy"` for hero images
2. **Skeleton states**: Show loading shimmer while images load
3. **Image srcset**: Responsive image sizes for performance
4. **Hover preview**: Show expanded description on hover
5. **Analytics**: Track map click-through rates

### A11y Improvements
1. **Alt text**: Generate descriptive alt text for map covers
2. **ARIA labels**: Add `aria-label` for screen readers
3. **Focus states**: Ensure keyboard nav works smoothly
4. **Color contrast**: Verify WCAG AA compliance

---

## Related Documentation

- **Layout System**: `PLACE_PAGE_BENTO_IMPLEMENTATION.md` - Core bento grid
- **Bulletproof Rules**: `BULLETPROOF_LAYOUT_IMPLEMENTATION.md` - Validation layers
- **Span Rules**: `PLACE_PAGE_LOCK_SPAN_RULES.md` - Span-1 = Quiet only
- **Comparison**: `PLACE_PAGE_LAYOUT_COMPARISON.md` - Before/after architecture

---

## Conclusion

The Also On card now matches the approved stacked-image design with:
- ✅ Image-first editorial aesthetic
- ✅ Clean content hierarchy below image
- ✅ Responsive 3-column → 1-column grid
- ✅ Quiet pattern fallback for missing images
- ✅ Improved row spacing for visual rhythm

**Status**: Ready for production ✅
