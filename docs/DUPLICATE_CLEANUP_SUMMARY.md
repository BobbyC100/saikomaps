# Duplicate Places Cleanup Summary

## Overview
Analysis found 3 duplicate places that share Google Place IDs with existing places. These duplicates prevent photo enrichment and need to be merged.

## Duplicates Identified

### 1. Olivia Restaurant
- **Duplicate:** `olivia-restaurant` (no Google Place ID)
- **Keep:** `restaurant-olivia` (has Google Place ID: ChIJTasbtVrHwoAR4AXWcZFu1Kk)
- **Reason:** Same restaurant on Vermont Ave
- **Impact:** 1 map reference will be migrated

### 2. Tacos Estilo Tijuana  
- **Duplicate:** `tacos-estilo-tijuana` (no Google Place ID)
- **Keep:** `tacos-estilo-df` (has Google Place ID: ChIJNcYgxE_IwoARcVWaRuQeyq8)
- **Full name:** Tacos Los Poblanos #1 Estilo Tijuana
- **Impact:** 1 map reference will be migrated

### 3. Helen's Wines
- **Duplicate:** `helens-wines` (no Google Place ID)
- **Keep:** `helen-s-wines-fairfax` (has Google Place ID: ChIJ9bYXJDO5woAR5VKZxaRj5XE)
- **Location:** Fairfax location
- **Impact:** 2 map references will be migrated

## What the Merge Will Do

1. **Migrate map references** - All maps using duplicate places will be updated to use the canonical place
2. **Migrate bookmarks** - Any user bookmarks will be transferred
3. **Delete duplicates** - The duplicate place records will be removed
4. **Preserve data** - Canonical places already have photos and complete data

## Scripts Created

### Analysis Scripts
- `npm run find:duplicates` - Find places with duplicate Google Place IDs
- `npm run find:potential-duplicates` - Comprehensive duplicate detection (IDs, slugs, locations)
- `npm run investigate:backfill-failures` - Investigate why places failed during backfill

### Cleanup Scripts
- `npm run merge:duplicates` - Preview merge operations (dry run)
- `npm run merge:duplicates -- --execute` - Execute merge and cleanup
- `npm run cleanup:duplicates` - General duplicate cleanup (for future use)

## Photo Coverage Impact

**Current:**
- 333 places with photos (94%)
- 23 places missing photos

**After cleanup:**
- No change to photo count (duplicates had no photos anyway)
- Will prevent future unique constraint errors during backfill
- Cleaner database with no duplicate entries

## Recommendations

### 1. Execute the merge (Recommended)
```bash
npm run merge:duplicates -- --execute
```

This will safely merge the 3 duplicates into their canonical versions.

### 2. Remaining places without photos (18 places)
These are addresses/locations that Google doesn't have photos for:
- Street addresses (5th Street, Annette Street, etc.)
- Residential locations (Cheaper by the Dozen House)
- Various addresses without business listings

**Options:**
- Upload manual photos via admin interface
- Remove from database if not actual businesses
- Accept as locations without photos (use fallback UI)

### 3. Places without Google Place IDs (5 places)
After merge, only 2 will remain:
- `eta` - Could not be found in Google Places
- `unfined-wines-la` - Could not be found in Google Places

**Options:**
- Manually add Google Place IDs if found
- Remove if they're closed/invalid
- Keep without Google enrichment

## Next Steps

1. ✅ Run merge script to clean up duplicates
2. Consider fallback UI for places without photos
3. Review ETA and Unfined Wines LA - are they still valid?
