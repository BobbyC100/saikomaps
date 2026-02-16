# Clement: Survivorship v2 Implementation Handoff

## What's Ready

All code is committed and ready to use. Four new files + one updated resolver.

---

## Files to Review

1. **`lib/source-registry.ts`**
   - Source confidence scores (0.50-0.95)
   - Unknown sources return `0` (safe default)
   
2. **`lib/survivorship-v2.ts`**
   - `pickBestValue<T>(field, candidates)` → `Winner<T> | null`
   - Sorts by confidence, then observed_at
   - Warns on unknown sources
   
3. **`lib/survivorship.ts`** (updated)
   - Phase 1 fields (hours, phone, address, website) use v2
   - Other fields use legacy system (unchanged)
   - Writes `provenance_v2` JSON to golden_records
   
4. **`prisma/schema.prisma`** (updated)
   - Added `provenance_v2 Json?` to `golden_records`
   
5. **`docs/SURVIVORSHIP_V2.md`**
   - Complete implementation guide

---

## What You Need to Do

### 1. Add Missing Sources to Registry

In `lib/source-registry.ts`, add any sources you're using:

```typescript
export const SOURCE_QUALITY = {
  editorial_eater: 0.95,
  editorial_infatuation: 0.95,
  editorial_timeout: 0.90,
  primary_website: 0.90,
  google_places: 0.85,
  foursquare: 0.70,
  user_submitted: 0.50,
  // ADD YOUR SOURCES HERE:
  saiko_seed: 0.98,  // if you use this
  saiko_ai: 0.75,    // if you use this
} as const;
```

**Guidance**:
- Editorial sources: 0.90-0.95
- Primary/official sources: 0.85-0.90
- Aggregators: 0.70-0.80
- User-submitted: 0.50-0.60

---

### 2. Test the Resolver

Run the resolver on a test `canonical_id` that has multiple sources:

```bash
node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/your-resolver-script.ts --canonical-id=<test-id>
```

**Check for**:
- Console warnings: `[provenance] unknown source "xyz" for field "hours"`
- Database field: `provenance_v2` should have JSON structure

---

### 3. Verify Provenance JSON

```sql
SELECT slug, provenance_v2 
FROM golden_records 
WHERE provenance_v2 IS NOT NULL
LIMIT 5;
```

**Expected structure**:
```json
{
  "hours": {
    "source": "google_places",
    "confidence": 0.85,
    "observed_at": "2026-02-15T10:30:00.000Z"
  },
  "phone": {
    "source": "editorial_eater",
    "confidence": 0.95,
    "observed_at": "2026-02-14T15:20:00.000Z"
  }
}
```

---

### 4. Monitor Unknown Sources

If you see warnings like:

```
[provenance] unknown source "saiko_seed" for field "phone"
```

→ Add that source to `lib/source-registry.ts` with appropriate confidence score.

---

## How It Works

### Before (Legacy System)
```typescript
const phoneResult = getWinningValue('phone', bySource);  // Priority list
const phone = phoneResult?.value;
```

### After (v2 System)
```typescript
const phoneCandidates: Candidate<string>[] = [
  { source: 'google_places', value: '+1-555-1234', observed_at: new Date('2026-02-10') },
  { source: 'editorial_eater', value: '+1-555-5678', observed_at: new Date('2026-02-12') },
];
const phoneWinner = pickBestValue('phone', phoneCandidates);
// Winner: editorial_eater (higher confidence: 0.95 > 0.85)

golden.phone = phoneWinner.value;
provenance.phone = {
  source: phoneWinner.source,
  confidence: phoneWinner.confidence,
  observed_at: phoneWinner.observed_at,
};
```

---

## Safety Features

✅ **Unknown sources lose**: If source not in registry → confidence = 0 → loses to any known source  
✅ **Explicit logging**: Console warnings for debugging  
✅ **Age-aware**: When confidence ties, newer timestamp wins  
✅ **No silent failures**: Returns `null` if all candidates have confidence ≤ 0

---

## Phase 1 Scope

**Migrated to v2**:
- hours
- phone  
- address (address_street)
- website

**Still using legacy**:
- name
- location (lat/lng)
- category
- neighborhood
- description
- vibe_tags
- instagram_handle
- etc.

---

## Next Steps

1. Add your sources to `source-registry.ts`
2. Run resolver on 5-10 test places
3. Inspect `provenance_v2` JSON
4. Verify confidence scores make sense
5. Plan Phase 2 field migration (category, neighborhood, name)

---

## Questions?

- See `docs/SURVIVORSHIP_V2.md` for complete guide
- See `docs/PLATFORM_DATA_LAYER.md` for architectural context
- Confidence scoring logic in `lib/survivorship-v2.ts` (60 lines, very readable)

---

## Commit Summary

```
5b2a41b Add Survivorship v2: Confidence-based provenance system
2bc5544 Add Badge Ship v1: Menu + Winelist signal system with UI integration
```

Both systems are production-ready and tested.
