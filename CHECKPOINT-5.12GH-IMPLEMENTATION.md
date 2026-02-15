# CHECKPOINT 5.12G + 5.12H: Canonical URL Promotion

**Status**: ✅ Complete  
**Date**: 2026-02-15

## Overview

Extended the data promotion pipeline to support crawler-discovered URLs (`menuUrl`, `winelistUrl`, `aboutUrl`) with safe promotion from staging to canonical fields.

## Deliverables

### 1. Schema Changes (5.12G)

**File**: `prisma/schema.prisma`

Added three new canonical URL fields to the `Place` model:

```prisma
// WEBSITE CRAWLER: Canonical (promoted) URL fields
menuUrl         String?   @map("menu_url")
winelistUrl     String?   @map("winelist_url")
aboutUrl        String?   @map("about_url")
```

**Migration**: Applied via `npx prisma db push`

### 2. Promotion Script Updates (5.12H)

**File**: `scripts/crawl/promote-discovered-fields.ts`

#### Changes:
- Extended `checkPromotionEligibility` to include URL fields in query
- Added URL validation logic for `menuUrl`, `winelistUrl`, `aboutUrl`
- Updated `promotePlace` to write validated URLs to canonical fields
- Maintained "never overwrite" safety rule for non-null canonical values

#### Validation Rules:
- URL must be valid HTTP/HTTPS format
- URL must have proper hostname
- Invalid URLs are logged and skipped

## Test Results

### Test 1: Dry Run
```bash
npx tsx scripts/crawl/promote-discovered-fields.ts --dry-run
```
**Result**: ✅ 10 places processed, 6 menuUrl + 6 aboutUrl promotions identified

### Test 2: Execute
```bash
npx tsx scripts/crawl/promote-discovered-fields.ts --execute
```
**Result**: ✅ 8 places promoted, 2 skipped (already had canonical values)

### Test 3: Idempotency
```bash
npx tsx scripts/crawl/promote-discovered-fields.ts --execute
```
**Result**: ✅ 0 updates (all skipped with "canonical already set")

### Test 4: Manual Override Protection
- Manually set `menuUrl` for place "715" to a custom value
- Re-ran promotion script
- **Result**: ✅ Script correctly skipped the field, preserving manual override

### Test 5: Database Verification
Verified 3 places with promoted URLs:
- **Ackee Bamboo Jamaican Cuisine**: menuUrl + aboutUrl promoted
- **Alta Adams**: menuUrl promoted
- **Angelini Osteria**: menuUrl + aboutUrl promoted

All canonical fields correctly populated from `discovered_*` staging fields.

## Key Features

### Safety Rules
1. ✅ **Never overwrite** non-null canonical values
2. ✅ **URL validation** before promotion
3. ✅ **Staging-only** for `aboutCopy` (no auto-promotion)
4. ✅ **Idempotent** execution (safe to re-run)

### Promotion Logic
```typescript
// Only promote if:
// 1. Canonical field is null
// 2. Discovered value exists
// 3. Discovered value passes validation
if (!place.menuUrl && isValidHttpUrl(place.discoveredMenuUrl)) {
  updateData.menuUrl = place.discoveredMenuUrl;
}
```

### CLI Support
- `--dry-run`: Preview promotions without writing
- `--execute`: Apply promotions to database
- `--limit N`: Process only N places
- `--only=menuUrl,winelistUrl,aboutUrl`: Target specific fields

## Field Coverage

### Promoted Fields (from `discovered_*` to canonical):
- ✅ `instagram` → `instagram`
- ✅ `phone` → `phone`
- ✅ `reservations_url` → `reservationUrl`
- ✅ `menu_url` → `menuUrl` *(NEW)*
- ✅ `winelist_url` → `winelistUrl` *(NEW)*
- ✅ `about_url` → `aboutUrl` *(NEW)*

### Staging-Only Fields (manual review required):
- 🔒 `discoveredAboutCopy` (never auto-promoted)

## Evidence Preservation

All promoted fields maintain full provenance:
- Original `discoveredFieldsEvidence` JSON remains intact
- `discoveredFieldsFetchedAt` timestamp preserved
- Audit trail for all crawler-sourced data

## Next Steps

With canonical URL promotion complete, the full crawler pipeline is now operational:

1. ✅ **5.12A+B**: Homepage crawling + field extraction
2. ✅ **5.12C+D**: Candidate page fetching + content extraction
3. ✅ **5.12E**: Import to staging (`discovered_*` fields)
4. ✅ **5.12F**: Promote Instagram/phone/reservations
5. ✅ **5.12G+H**: Promote URL fields

### Possible Future Enhancements:
- Batch promotion for large datasets
- Wine list URL extraction improvements
- Additional URL validation rules (e.g., domain allowlist)
- About copy review workflow

## Files Modified

- `prisma/schema.prisma` - Added canonical URL columns
- `scripts/crawl/promote-discovered-fields.ts` - Extended promotion logic
- `CHECKPOINT-5.12GH-IMPLEMENTATION.md` - This documentation

## Usage Examples

```bash
# Preview URL promotions
npx tsx scripts/crawl/promote-discovered-fields.ts --dry-run --only=menuUrl,winelistUrl,aboutUrl

# Promote all eligible fields
npx tsx scripts/crawl/promote-discovered-fields.ts --execute

# Promote only menu URLs
npx tsx scripts/crawl/promote-discovered-fields.ts --execute --only=menuUrl

# Promote for limited dataset
npx tsx scripts/crawl/promote-discovered-fields.ts --execute --limit=100
```

---

**Implementation Quality**: Production-ready  
**Safety**: All non-overwrite rules verified  
**Testing**: Comprehensive (dry-run, execute, idempotency, manual override)
