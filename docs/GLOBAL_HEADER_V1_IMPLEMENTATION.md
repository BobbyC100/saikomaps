# Saiko Maps — Global Header V1 Implementation Summary

**Date:** February 10, 2026  
**Status:** ✅ Complete — Ready for Testing

---

## What Was Built

Implemented the Global Header + Persistent Search V1 according to the locked spec with the following features:

1. **Page-Specific Header Variants**
   - Homepage & Search: Full search bar visible
   - Map & Merchant Pages: Search icon that expands inline

2. **Form-Based Search (V1)**
   - Simple GET request to `/search?q=...`
   - No live dropdown suggestions
   - Press Enter to search

3. **Immersive Page Behavior**
   - Default: Logo + Search icon + Share icon
   - Expanded: Search bar takes center, Share icon remains accessible
   - Close with X button or Escape key

4. **Branding & CTA**
   - Logo always displays "Saiko Maps"
   - Logged out: "Create" + "Sign In"
   - Logged in: "Create" + Profile icon

5. **Share Functionality**
   - Native Web Share API on mobile
   - Clipboard copy fallback on desktop
   - Works on Map and Merchant pages

---

## Files Changed

### New Files Created

1. **`components/Search/SearchInput.tsx`**
   - Simple form-based search component
   - No live suggestions (V1 scope)
   - Supports expanded variant for immersive pages
   - Escape key to close

2. **`GLOBAL_HEADER_V1_SPEC.md`**
   - Complete specification document
   - Locked requirements and constraints
   - Implementation guidelines

### Modified Files

3. **`components/layouts/GlobalHeader.tsx`**
   - Complete rewrite for V1 spec
   - Three rendering modes:
     - Default: Full header with search bar (Homepage/Search)
     - Immersive collapsed: Logo + Search icon + Share icon
     - Immersive expanded: Centered search bar
   - Updated CTA copy to "Create" (not "Create Your Own")
   - Removed SearchBar/SearchOverlay dependencies
   - Added Share button integration

4. **`app/(viewer)/search/page.tsx`**
   - Added GlobalHeader at top of page
   - Search bar appears in both page and header

5. **`app/map/[slug]/page.tsx`**
   - Added `handleShare` function (Web Share API + clipboard fallback)
   - Passed `onShare` to MapHeader component

6. **`app/map/[slug]/components/MapHeader.tsx`**
   - Added `onShare` prop
   - Passed to GlobalHeader

7. **`app/(viewer)/place/[slug]/page.tsx`**
   - Added `handleShare` function
   - Passed `onShare` to all GlobalHeader instances (loading, error, main)

---

## Implementation Details

### Search Behavior

```typescript
// SearchInput.tsx - Form-based search
<form onSubmit={handleSubmit} role="search">
  <input 
    type="search" 
    name="q"
    placeholder="Search places..."
    aria-label="Search for places"
  />
</form>

// On submit:
window.location.href = `/search?q=${encodeURIComponent(query.trim())}`
```

### Header Visibility Logic

```typescript
// GlobalHeader.tsx
const showFullSearch = variant === 'default' || isSearchPage

// Immersive variant (Map/Merchant)
if (variant === 'immersive' && !isSearchExpanded) {
  // Show: Logo + Search icon + Share icon
}

if (variant === 'immersive' && isSearchExpanded) {
  // Show: Centered search bar + Share icon
  // Close via X button or Escape key
}

// Default variant (Homepage/Search)
// Show: Logo + Search bar + Actions (Create, Sign In/Profile)
```

### Share Functionality

```typescript
// Map & Merchant pages
const handleShare = () => {
  const url = window.location.href;
  const title = data?.title || data?.location?.name || 'Check out this place';
  
  // Try native Web Share API (mobile)
  if (navigator.share) {
    navigator.share({ title, url }).catch(() => {
      copyToClipboard(url);
    });
  } else {
    // Desktop fallback: clipboard
    copyToClipboard(url);
  }
};
```

---

## Design Constants

| Element | Value |
|---------|-------|
| Header height | 56px |
| Expanded search max-width | 720px |
| Search input border | `1px solid rgba(195, 176, 145, 0.3)` |
| Search input background | `#FFFDF7` |
| Search input height | 44px |
| Icon color | `#C3B091` |
| CTA color | `#E07A5F` |

---

## Accessibility

