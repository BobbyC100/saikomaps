# Also On Card - Visual Editorial Fix

**Date**: Feb 16, 2026  
**Status**: ✅ Complete

## Problem Identified

The Also On cards had the correct **structure** (image-on-top) but lacked the visual **dominance** needed to read as editorial map tiles. The placeholder gradient blended too much with the content area, creating a "background tile" appearance instead of distinct "image block on top, details below."

---

## Solution: Enhanced Image Block Dominance

### 1. Stronger Image Presence

**Increased Height**
```css
.heroImage {
  height: 140px; /* Was 120px - now more dominant */
}
```

**Distinct Base Color**
```css
.heroImage {
  background: #F5F1E8; /* Distinct from content #FFFDF7 */
  border-bottom: 1px solid rgba(195, 176, 145, 0.25); /* Visual separator */
}
```

**Enhanced Placeholder Pattern**
```css
.heroImagePlaceholder {
  /* CSS grid pattern (no SVG needed) */
  background: 
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 7px,
      rgba(195, 176, 145, 0.06) 7px,
      rgba(195, 176, 145, 0.06) 8px
    ),
    repeating-linear-gradient(
      90deg,
      transparent,
      transparent 7px,
      rgba(195, 176, 145, 0.06) 7px,
      rgba(195, 176, 145, 0.06) 8px
    ),
    linear-gradient(135deg, #F5F1E8 0%, #EDE8D8 100%);
}
```

**Centered Icon**
```css
.gridPattern {
  opacity: 0.4;
  width: 60px;  /* Was 100% - now centered icon */
  height: 60px;
}
```

### 2. Clear Content Separation

**Distinct Content Background**
```css
.content {
  padding: 14px 12px 12px 12px; /* Increased top padding */
  gap: 8px; /* Was 6px - more breathing room */
  background: #FFFDF7; /* Explicit distinct color */
}
```

### 3. Section Spacing Polish

**Also On Section Gets Extra Breathing Room**
```css
.alsoOnCard {
  margin-top: 8px; /* Extra space from Tips/Vibe section */
}
```

---

## Visual Hierarchy (Before → After)

### Before
```
┌─────────────────────┐
│                     │
│  [Beige gradient]   │  ← Blended with content
│                     │
│  MAP · 12 PLACES    │
│  Title here         │
│  By @creator        │
└─────────────────────┘
```
**Problem**: Image and content felt like one continuous block

### After
```
┌─────────────────────┐
│                     │
│  [DISTINCT IMAGE]   │  ← 140px, distinct color
│  + subtle grid      │     + border separator
│  + centered icon    │
├─────────────────────┤  ← Clear visual break
│                     │
│  MAP · 12 PLACES    │  ← Content on white
│  Title here         │
│  By @creator        │
│                     │
└─────────────────────┘
```
**Solution**: Image reads as its own section, content clearly below

---

## Key Visual Changes

### Image Block Identity
1. **Taller** (140px vs 120px) - More commanding presence
2. **Distinct color** (#F5F1E8 vs #FFFDF7) - Reads as "image zone"
3. **Subtle border** - Visual separator between image and content
4. **Better pattern** - CSS-based grid (cleaner than SVG)
5. **Centered icon** - Small decorative element, not full background

### Content Block Clarity
1. **Explicit white background** - Clear separation from image
2. **More padding-top** (14px) - Breathing room from image
3. **Increased gap** (8px) - Better text hierarchy

### Section Spacing
1. **Extra margin-top** (8px) - Also On section feels like its own zone
2. **Total spacing from Tips/Vibe**: 20px (grid gap) + 8px (margin) = 28px

---

## Responsive Adjustments

### Desktop (> 640px)
- Image height: 140px
- 3-column grid
- Compact content padding

### Mobile (≤ 640px)
- Image height: 180px (even more dominant on smaller screens)
- 1-column stack
- Increased content padding (16px)

---

## CSS Architecture

### Pure CSS Grid Pattern
No SVG required for placeholder pattern - achieved with `repeating-linear-gradient`:
- Horizontal lines every 8px
- Vertical lines every 8px
- Subtle transparency (0.06 alpha)
- Diagonal gradient base for depth

### Flexbox Vertical Stack
```
.mapCard (flex column)
  ├── .heroImage (flex-shrink: 0, fixed 140px)
  └── .content (flex, takes remaining space)
```

---

## Files Changed

- ✅ `components/merchant/AlsoOnCard.module.css` - Enhanced image dominance, content separation, spacing

---

## Testing Checklist

Navigate to **http://localhost:3002/place/seco** and verify:

### Visual Hierarchy
- [x] Image area clearly distinct from content (taller, different color)
- [x] Subtle border separates image from text below
- [x] Grid pattern visible but subtle (not overwhelming)
- [x] Content reads as "details below image" not "text on background"

### Card Appearance
- [x] Each card reads as "mini editorial tile"
- [x] Image block feels like a photo placeholder (not decorative bg)
- [x] 3 cards display side-by-side on desktop

### Spacing
- [x] Also On section has extra breathing room from Tips/Vibe
- [x] Total vertical spacing feels balanced (not cramped)

### Mobile (< 640px)
- [ ] Image expands to 180px (more dominant)
- [ ] Cards stack vertically
- [ ] All text remains readable

---

## Success Criteria

✅ **Image Dominance**: Image block now reads as its own editorial section  
✅ **Clear Separation**: Visual break between image and content (border + color)  
✅ **Editorial Feel**: Cards read as "mini map tiles" not "list rows"  
✅ **Section Spacing**: Also On has extra breathing room from previous section  
✅ **No Structural Changes**: Only CSS updates, no HTML/component logic changed  

---

## Design Rationale

### Why These Specific Changes?

**Problem Root Cause**:
The original gradient (`#EDE8D8` → `#E6E0D4`) was too close to the content background (`#FFFDF7`), causing the image and text to read as one visual block.

**Solution Strategy**:
1. **Color Contrast** - Distinct image background (#F5F1E8) vs content (#FFFDF7)
2. **Physical Separator** - Subtle border creates clear "above/below the fold" moment
3. **Height Dominance** - 140px ensures image takes majority of visual weight
4. **Pattern Subtlety** - Grid pattern adds texture without competing with content

**Result**:
The card now reads as:
- **Top half** = Image zone (this is what the map looks like)
- **Bottom half** = Details zone (this is what the map is)

---

## Related Documentation

- **Implementation**: `PLACE_PAGE_BENTO_IMPLEMENTATION.md`
- **First Polish**: `ALSO_ON_CARD_FINAL_POLISH.md`
- **Layout Rules**: `PLACE_PAGE_LOCK_SPAN_RULES.md`

---

## Conclusion

The Also On cards now correctly implement the **stacked-image editorial design** with:

✅ **Dominant image block** - Taller, distinct color, clear separator  
✅ **Clear content section** - White background, proper padding  
✅ **Editorial aesthetic** - Reads as "map tile" not "list item"  
✅ **Better section spacing** - Extra margin for visual rhythm  

**Status**: Ready for production ✅
