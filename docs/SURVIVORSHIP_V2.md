# Survivorship v2: Confidence-Based Provenance System

**Status**: Ready for Implementation  
**Date**: 2026-02-15  
**Phase**: Phase 1 Fields Only (hours, phone, address, website)

---

## What Changed

### 1. Schema Addition
**File**: `prisma/schema.prisma`

Added to `golden_records` model:
```prisma
// Confidence-resolved provenance (v2)
provenance_v2 Json?
```

Migration created: `prisma/migrations/20260215200000_add_provenance_v2/`

---

### 2. Source Quality Registry
**File**: `lib/source-registry.ts`

Centralized source scoring with explicit confidence values:

```typescript
export const SOURCE_QUALITY = {
  editorial_eater: 0.95,
  editorial_infatuation: 0.95,
  editorial_timeout: 0.90,
  primary_website: 0.90,
  google_places: 0.85,
  foursquare: 0.70,
  user_submitted: 0.50,
} as const;
```

**Key Safety Feature**: Unknown sources return `0` confidence (automatic loss).

---

### 3. Survivorship v2 Logic
**File**: `lib/survivorship-v2.ts`

New `pickBestValue()` function that:
- Accepts array of candidates with `{source, value, observed_at}`
- Returns winner with `{value, source, confidence, observed_at, known_source}`
- Sorts by confidence first, then by observed_at (newer wins ties)
- Warns on unknown sources
- Returns `null` if top winner has confidence ≤ 0

---

### 4. Resolver Integration
**File**: `lib/survivorship.ts`

Phase 1 fields now use v2 system:

**Hours**:
```typescript
const hoursCandidates: Candidate<any>[] = [];
for (const [source, records] of Object.entries(bySource)) {
  for (const record of records) {
    const value = extractFieldFromRawJson(record.raw_json, 'hours');
    if (value) {
      hoursCandidates.push({
        source,
        value,
        observed_at: record.created_at,
      });
    }
  }
}
const hoursWinner = pickBestValue('hours', hoursCandidates);
if (hoursWinner) {
  golden.hours = hoursWinner.value;
  provenance.hours = {
    source: hoursWinner.source,
    confidence: hoursWinner.confidence,
    observed_at: hoursWinner.observed_at,
  };
}
```

Same pattern for: **phone**, **website**, **address**

Other fields still use legacy priority-based system.

---

## What's Stored in provenance_v2

Example JSON structure:

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
  },
  "website": {
    "source": "primary_website",
    "confidence": 0.90,
    "observed_at": "2026-02-13T08:10:00.000Z"
  },
  "address": {
    "source": "google_places",
    "confidence": 0.85,
    "observed_at": "2026-02-15T10:30:00.000Z"
  }
}
```

---

## Safety Features

1. **Unknown Source Protection**: Sources not in registry get confidence `0` and lose automatically
2. **Unknown Source Logging**: Console warnings for any unregistered source encountered
3. **Age Awareness**: When confidence ties, newer `observed_at` wins
4. **No Decay**: Static confidence scores (no time-based degradation)
5. **Explicit Nulls**: If all candidates have confidence ≤ 0, returns `null` (no silent defaults)

---

## Migration Path

### Current State
- Schema updated with `provenance_v2` field
- Migration file created
- Resolver updated for Phase 1 fields
- Prisma client regenerated

### When golden_records Table is Created
Migration will automatically apply `provenance_v2` column.

### Existing Data
- Old records will have `provenance_v2: null`
- Next resolution run will populate with confidence-based provenance
- `source_attribution` (legacy) remains unchanged for backward compatibility

---

## Future Phases

**Phase 2**: Extend to identity fields (category, neighborhood, name)  
**Phase 3**: Extend to editorial fields (description, vibe_tags)  
**Phase 4**: Deprecate `source_attribution` once all fields migrated

---

## Testing the System

### 1. Check Unknown Source Logging
```bash
# Run resolver on a place with known + unknown sources
# Should see: [provenance] unknown source "saiko_seed" for field "phone"
```

### 2. Verify Provenance JSON
```sql
SELECT slug, provenance_v2 
FROM golden_records 
WHERE provenance_v2 IS NOT NULL
LIMIT 5;
```

### 3. Confidence Validation
```typescript
// In any script:
import { getSourceQuality } from '@/lib/source-registry';
console.log(getSourceQuality('google_places')); // 0.85
console.log(getSourceQuality('unknown_source')); // 0
```

---

## Implementation Notes for Clement

- ✅ Phase 1 fields (hours, phone, address, website) fully implemented
- ✅ Unknown source protection active
- ✅ Tie-breaking by observed_at active
- ✅ Legacy fields unchanged (backward compatible)
- ✅ No migration required if golden_records doesn't exist yet
- ⚠️ Add more sources to `source-registry.ts` as needed (e.g., `saiko_seed`, `saiko_ai`)
- ⚠️ When adding new sources, choose confidence score between 0.50-0.95

---

## Next Steps

1. Add any missing sources to `lib/source-registry.ts`
2. Run resolver on test canonical_id
3. Inspect `provenance_v2` field in database
4. Verify confidence scores match expectations
5. Monitor console for unknown source warnings
6. Plan Phase 2 field migration
