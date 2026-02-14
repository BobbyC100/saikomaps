# Merchant Page v2 — Next Steps

**Date:** February 9, 2026  
**Status:** Hierarchy fixes complete, awaiting test results  
**Current URL:** http://localhost:3000/place/stir-crazy

---

## ✅ Completed (Session 1)

### Hierarchy Fixes — All 7 Done
1. ✅ Meta Line — Meal context (Dinner · Melrose · $$)
2. ✅ Status Duplicate — Removed from Hours card
3. ✅ Action Strip — Increased spacing (16px gap, larger tap targets)
4. ✅ Share Icon — Editorial arrow (↗) instead of system icon
5. ✅ Gallery Structure — Verified 3-col with 2×3 grid
6. ✅ Details Card — Clean website formatting
7. ✅ Vibe Card — Verified rendering

**Documentation:** `MERCHANT_PAGE_V2_FIXES_COMPLETE.md`

---

## 🔜 Remaining Refinements (Queued)

### Priority 1: Mobile Responsive Behavior ⭐️
**Impact:** High — Many users on mobile  
**Effort:** Medium — Systematic CSS updates

**What's needed:**
- [ ] Add `@media (max-width: 640px)` to all 11 component CSS modules
- [ ] Collapse 6-column grid to single column on mobile
- [ ] Stack Action Strip vertically on mobile
- [ ] Adjust hero photo height (220px → 180px on mobile?)
- [ ] Ensure typography stays above 9-10px minimum
- [ ] Test gallery thumbnail grid on small screens
- [ ] Test all interactions on touch devices

**Files to update:**
```
components/merchant/HeroSection.module.css
components/merchant/ActionStrip.module.css
components/merchant/HoursCard.module.css
components/merchant/CoverageCard.module.css
components/merchant/GalleryCard.module.css
components/merchant/CuratorCard.module.css
components/merchant/MapCard.module.css
components/merchant/DetailsCard.module.css
components/merchant/VibeCard.module.css
components/merchant/AlsoOnCard.module.css
components/merchant/GalleryLightbox.module.css
app/(viewer)/place/[slug]/page.tsx (grid container)
```

**Approach:**
1. Start with grid container (page.tsx) — collapse to 1 column
2. Action Strip — stack vertically, full-width buttons
3. Cards — ensure proper padding/spacing on mobile
4. Hero — adjust photo height if needed
5. Gallery lightbox — ensure mobile-friendly controls
6. Test on real devices or Chrome DevTools mobile emulation

---

### Priority 2: Expanded Map View ⭐️
**Impact:** High — Key user expectation  
**Effort:** Low — Quick implementation

**Current state:** Line 458 in `page.tsx` just logs to console

**Options:**

**Option A: Quick External Link** (5 min)
```tsx
onMapClick={() => {
  const lat = location.latitude;
  const lng = location.longitude;
  const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  window.open(url, '_blank');
}}
```

**Option B: Use Existing Component** (if it exists)
- Check if `ExpandedMapView` component exists in codebase
- Wire it up with modal state
- Pass location data

**Option C: Custom Modal Map** (future enhancement)
- Embed Google Maps iframe
- Show related places nearby
- Add save/share functionality

**Recommendation:** Start with Option A for immediate functionality, enhance later if needed.

---

### Priority 3: Edge Cases & Missing Data ⭐️
**Impact:** Medium-High — Prevents layout breaks  
**Effort:** Low — Mostly handled, needs verification

**Test scenarios:**
- [ ] Place with no photos (empty photoUrls array)
- [ ] Place with only 1 photo (no gallery, just hero)
- [ ] Place with no Coverage AND no Curator
- [ ] Place with no Vibe tags
- [ ] Place with no Also On maps
- [ ] Place with irregular hours ("By appointment only")
- [ ] Place with no phone number
- [ ] Place with no Instagram
- [ ] Place with no website
- [ ] Place with no neighborhood

**What to verify:**
- [ ] Empty states render gracefully (no broken UI)
- [ ] No console errors
- [ ] Grid flows naturally when cards are missing
- [ ] Fallback content shows where appropriate

**Potential improvements:**
- Add placeholder states for missing data?
- "No photos yet" state for gallery?
- Better fallback for irregular hours?

---

### Priority 4: Polish Interactions
**Impact:** Medium — Nice-to-have refinement  
**Effort:** Low-Medium

**Enhancements to consider:**

**Card Hover States:**
```css
/* Subtle scale transform on interactive cards */
.mapCard:hover,
.galleryCard:hover {
  transform: scale(1.01);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
```

**Gallery Thumbnails:**
- Add border highlight on hover?
- Subtle zoom effect on hover?

