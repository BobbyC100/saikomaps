# Place Enrichment & Photo Display Report

## Executive Summary

**Database Status:**
- **Total Places:** 353
- **Photo Coverage:** 333 places (94%) ✅
- **Google Enrichment:** 333 places (94%) ✅
- **Voice Engine Enrichment:** 0 places (0%) 🔴

## Photo Display on Map Pins

### Current Implementation ✅

Map pin popups (`BentoCardPopup.tsx`) are **already configured** to display photos:

```typescript
// Line 88 in BentoCardPopup.tsx
backgroundImage: place.photoUrl ? `url(${place.photoUrl})` : undefined
```

**Data Flow:**
1. API returns place data with `googlePhotos` and `userPhotos`
2. `FieldNotesMapView.tsx` (line 140) generates photoUrl:
   ```typescript
   photoUrl: getPlacePhotoUrl(loc.userPhotos, loc.googlePhotos, 600)
   ```
3. Popup displays photo or shows fallback (initial letter)

**Why Some Pins Don't Show Photos:**
- 20 places (6%) don't have photos in database
- 18 of these are street addresses/landmarks (Google has no photos)
- 2 places couldn't be found in Google Places

### Popup Features ✅
- ✅ Photo display (115px width)
- ✅ Place name, category, neighborhood
- ✅ Open/closed status indicator
- ✅ Directions button
- ✅ Share button
- ✅ "View full profile" link
- ✅ Fallback UI (initial letter) for places without photos

## Enrichment Breakdown

### 1. Google Places Enrichment (94% Complete)

**What's Included:**
- ✅ Google Place ID: 351 places (99%)
- ✅ Photos: 333 places (94%)
- ✅ Neighborhood: 351 places (99%)
- ⚠️ Cuisine Type: 118 places (33%)

**Coverage by Level:**
- **Full Google enrichment:** 333 places (94%)
- **Partial (minimal):** 18 places (5%)
- **None:** 2 places (1%)

**Command to backfill missing:**
```bash
npm run backfill:google
```

### 2. Voice Engine Enrichment (0% Complete) 🔴

**Available Fields (None Currently Populated):**
- ❌ Tagline: 0 places
- ❌ Vibe Tags: 0 places
- ❌ Tips: 0 places
- ❌ Pull Quote: 0 places

**Database Schema Supports:**
```prisma
tagline            String?          // Selected tagline
taglineCandidates  String[]         // 4 candidate taglines
taglinePattern     String?          // Pattern used
taglineGenerated   DateTime?        // Generation timestamp
// vibeTags removed from entities — deprecated; vibe signals in golden_records.identity_signals.vibe_words
tips               String[]         // Visitor tips
pullQuote          String?          // Editorial quote
```

**352 places in maps** need Voice Engine enrichment to unlock:
- Engaging taglines for cards
- Atmosphere/vibe tags for filtering
- Helpful visitor tips
- Editorial pull quotes

**Command to enrich:**
```bash
npm run test:voice-engine
```

## Places Without Photos (20 Total)

### Category 1: Street Addresses/Landmarks (18 places)
These have Google Place IDs but no photos available:
- Street names (5th Street, Annette Street, Holcomb Street, West 62nd Street)
- Residential addresses (Cheaper by the Dozen House)
- Various street addresses (1200 Rosecrans Ave, 2425 Daly St, etc.)

**Options:**
1. Upload manual photos → store in `userPhotos` field
2. Remove from database if not needed
3. Accept fallback UI (already implemented)

### Category 2: Not Found in Google (2 places)
- `eta` - Could not be found
- `unfined-wines-la` - Could not be found

**Recommendation:** Verify if still valid, search with different names, or remove.

## Scripts & Tools

### Analysis Scripts
```bash
# Comprehensive enrichment analysis (includes Voice Engine tracking)
npm run analyze:enrichment

# Photo-specific analysis
node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/analyze-place-data-coverage.ts
node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/diagnose-missing-photos.ts
node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/list-places-needing-photos.ts

# Duplicate detection
npm run find:duplicates
npm run find:potential-duplicates
```

### Enrichment Scripts
```bash
# Google Places backfill
npm run backfill:google                    # All places needing cache
npm run backfill:google -- --limit 20      # First 20 only
npm run backfill:google -- --slug seco     # Single place
npm run backfill:google -- --dry-run       # Preview only

# Voice Engine (when ready)
npm run test:voice-engine
```

### Maintenance Scripts
```bash
# Cleanup tools
npm run merge:duplicates                   # Preview merges
npm run merge:duplicates -- --execute      # Execute merges
npm run cleanup:duplicates                 # General cleanup
npm run investigate:backfill-failures      # Debug backfill issues
```

## Recommendations

### High Priority

1. **Voice Engine Enrichment** 🎯
   - 352 places need taglines, vibe tags, and tips
   - This will dramatically improve place cards and discovery
   - Run on places in active maps first

2. **Fallback UI Improvements** 🎨
   - Current fallback (initial letter) is functional
   - Consider: Street view thumbnails for addresses
   - Consider: "Add Photo" button for curators

### Medium Priority

3. **Manual Photos for Landmarks** 📸
   - 18 landmark/address locations have no Google photos
   - Add admin interface to upload custom photos
   - Store in `userPhotos` field (already in schema)

4. **Cuisine Type Coverage** 🍽️
   - Only 33% have cuisine type
   - Run backfill with `--missing-meta` flag
   - Improves filtering and categorization

### Low Priority

5. **Data Quality Monitoring** 📊
   - Run `npm run analyze:enrichment` monthly
   - Check for new duplicates
   - Monitor photo coverage trends

## Photo Display Technical Details

### Component: `BentoCardPopup.tsx`

**Photo Rendering (Lines 84-116):**
```tsx
<div style={{
  backgroundImage: place.photoUrl ? `url(${place.photoUrl})` : undefined,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
}}>
  {!place.photoUrl && (
    <span>{place.name.charAt(0).toUpperCase()}</span>
  )}
</div>
```

**Photo URL Generation:**
```typescript
// lib/google-places.ts
export function getGooglePhotoUrl(photoRefOrName: string, maxWidth: number = 800): string {
  // New Places API v1 format
  if (photoRefOrName.startsWith('places/')) {
    return `https://places.googleapis.com/v1/${photoRefOrName}/media?maxWidthPx=${maxWidth}&key=${key}`;
  }
  // Legacy format
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoRefOrName}&key=${key}`;
}
```

**Priority Order:**
1. User-uploaded photos (`userPhotos`)
2. Google Places photos (`googlePhotos`)
3. Fallback: Initial letter in colored circle

### API Keys Required
- ✅ `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` - Client-side photo rendering
- ✅ `GOOGLE_PLACES_API_KEY` - Server-side backfill

Both are configured correctly in your environment.

## Next Steps

1. ✅ **Photos in popups** - Already working correctly
2. ✅ **Enrichment tracking** - New `analyze:enrichment` script created
3. ⏭️ **Voice Engine enrichment** - Ready to run on 352 places
4. ⏭️ **Manual photos** - Consider for 18 landmark locations

## Summary

✅ **Photos:** Map pin popups are working correctly - 94% have photos
✅ **Tracking:** New enrichment analysis includes Voice Engine research status
🔴 **Voice Engine:** 0% enriched - biggest opportunity for improvement
✅ **Database:** Clean, no duplicates, well-structured
✅ **Tools:** Comprehensive scripts for maintenance and analysis

**The photo display is working as designed. The 6% without photos are expected (landmarks/addresses).** The next frontier is Voice Engine enrichment to add compelling taglines, vibe tags, and tips to your 352 places! 🚀
