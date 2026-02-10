# Migration Guide: Places → Golden Records

## Overview

This guide explains how to migrate the merchant page from querying the old `places` table to the new `golden_records` table powered by entity resolution.

## Migration Strategy

We'll use a **gradual rollout** approach with a feature flag to minimize risk:

### Phase 1: Parallel Operation (Safe)
- Keep existing `places` table queries working
- Add new `golden_records` queries behind feature flag
- Test in development/staging

### Phase 2: Gradual Rollout
- Enable for internal testing (10% of traffic)
- Monitor error rates and data quality
- Expand to 50%, then 100%

### Phase 3: Full Migration
- All traffic uses `golden_records`
- Archive `places` table (don't delete yet)

## Implementation

### Step 1: Create API Wrapper (Dual-Query Support)

Create a new API utility that can query either table:

```typescript
// lib/place-api.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type PlaceSource = 'legacy' | 'golden';

export async function getPlaceBySlug(slug: string, source: PlaceSource = 'legacy') {
  if (source === 'golden') {
    // Query golden_records
    const golden = await prisma.golden_records.findUnique({
      where: { slug },
    });
    
    if (!golden) return null;
    
    // Transform golden record to match legacy Place shape
    return {
      id: golden.canonical_id,
      slug: golden.slug,
      name: golden.name,
      address: golden.address_street,
      latitude: golden.lat,
      longitude: golden.lng,
      phone: golden.phone,
      website: golden.website,
      instagram: golden.instagram_handle,
      hours: golden.hours_json,
      description: golden.description,
      googlePhotos: null, // TODO: Migrate photo handling
      googleTypes: [],
      priceLevel: golden.price_level,
      neighborhood: golden.neighborhood,
      category: golden.category,
      vibeTags: golden.vibe_tags,
      pullQuote: golden.pull_quote,
      pullQuoteSource: golden.pull_quote_source,
      pullQuoteUrl: golden.pull_quote_url,
      // Meta fields
      dataCompleteness: golden.data_completeness,
      sourceCount: golden.source_count,
      sourceAttribution: golden.source_attribution,
    };
  } else {
    // Query legacy places table
    return await prisma.place.findUnique({
      where: { slug },
    });
  }
}
```

### Step 2: Add Feature Flag

```typescript
// lib/feature-flags.ts

export function shouldUseGoldenRecords(userId?: string): boolean {
  // For now, only enable in development
  if (process.env.NODE_ENV === 'development') {
    return process.env.USE_GOLDEN_RECORDS === 'true';
  }
  
  // TODO: Add percentage-based rollout
  // const rolloutPercent = parseFloat(process.env.GOLDEN_RECORDS_ROLLOUT || '0');
  // return Math.random() * 100 < rolloutPercent;
  
  return false;
}
```

### Step 3: Update Merchant Page API Route

```typescript
// app/api/places/[slug]/route.ts

import { getPlaceBySlug } from '@/lib/place-api';
import { shouldUseGoldenRecords } from '@/lib/feature-flags';

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const source = shouldUseGoldenRecords() ? 'golden' : 'legacy';
    const place = await getPlaceBySlug(params.slug, source);
    
    if (!place) {
      return NextResponse.json({ error: 'Place not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      ...place,
      // Add metadata about which source was used
      __meta: { source },
    });
  } catch (error) {
    console.error('Error fetching place:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### Step 4: Testing Checklist

Before enabling golden_records in production:

- [ ] Run `npm run export:resolver` to seed all existing places
- [ ] Verify all golden_records have valid slugs
- [ ] Test merchant page with `USE_GOLDEN_RECORDS=true`
- [ ] Compare data quality (completeness, accuracy)
- [ ] Test edge cases:
  - [ ] Places with multiple sources
  - [ ] Places with missing data
  - [ ] Places with conflicting data
  - [ ] Newly ingested places (from CSV)

### Step 5: Gradual Rollout

```typescript
// lib/feature-flags.ts - Updated

export function shouldUseGoldenRecords(userId?: string): boolean {
  // Internal testing (always enabled for admins)
  if (userId && isAdmin(userId)) {
    return true;
  }
  
  // Percentage-based rollout
  const rolloutPercent = parseFloat(process.env.GOLDEN_RECORDS_ROLLOUT || '0');
  
  // Use consistent hashing for same user
  if (userId) {
    const hash = hashCode(userId);
    return (hash % 100) < rolloutPercent;
  }
  
  // Random rollout for anonymous users
  return Math.random() * 100 < rolloutPercent;
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}
```

Rollout schedule:
1. Week 1: 0% (development only)
2. Week 2: 10% (internal testing)
3. Week 3: 50% (if no issues)
4. Week 4: 100% (full migration)

## Data Quality Monitoring

Track these metrics during rollout:

```typescript
// lib/monitoring.ts

export async function logDataQuality(placeId: string, source: PlaceSource) {
  const metrics = {
    source,
    timestamp: new Date(),
    placeId,
    // Track which fields are populated
    hasPhone: !!place.phone,
    hasWebsite: !!place.website,
    hasInstagram: !!place.instagram,
    hasHours: !!place.hours,
    hasDescription: !!place.description,
    // Track data completeness
    completeness: place.dataCompleteness,
    sourceCount: place.sourceCount,
  };
  
  // Send to analytics
  console.log('[DATA_QUALITY]', JSON.stringify(metrics));
}
```

Compare metrics:
- **Completeness**: Is data more complete in golden_records?
- **Error rate**: Are there more 404s or 500s?
- **Load time**: Is performance acceptable?
- **User reports**: Are users reporting issues?

## Rollback Plan

If issues arise during rollout:

1. **Immediate rollback**: Set `GOLDEN_RECORDS_ROLLOUT=0`
2. **Fix issues**: Debug using logs and error reports
3. **Re-test**: Verify fix in development
4. **Gradual re-rollout**: Start at 10% again

## Post-Migration

Once 100% traffic is on golden_records:

### 1. Archive Legacy Table
```sql
-- Rename for safety
ALTER TABLE places RENAME TO places_archived_20260209;

-- Add archived timestamp
ALTER TABLE places_archived_20260209 ADD COLUMN archived_at TIMESTAMP DEFAULT NOW();
```

### 2. Update All Queries
Search codebase for `prisma.place.` and update to `prisma.golden_records.`

### 3. Clean Up Feature Flags
Remove `shouldUseGoldenRecords()` checks once migration is complete.

## Common Issues

### Issue: Slug collisions after migration
**Cause:** Two places might have same slug (e.g., "taco-zone-downtown")  
**Fix:** System auto-increments slugs. Verify redirects work.

### Issue: Missing photos in golden_records
**Cause:** Photo handling not migrated yet  
**Fix:** Keep querying `places` table for photos during transition, or migrate googlePhotos to raw_json.

### Issue: Broken URLs (404s)
**Cause:** Slug changed during export  
**Fix:** Create slug redirect table:
```sql
CREATE TABLE slug_redirects (
  old_slug VARCHAR(255) PRIMARY KEY,
  new_slug VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Environment Variables

```env
# .env.local

# Enable golden records (boolean)
USE_GOLDEN_RECORDS=false

# Rollout percentage (0-100)
GOLDEN_RECORDS_ROLLOUT=0

# Monitoring
LOG_DATA_QUALITY=true
```

## Success Criteria

Migration is successful when:

- ✅ 100% of traffic on golden_records
- ✅ 0% increase in error rate vs. baseline
- ✅ Data completeness improved (or maintained)
- ✅ No user-reported issues for 2 weeks
- ✅ Legacy `places` table archived