**Image Loading:**
- Add loading skeleton for hero image
- Fade-in transition when photos load
- Progressive image loading (blur-up effect?)

**Lightbox Transitions:**
- Smoother slide transitions between photos
- Fade-in effect when opening lightbox

**Keyboard Accessibility:**
- Tab navigation through all interactive elements
- Focus visible styles
- ARIA labels where needed

---

### Priority 5: Performance Optimization
**Impact:** Medium — Important but not blocking  
**Effort:** Medium

**Optimizations to implement:**

**1. Image Optimization**
- [ ] Replace `<img>` and background-image with Next.js `<Image>` component
- [ ] Add `loading="eager"` to hero image only
- [ ] Add `loading="lazy"` to below-the-fold images (gallery, thumbnails)
- [ ] Specify image sizes for better LCP

**2. Component Loading**
- [ ] Defer gallery lightbox rendering until opened
- [ ] Lazy load below-the-fold cards (map, details, vibe, also on)
- [ ] Code split heavy components if bundle is large

**3. Data Fetching**
- [ ] Add SWR or React Query for client-side caching
- [ ] Implement ISR (Incremental Static Regeneration) for place pages
- [ ] Add loading skeletons during fetch

**4. Rendering**
- [ ] Memoize expensive calculations (meal context, hours parsing)
- [ ] Use `React.memo()` for static cards
- [ ] Avoid unnecessary re-renders

**Measurement:**
- Run Lighthouse audit before/after
- Check Core Web Vitals (LCP, FID, CLS)
- Test on slow 3G connection

---

## 🧪 Testing Protocol (Before Next Session)

### Desktop Testing
1. **Chrome DevTools**
   - Open http://localhost:3000/place/stir-crazy
   - Verify all 7 hierarchy fixes
   - Check console for errors
   - Test all interactions (share, gallery, hours expand, etc.)

2. **Multiple Places**
   - Test with different data profiles
   - Places with missing data (no photos, no coverage, etc.)
   - Places with irregular hours

### Mobile Testing (When Ready)
1. **Responsive Design Mode**
   - Chrome DevTools → Toggle device toolbar
   - Test at 375px (iPhone SE)
   - Test at 390px (iPhone 12)
   - Test at 640px (breakpoint)
   - Test at 768px (tablet)

2. **Real Device** (if possible)
   - Open on actual phone
   - Test touch interactions
   - Verify tap targets are large enough
   - Check text readability

### Edge Case Testing
- Visit places with:
  - No photos
  - No editorial content
  - Irregular hours
  - Missing social/contact info

---

## 📝 Feedback Template

**After testing, capture:**

### What Works Well
- [ ] List things that feel right
- [ ] Interactions that are smooth
- [ ] Layout that looks good

### Issues Found
- [ ] Visual bugs (layout breaks, overlaps, etc.)
- [ ] Functional bugs (clicks don't work, errors, etc.)
- [ ] Design concerns (hierarchy, spacing, colors)

### Questions/Concerns
- [ ] Anything unclear or confusing
- [ ] Features that need clarification
- [ ] Performance issues

---

## 🚀 Implementation Strategy (After Testing)

### If testing goes well:
1. **Tackle mobile responsive** (biggest remaining gap)
2. **Quick-fix expanded map** (5-minute win)
3. **Polish interactions** (nice-to-haves)
4. **Performance audit** (measure and optimize)

### If issues found:
1. **Fix critical bugs first** (layout breaks, console errors)
2. **Address design concerns** (hierarchy adjustments)
3. **Re-test** before moving to next refinements

---

## 📊 Progress Tracking

| Task | Status | Priority | Effort | Notes |
|------|--------|----------|--------|-------|
| Hierarchy fixes | ✅ Complete | High | Done | 7/7 fixes shipped |
| Mobile responsive | 🔜 Queued | High | Medium | Next up |
| Expanded map | 🔜 Queued | High | Low | Quick win |
| Edge cases | 🔜 Queued | Medium | Low | Mostly handled |
| Interaction polish | 🔜 Queued | Medium | Low | Nice-to-have |
| Performance | 🔜 Queued | Medium | Medium | After core is solid |

---

## 🎯 Success Criteria

**Merchant Page v2 is "done" when:**
- ✅ All hierarchy fixes implemented
- ⏳ Mobile responsive at 640px breakpoint
- ⏳ Map interaction works (at minimum, opens Google Maps)
- ⏳ No layout breaks with missing data
- ⏳ All interactions work smoothly
- ⏳ Page loads fast (LCP <2.5s)
- ⏳ No console errors
- ⏳ Passes user acceptance testing

---

**Current Status:** Ready for testing! Test at http://localhost:3000/place/stir-crazy

**Next Session:** Resume with your testing feedback, then tackle mobile responsive + expanded map view.
