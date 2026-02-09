# Merchant Page v2 — Current Status

**Date:** February 9, 2026  
**Session:** Post-debugging  
**Server:** http://localhost:3000

---

## ✅ CONFIRMED WORKING

### 1. Meta Line — Meal Context ✅
- **Stir Crazy:** "LATE NIGHT · MELROSE · $$" (opens 5 PM)
- **Great White:** "LUNCH · CENTRAL LA" (opens 8 AM)
- Logic working perfectly based on opening hours

### 2. Hours Card ✅
- **No duplicate status** - removed from Hours card (only in Hero)
- Clean display: hours + "See all hours" link
- Expand/collapse working

### 3. Gallery Card — Graceful Degradation ✅
- **Stir Crazy:** 6-column span (NO curator note) ✅ Correct!
- **Great White:** 6-column span (NO curator note) ✅ Correct!
- **API now fetches 10 photos** (was 4)
- 2×3 grid layout rendering properly

### 4. Action Strip ✅
- **Spacing increased:** gap: 16px, padding: 10px 18px
- Breathing room improved
- Centers correctly

### 5. Share Button ✅
- **Arrow icon (↗)** instead of share-box
- Editorial styling matches site language

### 6. Website Display ✅
- **Clean formatting:** `stircrazy.la`, `greatwhitevenice.com`
- Protocol and www stripped
- Links working

### 7. Map Card ✅
- **Rendering with proper structure:**
  - 60×60px preview box
  - SVG grid overlay
  - Centered pin
  - Address text
- May appear small in screenshots but structure is correct

---

## ⏳ NEEDS VERIFICATION

### 1. Gallery 3+3 Layout (Not Tested Yet)
**Status:** Logic is implemented, but we haven't tested with a place that HAS a curator note

**Test needed:**
```typescript
// When curator note EXISTS
<GalleryCard span={3} />  // Should be 3-col
<CuratorCard span={3} />  // Should be 3-col
// Result: Side by side
```

**Current test data:**
- Stir Crazy: `curatorNote: null` → Gallery correctly spans 6
- Great White: `curatorNote: null` → Gallery correctly spans 6  
- Bridgetown: `curatorNote: null` → Gallery correctly spans 6

**Action:** Need to find or create a place WITH a curator note to verify 3+3 layout

### 2. Details Card — Instagram Removal
**Status:** Code shows Instagram removed, but screenshot hard to verify

**Need to verify:**
- Details card shows ONLY: Website, Part of, Service, Reservations, Parking
- NO Instagram row (it's in Action Strip instead)

---

## 🧪 Test Plan

### Find a Place with Curator Note
Query database or create test data:
```sql
-- Find places with curator notes
SELECT slug, name 
FROM places 
WHERE curator_note IS NOT NULL 
LIMIT 5;
```

Or manually add a curator note via MapPlace descriptor.

### Verify 3+3 Layout
Once we have a place with curator note:
1. Navigate to `/place/[slug]`
2. Verify Gallery is 3 columns wide (half width)
3. Verify Curator appears next to it (3 columns)
4. Verify they sit side by side, not stacked

### Complete Visual Check
- [ ] Gallery: 3-col tile when Curator exists
- [ ] Gallery: 6-col tile when no Curator
- [ ] Map: Grid lines visible, pin centered
- [ ] Details: No Instagram row
- [ ] All spacing feels balanced

---

## 📊 Implementation Summary

### Files Modified (This Session)
1. `app/api/places/[slug]/route.ts` — Increased photo limit to 10
2. `components/merchant/GalleryCard.tsx` — Added span prop for graceful degradation
3. `components/merchant/CuratorCard.tsx` — Added span prop for graceful degradation
4. `components/merchant/HeroSection.tsx` — Meal context calculation
5. `components/merchant/HeroSection.module.css` — Share button styling
6. `components/merchant/HoursCard.tsx` — Removed duplicate status
7. `components/merchant/ActionStrip.module.css` — Increased spacing
8. `components/merchant/DetailsCard.tsx` — Website formatting
9. `app/(viewer)/place/[slug]/page.tsx` — Gallery/Curator span logic

### All 7 Original Fixes Complete
1. ✅ Meta Line (meal context)
2. ✅ Status Duplicate (removed from Hours)
3. ✅ Action Strip (spacing)
4. ✅ Share Icon (arrow)
5. ✅ Gallery (structure + graceful degradation)
6. ✅ Details (website formatting)
7. ✅ Vibe Card (verified rendering)

---

## 🎯 Next Steps

### Immediate
1. **Find test place with curator note** to verify 3+3 layout
2. **Visual QA** on real device (not just screenshots)
3. **Verify Details card** has no Instagram row

### After Verification
1. Mobile responsive (Priority 1 from NEXT_STEPS.md)
2. Expanded Map View click handler (Priority 2)
3. Edge case testing (missing data scenarios)

---

## 🐛 Known Issues

### Minor
- **Map preview small:** May be hard to see grid lines at 60×60px on some displays (design decision, not a bug)
- **Hydration warning:** Bitwarden extension adding attributes (browser extension, not our code)

### To Investigate
- **Details card Instagram:** Need clear screenshot to confirm it's fully removed

---

## 💡 Debugging Notes

### What Worked
- **Red background test:** Confirmed changes ARE deploying
- **Console logs:** Showed span values being passed correctly
- **API curl:** Verified photo count and data structure

### What We Learned
- Gallery appearing "full width" was CORRECT when curator note is null
- Need actual test data with curator notes to verify 3+3 layout
- Browser caching was NOT the issue (changes deploying fine)

---

**Status:** Core functionality complete. Final verification needed on 3+3 layout with proper test data.

**Ready for:** User acceptance testing once curator note test case is available.