- ✅ Search input has `type="search"` and `name="q"`
- ✅ All interactive elements have `aria-label`
- ✅ Form has `role="search"`
- ✅ Keyboard navigation:
  - Enter submits search
  - Escape closes expanded search
- ✅ No autofocus (focus managed via JS on expand)

---

## Testing Checklist

### Homepage
- [ ] Full search bar visible
- [ ] Search bar navigates to `/search?q=...` on Enter
- [ ] "Create" CTA visible (logged out)
- [ ] "Sign In" visible (logged out)
- [ ] Logo links to homepage

### Search Results Page
- [ ] Full search bar visible in header
- [ ] Search bar prepopulated with query from URL
- [ ] Results display below header
- [ ] Searching from header updates results

### Map View
- [ ] Logo + Search icon + Share icon visible (collapsed)
- [ ] Click search icon expands search inline
- [ ] Share icon remains visible when expanded
- [ ] Escape key closes expanded search
- [ ] X button closes expanded search
- [ ] Searching navigates to `/search?q=...`
- [ ] Share button works (mobile: native share, desktop: clipboard)

### Merchant Page
- [ ] Same behavior as Map View
- [ ] Share button works

### Mobile (< 768px)
- [ ] All states render correctly on mobile
- [ ] Search expands properly on immersive pages
- [ ] Share icon tappable
- [ ] Native share sheet appears on mobile

### Desktop (≥ 768px)
- [ ] Search bar visible on Homepage/Search
- [ ] Create + Sign In/Profile links visible
- [ ] Expanded search doesn't overflow (max 720px)
- [ ] Share copies URL to clipboard

---

## V1 Constraints (What's NOT Included)

- ❌ No live search suggestions dropdown
- ❌ No "Related Maps" or recommendations
- ❌ No Explore page integration
- ❌ No Collections concept
- ❌ No search history/recent searches in header

These are explicitly V2+ features.

---

## Known Limitations

1. **Share feedback:** No toast notification when URL is copied (console log only). Can be added in V2.
2. **Mobile search on Homepage:** Search bar is hidden on mobile < 768px on homepage. User must use search icon or navigate to `/search`. This is intentional for V1 to keep mobile homepage clean.
3. **Keyboard shortcut:** No global keyboard shortcut (/ or Cmd+K) for search. Removed from V1 for simplicity.

---

## Next Steps

### For Clement/Dev Team:
1. Test all pages in browser (see checklist above)
2. Test on mobile device (iOS/Android) for share functionality
3. Verify responsive behavior at breakpoint (768px)
4. Optional: Add toast notification for "Link copied" feedback
5. Deploy to staging

### For V2 (Post-Launch):
- Live search suggestions dropdown
- Search history/recent searches
- Global keyboard shortcuts (/ or Cmd+K)
- Featured maps on homepage
- "Link copied" toast notification

---

## File Structure

```
components/
├── layouts/
│   └── GlobalHeader.tsx          ← Main header component (rewritten)
├── Search/
│   ├── SearchInput.tsx           ← New: Form-based search input
│   ├── SearchBar.tsx             ← Legacy: Not used in V1
│   ├── SearchOverlay.tsx         ← Legacy: Not used in V1
│   └── SearchDropdown.tsx        ← Legacy: Not used in V1
└── ui/
    └── SaikoLogo.tsx             ← Unchanged (already correct)

app/
├── (viewer)/
│   ├── search/
│   │   └── page.tsx              ← Updated: Added GlobalHeader
│   └── place/
│       └── [slug]/
│           └── page.tsx          ← Updated: Added share handler
└── map/
    └── [slug]/
        ├── page.tsx              ← Updated: Added share handler
        └── components/
            └── MapHeader.tsx     ← Updated: Pass onShare prop
```

---

## Summary

**V1 Global Header is complete and ready for testing.** All core requirements from the spec are implemented:

✅ Page-specific visibility rules (Homepage/Search vs. Map/Merchant)  
✅ Form-based search (GET to /search?q=...)  
✅ Expandable inline search for immersive pages  
✅ Share functionality (Web Share API + clipboard fallback)  
✅ Correct branding ("Saiko Maps")  
✅ Correct CTA copy ("Create")  
✅ Accessibility compliance  
✅ Responsive design (mobile + desktop)  
✅ No live suggestions (V1 scope)

---

**Date:** February 10, 2026  
**Implementation Status:** ✅ Complete
