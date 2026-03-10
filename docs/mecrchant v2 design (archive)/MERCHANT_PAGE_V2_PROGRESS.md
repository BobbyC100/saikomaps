# Merchant Page v2 Implementation Progress

**Date:** February 9, 2026  
**Spec:** `saiko-merchant-page-wireframe-v2.html` (LOCKED)  
**Status:** In Progress

---

## ✅ Components Complete

### 1. Hero Section
- ✅ `/components/merchant/HeroSection.tsx` + CSS
- Full-width hero photo (220px height)
- Photo count badge (bottom-left)
- Share button (top-right)
- Hero info (name, meta, status)
- Tap handlers for gallery lightbox

### 2. Action Strip
- ✅ `/components/merchant/ActionStrip.tsx` + CSS
- Tool rail between hero and grid
- Actions: Directions (primary), Call, Instagram
- Centered layout with subtle hover states

### 3. Bento Grid Cards

**Hours Card (2-col)**
- ✅ `/components/merchant/HoursCard.tsx` + CSS
- Today's hours with status
- Expand/collapse for full week
- Handles irregular hours fallback

**Gallery Card (3-col)**
- ✅ `/components/merchant/GalleryCard.tsx` + CSS
- 2×3 thumbnail collage (6 images)
- Overflow indicator (+N) on last thumbnail
- Custom corner radii per spec
- Click handlers for lightbox

**Curator Card (3-col)**
- ✅ `/components/merchant/CuratorCard.tsx` + CSS
- Lighter feel than Coverage
- No left border decoration
- Expandable to 4-col when Coverage missing

**Coverage Card (4-col)**
- ✅ Updated `/components/merchant/CoverageCard.tsx` + CSS
- Source label (uppercase publication)
- Quote with 2px left border
- Optional vibe tag
- More prominent than Curator

---

## ✅ All Components Complete!

### 4. MapCard (6-col)
- ✅ `/components/merchant/MapCard.tsx` + CSS
- 60×60px preview with grid overlay + pin
- Address info with street + city/state
- Click handler for Expanded Map View

### 5. DetailsCard (6-col)
- ✅ `/components/merchant/DetailsCard.tsx` + CSS
- Stacked rows with label/value pairs
- Rows: Website, Restaurant Group, Service, Reservations, Parking, Accessibility
- Expand/collapse for rows beyond 4

### 6. VibeCard (6-col)
- ✅ `/components/merchant/VibeCard.tsx` + CSS
- Tags in flex wrap with hover states
- Tag styling per spec

### 7. AlsoOnCard (6-col)
- ✅ `/components/merchant/AlsoOnCard.tsx` + CSS
- List of maps with 36×36px thumbnails
- Deduplicated by slug, max 3 items

---

## 📝 Main Page Integration

**Status:** NOT STARTED

### Tasks
- [ ] Update `/app/(viewer)/place/[slug]/page.tsx` to use new components
- [ ] Remove old bento grid structure
- [ ] Add Hero Section at top
- [ ] Add Action Strip below Hero
- [ ] Add new 6-column Bento Grid
- [ ] Implement graceful degradation logic
- [ ] Add gallery lightbox functionality
- [ ] Add share sheet functionality

### Graceful Degradation Logic

| Variant | Row 1 | Row 2 |
|---------|-------|-------|
| **Full Data** | Hours (2) + Coverage (4) | Gallery (3) + Curator (3) |
| **No Curator** | Hours (2) + Coverage (4) | Gallery (6) |
| **No Coverage** | Hours (2) + Curator (4) | Gallery (3) + [flows naturally] |
| **No Editorial** | Hours (3) + Gallery (3) | — |

---

## 🎨 CSS Updates Needed

**Status:** PARTIALLY COMPLETE

- ✅ Hero Section CSS
- ✅ Action Strip CSS
- ✅ Hours Card CSS
- ✅ Gallery Card CSS
- ✅ Curator Card CSS
- ✅ Coverage Card CSS (updated)
- 🔧 MapCard CSS (not started)
- 🔧 DetailsCard CSS (not started)
- 🔧 VibeCard CSS (not started)
- 🔧 AlsoOnCard CSS (not started)
- 🔧 Update `/app/(viewer)/place/[slug]/place.module.css` for new 6-col grid

---

## 📦 Additional Features Needed

### Gallery Lightbox
- **Status:** NOT STARTED
- Fullscreen overlay
- Swipeable image carousel
- Close button
- Photo count indicator
- Triggered from: Hero tap, Photo count badge, Gallery thumbnails

### Share Sheet
- **Status:** NOT STARTED
- Native share API
- Fallback for unsupported browsers
- Share URL: `/place/[slug]`
- Share text: Place name + tagline

---

## 🧪 Testing Checklist

- [ ] Hero photo loads correctly
- [ ] Photo count badge accurate
- [ ] Share button opens share sheet
- [ ] Action Strip shows correct actions (Directions/Call/Instagram)
- [ ] Hours card expand/collapse works
- [ ] Gallery thumbnails open lightbox at correct image
- [ ] Curator card renders when data exists
- [ ] Coverage card shows correct source
- [ ] Map card opens Expanded Map View
- [ ] Details rows render correctly
- [ ] Vibe tags wrap properly
- [ ] Also On list shows deduplicated maps
- [ ] Graceful degradation: Coverage + Curator → both render
- [ ] Graceful degradation: No Curator → Gallery expands to 6-col
- [ ] Graceful degradation: No Coverage → Curator expands to 4-col
- [ ] Mobile responsive behavior

---

## 🚀 Next Steps

**Immediate (Priority 1):**
1. Create MapCard component
2. Create DetailsCard component
3. Create VibeCard component
4. Create AlsoOnCard component

**Then (Priority 2):**
1. Update main page.tsx to use new components
2. Implement gallery lightbox
3. Implement share functionality
4. Update CSS for 6-col grid

**Finally (Priority 3):**
1. Test all interactions
2. Test graceful degradation
3. Test mobile responsive
4. Polish animations and transitions

---

**Components:** ✅ 100% Complete  
**Next:** Main page integration
