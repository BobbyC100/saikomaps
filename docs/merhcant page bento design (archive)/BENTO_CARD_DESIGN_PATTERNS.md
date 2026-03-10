# Saiko Maps Bento Card Design Patterns - Quick Reference

**Purpose**: Quick reference for reviewing individual bento card UI designs  
**Date**: February 7, 2026  
**Status**: Aligned with current implementation

---

## Design System Overview

### Grid Foundation
- **6 columns** on desktop (720px max-width container)
- **10px gap** between all blocks
- **Single column** on mobile (≤640px)
- **Background**: #F5F0E1 (parchment)
- **Cards**: #FFFDF7 (off-white)

### Typography Scale
- **Merchant Name**: Libre Baskerville 32px italic
- **Tagline**: System UI 14px regular
- **Block Labels**: System UI 9px uppercase, 2.5px letter-spacing
- **Editorial Text**: Libre Baskerville 15px italic (Curator's Note, Pull Quote, Vibe)
- **Body Text**: System UI 13-14px
- **Meta Text**: System UI 10px uppercase

### Color Palette (Field Notes)
```css
--fn-parchment: #F5F0E1  /* Page background */
--fn-white: #FFFDF7      /* Card background */
--fn-khaki: #C3B091      /* Accent/labels */
--fn-charcoal: #36454F   /* Text */
--fn-sage: #4A7C59       /* Open status */
--fn-coral: #D64541      /* Map pin */
--fn-blue: #89B4C4       /* Links */
```

---

## Layout Patterns by Tier

### TIER 0: Hero Section (Always Present)
```
┌─────────────────────────────────┐
│   HERO IMAGE (180px height)     │
├─────────────────────────────────┤
│   Merchant Name (32px italic)   │
│   Tagline (14px, optional)      │
│   Category · Hood · $ · ● Open  │
└─────────────────────────────────┘
```

**Design Notes**:
- Hero image: 180px fixed height, object-fit: cover
- Tagline appears between name and meta row (subtle gray)
- Meta row uses dot separators with status indicator

---

### TIER 1: Actions & Gallery

#### Pattern 1A: Action Cards (3 equal cards)
```
┌───────┬───────┬───────┐
│  🌐   │  📷   │  📍   │
│domain │@handle│address│
└───────┴───────┴───────┘
```

**Design Notes**:
- **NO LABELS** — Icon + value only (no "Website", "Instagram", "Directions" text)
- Icons: 20px, khaki color (#C3B091)
- Value only: 12px (domain/handle/address)
- Equal width, centered content

**Actions**:
- **Website**: Opens merchant website or Google Maps listing (target="_blank")
- **Instagram**: Opens @handle on Instagram (target="_blank")
- **Directions**: Opens **native maps** (Apple Maps on iOS, Google Maps elsewhere)

**Swap Logic**:
- **Instagram present**: [Website] [Instagram] [Directions] → Call stays in Tier 3
- **Instagram missing**: [Website] [Call] [Directions] → Call swaps up from Tier 3

#### Pattern 1B: Gallery (Bento Collage)
```
4+ Photos:
┌─────────┬───┐
│         │ 2 │
│    1    ├───┤
│ (Hero)  │ 3 │
│         ├───┤
│         │+4 │
└─────────┴───┘
```

**Design Notes**:
- 1 photo: Full width, 16:9
- 2 photos: Side by side
- 3 photos: Hero left (60%), 2 stacked right (40%)
- 4+ photos: Hero left (60%), 3 stacked right with "+N" overlay
- 8px gap between photos, 12px border-radius on container

---

### TIER 2: Editorial Content (Flexible Pairing)

#### Pattern 2A: Curator's Note (3 or 6 col)
```
┌─────────────────────┐
│ CURATOR'S NOTE      │
│                     │
│ "Editorial content  │
│  in italic serif    │
│  font..."           │
│                     │
│ — Curator Name      │
└─────────────────────┘
```

**Design Notes**:
- Libre Baskerville 15px italic
- 0.85 opacity for elegant feel
- Attribution: 12px, 0.5 opacity
- Spans 3-col when paired, 6-col alone

#### Pattern 2B: Pull Quote (3 or 6 col)
```
┌─────────────────────┐
│ REVIEW              │
│                     │
│ "Quote text in      │
│  italic serif..."   │
│                     │
│ — LA Times, Author  │
└─────────────────────┘
```

**Design Notes**:
- **Priority**: Takes precedence over Excerpt
- Libre Baskerville 15px italic
- Source/author: 10px uppercase
- Spans 3-col when with Vibe, 6-col alone

#### Pattern 2C: Excerpt (3 or 6 col)
```
┌─────────────────────┐
│ │                   │
│ │ "Quote from       │
│ │  source..."       │
│ │ — Publication     │
└─────────────────────┘
```

**Design Notes**:
- **Only shows if NO Pull Quote exists**
- Left border: 3px khaki accent (30% opacity)
- No label (quote speaks for itself)
- 14px serif font, 0.7 opacity

#### Pattern 2D: Vibe (3 or 6 col)
```
┌─────────────────────┐
│ SCENESENSE          │
│                     │
│ Low-key · Surf      │
│ crowd · Standing    │
│ room                │
└─────────────────────┘
```

**Design Notes**:
- Libre Baskerville 15px italic
- Dot separators between tags (·)
- 0.7 opacity for subtlety
- Wraps naturally, not comma-separated

#### Pairing Examples:
```
3-col + 3-col (Side by Side):
┌──────────────┬──────────────┐
│ Curator Note │ Pull Quote   │
└──────────────┴──────────────┘

┌──────────────┬──────────────┐
│ Curator Note │ Vibe         │
└──────────────┴──────────────┘

┌──────────────┬──────────────┐
│ Pull Quote   │ Vibe         │
└──────────────┴──────────────┘

6-col (Full Width when alone):
┌─────────────────────────────┐
│ Curator Note                │
└─────────────────────────────┘
```

---

### TIER 3: Practical Info (tier3Row)

#### Pattern 3: Hours + Map + Call (or Hours + Map only)
```
DEFAULT (Instagram present):
┌────────────┬──────────┬────────┐
│   HOURS    │   MAP    │  CALL  │
│            │          │        │
│ M  9-5     │  ╱──╼    │   📞   │
│ T  9-5     │ ─┼──┼─   │ (213)  │
│ W  9-5     │  │ ● │   │ 555-   │
│ Th 9-5     │ ─┼──┼─   │ 1234   │
│            │  ╲──╱    │        │
│ F  9-9     │          │        │
│ S  9-9     │ Street   │        │
│ Su Closed  │ City, ST │        │
│            │          │        │
│ ● Open·11PM│          │        │
└────────────┴──────────┴────────┘
    2 col        2 col      2 col

INSTAGRAM MISSING (Call swapped to Actions):
┌────────────┬──────────┐
│   HOURS    │   MAP    │
│            │          │
│ M  9-5     │  ╱──╲    │
│ T  9-5     │ ─┼──┼─   │
│ W  9-5     │  │ ● │   │
│ Th 9-5     │ ─┼──┼─   │
│            │  ╲──╱    │
│ F  9-9     │          │
│ S  9-9     │ Street   │
│ Su Closed  │ City, ST │
│            │          │
│ ● Open·11PM│          │
└────────────┴──────────┘
    2 col        2 col
```

**Design Notes**:
- **Hours**: 2-column internal layout (M-Th | F-Su), status footer
  - **Status Footer**: "Open · Closes 11 PM" or "Closed · Opens 7 AM"
  - **Rationale**: Hero shows binary status, footer adds actionable timing
  - **Irregular Hours**: "Hours vary" + "View on Google →" link (centered, Libre Baskerville italic 13px)
- **Map**: Field Notes styled with roads + pin, address below
  - **Action**: Opens **Expanded Map View in Saiko** (NOT external maps)
- **Call**: Icon + number, vertically centered
  - **Swap Logic**: Moves to Action Cards row when Instagram missing
- CSS Grid handles graceful degradation when blocks missing
- All blocks stretch to match tallest

---

### TIER 4: Secondary Content

#### Pattern 4A: Tips (Full Width, Multi-Column)
```
┌────────────────────────────────────────┐
│ TIPS                                   │
│                                        │
│ • Go early for      • Try the flat    │
│   a seat              white            │
│ • Cash only         • Ask about       │
│                       specials         │
└────────────────────────────────────────┘
```

**Design Notes**:
- **Full width (6 columns)**
- Auto-fit grid: `repeat(auto-fit, minmax(200px, 1fr))`
- Khaki bullets (#C3B091)
- 13px text, 1.6 line-height
- Flows naturally into columns as needed

#### Pattern 4B: Coverage Row (Special Layout)
```
┌──────────────────┬─────────────────┐
│ COVERAGE         │  ┈┈┈┈┈┈┈┈┈┈┈   │
│                  │  ░ Quiet Card  │
│ EATER            │  ┈┈┈┈┈┈┈┈┈┈┈   │
│ Best Coffee in   ├─────────────────┤
│ LA               │  ≋≋≋≋≋≋≋≋≋≋≋   │
│                  │  ░ Quiet Card  │
│ LA TIMES         │  ≋≋≋≋≋≋≋≋≋≋≋   │
│ Top 10 Cafes     │                 │
└──────────────────┴─────────────────┘
      50%                  50%
```

**Design Notes**:
- **Special nested row** (not standard grid)
- Coverage block: 50% width, stacked links
- Quiet Cards: 50% width, 2 stacked vertically
- Publication: 9px uppercase bold
- Title: 11px italic serif, 0.5 opacity
- Only place where Quiet Cards are used

#### Pattern 4C: Best For (Full Width)
```
┌────────────────────────────────────────┐
│ BEST FOR                               │
│                                        │
│ Paragraph description of what this     │
│ place is best for. Flows naturally in  │
│ 14px body text...                      │
└────────────────────────────────────────┘
```

**Design Notes**:
- Simple, clean paragraph block
- 14px text, 1.65 line-height
- No special formatting

#### Pattern 4D: Also On (Full Width)
```
┌────────────────────────────────────────┐
│ ALSO ON                                │
│                                        │
│ ┌──────────┐ ┌──────────┐ ┌─────────┐│
│ │Downtown ↗│ │Coffee ↗  │ │Saiko ↗ ││
│ └──────────┘ └──────────┘ └─────────┘│
└────────────────────────────────────────┘
```

**Design Notes**:
- Pill-shaped buttons with border
- Khaki border (30% opacity)
- Hover: Khaki background (10% opacity)
- External link arrow (↗)
- Max 3 maps shown

---

## Quiet Cards (Coverage Row Only)

### Variants
1. **Topo**: Concentric ellipses (topographic map style)
2. **Texture**: Cross-hatch grid pattern
3. **Minimal**: Single circle outline

**Usage**:
- Currently ONLY in Coverage Row (2 stacked)
- Patterns at 15% opacity
- Match card background (#FFFDF7)
- Future: May expand to general grid filling

---

## Responsive Behavior (Mobile ≤640px)

### Changes on Mobile:
- Grid becomes **single column**
- Action Cards: Stay 3-across (1fr 1fr 1fr)
- Hours: Keeps 2-column internal layout
- tier3Row: Stacks vertically (Hours → Map → Call)
- All other blocks: Full width stack
- Spacing: Maintained at 10px gap

---

## Design Review Checklist

When reviewing each bento card design:

### Visual Hierarchy
- [ ] Label is 9px uppercase, 2.5px letter-spacing, khaki
- [ ] Content respects typography scale
- [ ] Padding is 20px (consistent across cards)
- [ ] Border-radius is 12px

### Color & Contrast
- [ ] Background uses #FFFDF7 (fn-white)
- [ ] Text uses #36454F (fn-charcoal)
- [ ] Accents use #C3B091 (fn-khaki)
- [ ] Special colors (sage for open, coral for pin)

### Spacing & Layout
- [ ] Block respects grid-column span
- [ ] Internal spacing uses 8-12px increments
- [ ] Line-height is 1.4-1.65 for readability
- [ ] Elements align to visual grid

### Typography
- [ ] Editorial content uses Libre Baskerville italic
- [ ] UI elements use system-ui sans-serif
- [ ] Font sizes match scale (9, 10, 11, 12, 13, 14, 15, 32)
- [ ] Letter-spacing on labels (1-2.5px)

### Interaction States
- [ ] Hover states are subtle (background fade)
- [ ] Active links have clear affordances
- [ ] Cursor changes to pointer on interactive elements
- [ ] Transitions are 0.15s ease

---

## Current Implementation Status

✅ **Locked & Complete**:
- Hero + Meta section
- Action Cards (Website, Instagram, Directions)
- Gallery (1, 2, 3, 4+ photo layouts)
- Curator's Note
- Vibe block
- Hours card (2-column layout + status)
- Map card (Field Notes style)
- Call card
- Best For
- Also On

✅ **Newly Documented**:
- Pull Quote (takes priority over Excerpt)
- Tagline (appears under merchant name)
- Tips (full-width multi-column layout)
- Coverage Row (with nested Quiet Cards)

🔄 **Future Enhancements**:
- Dynamic Quiet Card filling for sparse layouts
- Drag-and-drop block reordering
- A/B testing different layouts
- AI-generated content for missing blocks

---

## Quick Decision Tree

### "Should Call be in Action Cards or Tier 3?"

**Decision Point**: Is Instagram present?
- Instagram present → Call stays in Tier 3 (Hours + Map + Call)
- Instagram missing → Call swaps to Action Cards middle position (Website + Call + Directions)

**Why**: Action Cards row should always have 3 cards. We prioritize social presence (Instagram) but fall back to direct contact (Call) when IG is unavailable.

### "What does the Directions card do?"

**Action**: Opens **native maps application**
- iOS: Apple Maps
- Android: Google Maps  
- Web: Google Maps (web version)

**NOT**: Does not open Saiko's expanded map view (that's what the Map card does)

### "What does the Map card do?"

**Action**: Opens **Expanded Map View in Saiko**
- Shows full interactive map centered on this location
- Different from Directions (which opens external maps app)

### "Should this block be 3-col or 6-col?"

**Tier 2 Editorial Blocks**:
- If 2 blocks present → Both 3-col (side-by-side)
- If 1 block present → 6-col (full width)

**Everything else**:
- Action Cards: Always 6-col wrapper (3 cards inside)
- Gallery: Always 6-col
- tier3Row: Special layout (not grid-based)
- Tips: Always 6-col
- Coverage Row: Special layout (50/50)
- Best For: Always 6-col
- Also On: Always 6-col

### "Does Pull Quote show with Excerpt?"

**NO** - Pull Quote takes priority:
- Pull Quote exists → Show Pull Quote only
- Pull Quote missing → Show Excerpt (if exists)
- Both missing → Neither shows

### "When do Quiet Cards appear?"

**Only in Coverage Row**:
- Coverage Row present → 2 Quiet Cards (stacked right side)
- Coverage Row absent → NO Quiet Cards anywhere
- General grid filling = Future enhancement

---

## Files to Reference

1. **Visual Reference**: `docs/MERCHANT_PAGE_BENTO_GRID.md`
2. **Implementation**: `app/(viewer)/place/[slug]/page.tsx`
3. **Styles**: `app/(viewer)/place/[slug]/place.module.css`
4. **Components**: `app/components/merchant/QuietCard.tsx`
5. **This Summary**: `docs/BENTO_GRID_ALIGNMENT_SUMMARY.md`

---

**Ready to review individual card designs with full system knowledge! 🎨**
