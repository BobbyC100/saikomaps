# Saiko Homepage — Cursor Build Spec

## Overview
Homepage for Saiko Maps featuring a watercolor illustrated map hero with editorial typography, followed by neighborhood and category browse sections.

---

## Hero Section

### Background
- **Image**: `kurt-watercolor-map.png` (attached)
- **Positioning**: `background-size: cover; background-position: center;`
- **No manipulation needed** — image is clean

### Typography
- **Brand**: "Saiko Maps"
  - Font: Libre Baskerville, italic, 68px
  - Letter-spacing: 6px
  - Color: #36454F (charcoal)
  - Opacity: 0.88
  - `mix-blend-mode: multiply`
  - `text-shadow: 0 1px 2px rgba(245, 240, 225, 0.5)`

- **Location**: "Los Angeles"
  - Font: Inter Tight, 600 weight, 11px
  - Letter-spacing: 5px
  - Uppercase
  - Color: #C3B091 (khaki)
  - Opacity: 0.85

### CTA Button
- Text: "Explore"
- Font: Inter Tight, 500 weight, 11px
- Letter-spacing: 2px
- Uppercase
- Background: `rgba(54, 69, 79, 0.75)`
- Color: #F5F0E1 (parchment)
- Padding: 12px 32px
- Border-radius: 5px
- Opacity: 0.9

### Layout
- Height: 60vh (min: 450px, max: 650px)
- Content vertically centered, nudged up 8% (`margin-top: -8%`)
- Bottom gradient fade: parchment fading in over 80px

### Scroll Hint
- Subtle down chevron at bottom center
- Color: #8B7355 (leather)
- Opacity: 0.4
- Gentle float animation (4px travel, 2.5s ease-in-out infinite)

---

## By Neighborhood Section

### Layout
- Max-width: 1200px, centered
- Padding: 56px 32px

### Section Header
- Title: "BY NEIGHBORHOOD"
  - Font: Inter Tight, 700 weight, 12px
  - Letter-spacing: 2.4px
  - Uppercase
  - Color: #8B7355 (leather)
- Link: "See all →"
  - Font: Inter Tight, 600 weight, 11px
  - Color: #C3B091 (khaki)
- Border-bottom: 1px solid rgba(195, 176, 145, 0.25)

### Cards Grid
- 4 columns, 20px gap
- Responsive: 2 cols at 1000px, 1 col at 600px

### Neighborhood Card
- Aspect ratio: 4:3
- Border-radius: 12px
- Image: cover, saturate(0.9) contrast(1.05)
- Hover: scale(1.05) on image
- Gradient overlay: charcoal from bottom
- Content at bottom:
  - Name: Libre Baskerville, italic, 18px, white
  - Count: Inter Tight, 600 weight, 10px, uppercase, white 70%

### Sample Data
1. Echo Park — 31 places
2. Highland Park — 28 places
3. Koreatown — 67 places
4. San Gabriel Valley — 53 places

---

## By Category Section

### Background
- #FFFDF7 (warm-white)

### Cards Grid
- Same layout as neighborhoods

### Category Card
- Background: warm-white
- Border: 1px solid rgba(195,176,145,0.2)
- Border-radius: 12px
- Hover: translateY(-4px) + shadow

### Card Structure
- Image: aspect-ratio 16:10
- Body padding: 18px
- Title: Libre Baskerville, italic, 17px, charcoal
- Description: 13px, leather color, 1.5 line-height
- Meta: Inter Tight, 600 weight, 10px, uppercase, khaki

### Sample Data
1. Wine — "Natural pours and neighborhood gems" — 19 places
2. Coffee — "Third wave pours and quiet corners" — 38 places
3. Cheese Shops — "Curated selections and expert picks" — 8 places
4. Late Night — "Open past midnight when you need it" — 24 places

---

## Footer

### Layout
- Background: #36454F (charcoal)
- Padding: 48px 32px
- Max-width: 1200px content

### Left Side
- Logo: "SAIKO" — Inter Tight, 700, 14px, letter-spacing 3px
- Tagline: "Curated maps from people who know." — Libre Baskerville, italic, 13px, 50% opacity

### Right Side (Link Groups)
- Group headers: Inter Tight, 700, 10px, uppercase, 40% opacity
- Links: 13px, 70% opacity

### Bottom
- "© 2026 Saiko Maps"
- Border-top: 1px solid 10% opacity
- Font: 11px, 30% opacity

---

## Color Palette

```css
--parchment: #F5F0E1;
--warm-white: #FFFDF7;
--charcoal: #36454F;
--khaki: #C3B091;
--leather: #8B7355;
```

---

## Fonts

```html
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@500;600;700&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;1,400&display=swap" rel="stylesheet">
```

---

## Assets Needed
1. `kurt-watercolor-map.png` — Hero background (attached)
2. Neighborhood photos (Unsplash or similar)
3. Category photos (Unsplash or similar)

---

## Reference
Working prototype: `saiko-homepage-kurt.html`
