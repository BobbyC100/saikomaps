# Visual Alignment Pass - Progress Report

**Status**: In Progress (1/10 files completed)  
**Date**: 2026-02-17  
**Objective**: Align all user-facing pages to home page baseline (restraint only, no redesign)

---

## Visual Baseline (Extracted from Home Page)

### Typography
- **H1 Hero**: `92px`, `Libre Baskerville`, `italic`, `letter-spacing: 6px`, `font-weight: 400`
- **Section Titles**: Uppercase, extended tracking
- **Button Text**: `14px`, `font-weight: 600`, `letter-spacing: 0.14em`, uppercase
- **Body**: DM Sans, standard sizing

### Spacing
- **Section Padding**: `56px 32px`
- **Max Width**: `1200px`
- **Grid Gap**: `20px`
- **Card Padding**: `8` units (Tailwind)

### Colors (CSS Variables)
- `--parchment`: #F5F0E1 (main background)
- `--warm-white`: #FFFDF7 (alternate background)
- `--charcoal`: #36454F (text)
- `--error`: #C0392B (errors)
- `--leather`: #8B7355 (secondary)

### Buttons
- **Padding**: `18px 56px`
- **Border Radius**: `12px`
- **Shadow**: `0 10px 28px rgba(0,0,0,.10)`
- **Font**: `14px`, `600`, `0.14em` tracking, uppercase

### Border Radius Standard
- `12px` everywhere (no mixing)

---

## Files Completed

### 1. ✅ `/app/(auth)/login/page.tsx`

**Changes Made:**
1. Background: Dark (`#1A1A1A`) → Parchment (`var(--parchment)`)
2. Card background: Dark gray (`#2A2A2A`) → Warm white (`var(--warm-white)`)
3. Text color: White → Charcoal (`var(--charcoal)`)
4. Removed decorative color blocks (lines 66-68)
5. Heading: Sans-serif `text-2xl` → Serif italic `text-3xl` with Libre Baskerville
6. Button: Red hardcoded (`#D64541`) → Charcoal (`var(--charcoal)`)
7. Border radius: Mixed (`rounded-xl`/`rounded-lg`) → Consistent `12px`
8. Input backgrounds: Dark (`#1A1A1A`) → White
9. Focus states: Blue accent → Charcoal
10. Logo variant: `light` → `dark`
11. All hardcoded hex colors → CSS variables
12. Spacing: Increased logo margin from `mb-4` to `mb-8`

**Impact**: Login page now feels like the same product as home page

---

## Files Pending (In Priority Order)

### 2. ⏳ `/app/(auth)/signup/page.tsx`
**Expected issues**: Same as login (dark theme, hardcoded colors, decorative elements)

### 3. ⏳ `/app/(creator)/dashboard/page.tsx`
**Expected issues**: Layout inconsistencies, card styling, spacing rhythm

### 4. ⏳ Modals (TBD - need to find modal components)
**Expected issues**: Inconsistent padding, button placement, backdrop opacity

### 5. ⏳ `/app/coverage/page.tsx`
**Expected issues**: Typography, spacing

### 6. ⏳ `/app/(editor)/maps/[mapId]/edit/page.tsx`
**Expected issues**: Editor UI styling, toolbar consistency

### 7. ⏳ `/app/create/page.tsx`
**Expected issues**: Form styling, button hierarchy

### 8. ⏳ `/app/profile/page.tsx`
**Expected issues**: Card styling, form inputs

---

## Constraints Followed

✅ No new components created  
✅ No new design tokens introduced  
✅ No layout restructuring  
✅ No logic changes  
✅ Used existing CSS variables only  
✅ Removed rather than added styling  
✅ Aligned to baseline, did not invent  

---

## Next Steps

1. Complete signup page (identical changes to login)
2. Audit dashboard for spacing/typography deviations
3. Find and normalize all modal components
4. Check coverage and editor pages
5. Final pass on form inputs across all pages

---

## Estimated Remaining Time

- Signup page: 10 minutes
- Dashboard: 15 minutes
- Modals: 20 minutes (need to locate first)
- Editor pages: 15 minutes
- Coverage/profile: 10 minutes each
- **Total**: ~80 minutes remaining

---

**Note**: This is restraint work only. No features added, no patterns invented, no scope expansion.
