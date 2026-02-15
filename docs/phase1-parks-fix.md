# Phase 1 Launch Fixes — Park's BBQ

**Status**: ✅ Complete  
**Date**: 2026-02-15

---

## Goal

Make "korean" search work for Phase 1 launch by fixing Park's BBQ classification and category.

---

## Changes

### 1. Fixed Park's BBQ Category

**Issue**: `category: "nature"` (incorrect)  
**Fix**: Updated to `category: "eat"`

**Script**:
```typescript
await db.places.updateMany({
  where: { name: { contains: "Park's BBQ" } },
  data: { category: "eat" }
});
```

### 2. Override Park's BBQ Cuisine Classification

**Issue**: Token system classified as "BBQ" (genre-correct but not cuisine-specific)  
**Fix**: Added manual override to classify as "Korean" with "Korean BBQ" secondary

**File**: `scripts/inventory/backfill/overrides.json`
```json
{
  "20957582-9310-437a-95d3-fd0d15a336b7": {
    "cuisinePrimary": "Korean",
    "cuisineSecondary": ["Korean BBQ"]
  }
}
```

### 3. Re-ran Backfill

Executed backfill with override:
```bash
npx tsx scripts/inventory/backfill/backfill-ranked-cuisines.ts --execute
```

**Result**:
- Park's BBQ: `cuisinePrimary: "Korean"`, `cuisineSecondary: ["Korean BBQ"]`
- Override precedence respected
- Coverage: 47/108 (44%)

---

## Verification

### Search Test

**Query**: `korean`
```bash
curl "http://localhost:3000/api/search?q=korean"
```

**Result**: ✅ 1 result (Park's BBQ)

**API Response**:
```json
{
  "name": "Park's BBQ",
  "cuisine": "Barbecue"  // Legacy cuisineType (client contract unchanged)
}
```

**Internal Data**:
- `cuisinePrimary`: "Korean" (used for search filtering)
- `cuisineSecondary`: ["Korean BBQ"] (not exposed yet)
- Search matches on `cuisinePrimary: "Korean"` ✅

### 12-Query Sanity Test

| Query      | Before | After | Status |
|------------|--------|-------|--------|
| restaurant | 11     | 11    | ✅ Good |
| dinner     | 12     | 12    | ✅ Good |
| tacos      | 1      | 1     | ⚠️ Low |
| pizza      | 1      | 1     | ⚠️ Low |
| sushi      | 2      | 2     | ⚠️ Low |
| burgers    | 0      | 0     | ❌ Gap |
| coffee     | 4      | 4     | ✅ Good |
| bakery     | 1      | 1     | ⚠️ Low |
| bar        | 12     | 12    | ✅ Good |
| thai       | 1      | 1     | ⚠️ Low |
| **korean** | **0**  | **1** | ✅ **FIXED** |
| italian    | 7      | 7     | ✅ Good |

**Updated Summary**:
- **0 results**: 1/12 (8%) — burgers only
- **1 result**: 6/12 (50%) — tacos, pizza, sushi, bakery, thai, korean
- **0-1 combined**: 7/12 (58%) — Same as before, but korean now works

**Progress**:
- ✅ **korean fixed**: 0 → 1 (via Park's BBQ override)
- ❌ **burgers unchanged**: 0 (real inventory gap)

---

## Rationale

### Why "Korean" instead of "BBQ"?

**Decision**: Cuisine > Genre for search discoverability

**Reasoning**:
1. **User intent**: When searching "korean", users expect Korean restaurants (including Korean BBQ)
2. **Genre specificity**: "BBQ" is too broad (American BBQ, Texas BBQ, Korean BBQ are different)
3. **Secondary tags**: "Korean BBQ" secondary provides genre detail without losing cuisine signal
4. **Precedent**: Sushi classified as cuisine (not "Raw Fish"), Pizza as cuisine (not "Flatbread")

**Trade-off accepted**:
- Searching "bbq" won't find Park's BBQ
- This is acceptable: Korean BBQ is a cuisine subset, not American BBQ
- Future: Could add "BBQ" to search synonyms or add bidirectional secondary tags

### Why Override instead of Token Rule?

**Decision**: Use `overrides.json` for edge cases

**Reasoning**:
1. **Token ambiguity**: "Park's BBQ" has "BBQ" in name → would match `bbqPrimary` tokens
2. **Name-based unreliable**: Can't tell Korean BBQ from American BBQ by name alone
3. **Precedence works**: Override > legacy > category > name tokens (correct order)
4. **Maintainable**: One-line override vs. complex heuristic rules

**Alternative considered**:
- Add "Park's" to `koreanPrimary` tokens → Too specific, not generalizable
- Check `cuisineType: "Barbecue"` + name contains "park" → Fragile, not deterministic

---

## Phase 1 Launch Status

### ✅ Launch-Safe

1. **korean search works**: 1 result (Park's BBQ)
2. **No breaking changes**: Client still receives legacy `cuisineType`
3. **Deterministic**: Override-based, no ML, no guessing
4. **Documented**: Override in `overrides.json` with clear rationale

### ⚠️ Known Limitations (Acceptable)

1. **Coverage**: 44% (47/108 places)
   - Accepted for Phase 1
   - Plan to expand via editorial sources (Phase 2)

2. **burgers**: 0 results
   - Real inventory gap (no ranked burger places)
   - Not a metadata issue
   - Plan to add burger editorial sources (Phase 2)

3. **0-1 combined**: 7/12 queries (58%)
   - Target: <10% (1-2 queries)
   - Current: Above target but improving
   - Expected to improve with coverage expansion

### 🎯 Acceptance Criteria (Met)

- [x] **korean query**: 0 → 1 result ✅
- [x] **Park's category fixed**: "nature" → "eat" ✅
- [x] **Park's cuisinePrimary**: "Korean" ✅
- [x] **No breaking changes**: API contract unchanged ✅
- [x] **Deterministic**: Override-based, documented ✅

---

## Next Steps (Phase 2)

1. **Expand burger coverage**:
   - Add editorial sources: Eater LA burger guides, Infatuation burgers
   - Flag 3-5 canonical places: Cassell's, Apple Pan, Father's Office

2. **Review 61 unclassified places**:
   - Many are fusion/concept (Baroo, Meteora, Perilla)
   - May need manual `overrides.json` entries
   - Target: 44% → 60% coverage

3. **Monitor search quality**:
   - Track which queries benefit from curated data
   - Identify next round of coverage gaps

---

## Files Changed

- `/Users/bobbyciccaglione/code/saiko-maps/scripts/inventory/backfill/overrides.json` (added Park's BBQ override)
- Database: `places.category` for Park's BBQ ("nature" → "eat")
- Database: `places.cuisinePrimary` for Park's BBQ (null → "Korean")
- Database: `places.cuisineSecondary` for Park's BBQ ([] → ["Korean BBQ"])
