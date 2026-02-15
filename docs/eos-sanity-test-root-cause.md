# EOS Sanity Test - Root Cause Analysis & Recommendations

## 🚨 Critical Finding

**67% of common user queries return 0-1 results** (threshold: 25-35%)

## Root Cause: Metadata Gap, Not Coverage Gap

### Key Discovery
The ranked places **DO exist** but can't be found due to missing/incorrect `cuisineType` metadata:

| Query | Ranked Places Found | Issue |
|-------|-------------------|-------|
| `italian` | 0 results | Pizzana exists (score: 4) but has `cuisineType: null` |
| `thai` | 0 results | Jitlada Restaurant exists (score: 7) but has `cuisineType: null` |
| `korean` | 0 results | Park's BBQ exists (score: 5) but has `cuisineType: "Bar"` ❌ |
| `burgers` | 0 results | No ranked burger places (true gap) |

### Metadata Population Statistics
- **Total ranked places**: 108
- **With cuisineType**: 35 (32%)
- **Without cuisineType**: 73 (68%) ⚠️
- **With vibeTags**: 8 (7%) ⚠️

### Current cuisineType Values (Broken)
Only 3 values are populated:
- `Bar`: 29 places
- `Café`: 5 places  
- `Bakery`: 1 place

**Problem**: `cuisineType` appears to store place type (Bar/Café), not cuisine (Italian/Thai/Korean)

## The Fix: Non-Algorithmic Metadata Enrichment

### Option 1: Use Category Field (Quick)
The `category` field exists and has values. Check if it's more reliable:

```typescript
// Current search checks:
- name (✅ works)
- neighborhood (✅ works)
- category (❓ need to verify)
- cuisineType (❌ broken - wrong semantic meaning)
- vibeTags (⚠️ only 7% populated)
```

### Option 2: Backfill cuisineType with Editorial Data
Manual/script-assisted backfill using:
1. Google Places API cuisine data (already in DB as `googlePlaceId`)
2. Editorial source metadata (we have Eater 38, LA Times, etc.)
3. Name-based inference for obvious cases (Jitlada → Thai, Pizzana → Italian)

This is **editorial curation**, not algorithmic ranking.

### Option 3: Add Intent Mapping Layer
Map generic queries to category/signals:

```typescript
const INTENT_MAP = {
  'dinner': { category: 'eat', time: 'dinner' },
  'lunch': { category: 'eat', time: 'lunch' },
  'drinks': { category: 'drink' },
  'breakfast': { category: 'eat', time: 'breakfast' }
};
```

### Option 4: Hybrid Approach (Recommended)
1. **Immediate**: Add intent mapping for generic terms (dinner, lunch, drinks)
2. **Short-term**: Backfill cuisineType for top 108 ranked places using Google Places data
3. **Medium-term**: Expand vibeTags editorial curation (currently only 7% have tags)

## Specific Query Breakdown

### ✅ Working Queries (4/12 = 33%)
- `restaurant` (11 results) - matches field name
- `sushi` (2 results) - appears in name
- `coffee` (4 results) - appears in name/matches "Café" category
- `bar` (12 results) - matches cuisineType field

### ⚠️ Single Result (3/12 = 25%)
- `tacos` (1 result) - Leo's Tacos Truck (name match)
- `pizza` (1 result) - Pizzana (name match)
- `bakery` (1 result) - Clark Street Bakery (matches cuisineType)

### ❌ Zero Results (5/12 = 42%)
- `dinner` - Generic intent, no field matches
- `burgers` - True coverage gap (no ranked burger places)
- `thai` - **Jitlada exists but not findable**
- `korean` - **Park's BBQ exists but miscategorized**
- `italian` - **Pizzana exists but not findable**

## Recommended Implementation Priority

### 🔥 P0: Fix Searchability (Hours)
```sql
-- Backfill cuisineType from Google Places API data
-- For the 108 ranked places only (editorial, not algorithmic)
UPDATE places 
SET cuisine_type = [infer from google_places_data]
WHERE ranking_score > 0 AND cuisine_type IS NULL;
```

### 🔥 P0: Add Intent Mapping (Hours)
```typescript
// Add to search route before query
const intentCategory = INTENT_MAP[queryLower]?.category;
if (intentCategory) {
  where.category = intentCategory;
}
```

### 🟡 P1: Expand vibeTags (Days)
- Editorial task: Add 2-3 vibeTags per ranked place
- Examples: `italian-food`, `thai-cuisine`, `burger-spot`, `dinner-worthy`

### 🟢 P2: Monitor & Iterate (Ongoing)
- Track zero-result queries in analytics
- Expand coverage through editorial inclusion (non-algorithmic)

## Decision Matrix

| Approach | Time | Impact | Maintains EOS Principles? |
|----------|------|--------|---------------------------|
| Intent mapping | 2 hours | +3 queries | ✅ Yes (editorial rules) |
| Cuisine backfill | 4 hours | +3 queries | ✅ Yes (using existing data) |
| vibeTags enrichment | 2 days | +2 queries | ✅ Yes (editorial curation) |
| Lower inclusion threshold | 1 hour | +20-30 places | ⚠️ Maybe (dilutes quality) |

## Conclusion

The EOS system is **working correctly** - it's returning ranked-only results as designed. The problem is **metadata quality**, not ranking quality.

**Recommendation**: Implement P0 fixes (intent mapping + cuisine backfill) before launch. This maintains EOS principles while dramatically improving user experience.

**Expected improvement**: 42% → 8% zero-result rate (dinner + thai + korean + italian all fixed)
