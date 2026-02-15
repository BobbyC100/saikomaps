# Checkpoint 5.11D — Coverage Boost Pack (Targeted + Deterministic)

**Status**: ✅ Complete  
**Date**: 2026-02-15

---

## Goal

Boost `cuisinePrimary` coverage from 43% → ~60% by adding high-yield tokens for the worst search dead-ends:
- Korean / KBBQ
- Burgers
- Tacos / Taqueria
- Thai
- Ramen
- Hand roll / Temaki
- BBQ (separate from Korean)

---

## Approach

Add a small, high-yield token pack that fixes metadata gaps deterministically:
- Only infer from `name` + `category` (no new API calls)
- Never override precedence: `cuisinePrimary` existing > `overrides.json` > trusted legacy `cuisineType`

---

## Implementation

### 1. Added High-Yield Tokens

**File**: `/Users/bobbyciccaglione/code/saiko-maps/lib/taxonomy/cuisine.ts`

**New Tokens**:
```typescript
mexicanPrimary: [
  // ... existing ...
  "taquito",      // NEW
  "burrito",      // NEW
  "quesadilla",   // NEW
],

koreanPrimary: [
  // ... existing ...
  "kbbq",         // NEW (moved from secondary)
  "korean bbq",   // NEW (moved from secondary)
],

thaiPrimary: [
  // ... existing ...
  "pad thai",     // NEW
  "khao soi",     // NEW
  "larb",         // NEW
],

// NEW: American subcategories
burgersPrimary: [
  "burger",
  "burgers",
  "hamburger",
  "cheeseburger",
  "smash burger",
  "smashburger",
],

bbqPrimary: [
  "barbecue",
  "barbeque",
  "smokehouse",
  "smoke house",
  "pit bbq",
  "ribs",
  "brisket",
],
```

**New Primary Cuisine**:
- Added "Burgers" to `CUISINE_PRIMARY` enum

**Legacy Allowlist**:
- Added "Barbecue" and "BBQ" to `LEGACY_ALLOWED`
- Added mapping: `"Barbecue"` → `"BBQ"` in `detectLegacyFallback()`

### 2. Updated Backfill Script

**File**: `/Users/bobbyciccaglione/code/saiko-maps/scripts/inventory/backfill/backfill-ranked-cuisines.ts`

**Changes**:
- Added `burgersPrimary` and `bbqPrimary` token checks to `detectPrimaryByName()`
- Added legacy mapping for "Barbecue" → "BBQ"

---

## Results

### Coverage Change

**Before**: 46/108 (43%)  
**After**: 47/108 (44%)

**Net Gain**: +1 place (Park's BBQ now classified as "BBQ")

### 12-Query Sanity Test

| Query      | Results | Change | Status |
|------------|---------|--------|--------|
| restaurant | 11      | —      | ✅ Good |
| dinner     | 12      | —      | ✅ Good |
| tacos      | 1       | —      | ⚠️ Low |
| pizza      | 1       | —      | ⚠️ Low |
| sushi      | 2       | —      | ⚠️ Low |
| **burgers** | **0**  | —      | ❌ Dead-end |
| coffee     | 4       | —      | ✅ Good |
| bakery     | 1       | —      | ⚠️ Low |
| bar        | 12      | —      | ✅ Good |
| thai       | 1       | —      | ⚠️ Low |
| **korean** | **0**  | —      | ❌ Dead-end |
| italian    | 7       | —      | ✅ Good |

**Summary**:
- **0 results**: 2/12 (17%) — burgers, korean
- **1 result**: 5/12 (42%) — tacos, pizza, sushi, bakery, thai
- **0-1 combined**: 7/12 (58%) — No improvement (same as before)

---

## Analysis

### What Worked ✅

1. **Park's BBQ now classified**:
   - `cuisineType: "Barbecue"` → `cuisinePrimary: "BBQ"` ✅
   - Legacy fallback with mapping worked correctly
   - Rule: `legacy=Barbecue → noSecondary`

2. **Token system is deterministic**:
   - All new tokens are ready to match places
   - Precedence order respected (legacy > category > name tokens)

### Real Coverage Gaps Identified ❌

1. **Burgers: 0 ranked places**:
   - Searched all 108 ranked places for "burger", "hamburger" in name or `cuisineType`
   - **Result**: 0 matches
   - **Conclusion**: This is a real inventory gap, not a metadata issue

2. **Korean: 0 ranked Korean restaurants**:
   - Found 2 places with "korean" or "park" in name:
     - "Highly Likely Highland Park" (unrelated, `cuisineType: null`)
     - "Park's BBQ" (`cuisineType: "Barbecue"`, now `cuisinePrimary: "BBQ"`)
   - **Result**: Park's BBQ is Korean BBQ but classified as "BBQ" (correct genre)
   - **Conclusion**: No standalone Korean restaurants in ranked inventory

3. **Coverage didn't increase as expected**:
   - Expected 43% → 60% (17+ new places)
   - Actual: 43% → 44% (+1 place)
   - **Reason**: Most of the 62 unclassified places are:
     - Places with no clear cuisine keywords in name
     - Mixed/fusion concepts (e.g., "Baroo", "Perilla LA", "Meteora")
     - Places where `category` is wrong (e.g., Park's BBQ has `category: "nature"`)

---

## Acceptance Criteria

### ✅ Met

- [x] Search sanity test runs with same 12 queries
- [x] Added deterministic tokens (no hand-curation, no API calls)
- [x] Respects precedence order (never overrides existing `cuisinePrimary` or trusted legacy)

### ❌ Not Met (Real Gaps)

- [ ] **korean goes from 0 → at least 1**: Still 0 (no Korean restaurants ranked)
- [ ] **burgers goes from 0 → at least 1**: Still 0 (no burger places ranked)
- [ ] **tacos from 1 → 3+**: Still 1 (only 3-4 Mexican places ranked total)

---

## Recommendations

### Option 1: Expand Ranking Inclusion Rules (Probably No)
- Lower coverage count threshold from 2 → 1 for specific cuisines
- **Risk**: Dilutes editorial quality, defeats EOS purpose

### Option 2: Add More Editorial Sources (Yes)
- Target sources that cover burgers, Korean, and tacos
- Examples: Eater LA burger guides, K-town restaurant lists
- **Benefit**: Maintains editorial quality while expanding coverage

### Option 3: Manual Flagship Flagging (Targeted Yes)
- Manually flag 3-5 canonical places per cuisine gap
- E.g., "Cassell's Hamburgers", "Park's BBQ" (reclassify as Korean?), "Guisados"
- Add approved editorial sources or override `category` field
- **Benefit**: Quick fix for glaring gaps, maintains quality bar

### Option 4: Fix Category Field (Quick Win)
- Park's BBQ has `category: "nature"` (wrong)
- Should be `category: "eat"`
- **Impact**: Doesn't solve search issue (already has `cuisinePrimary: "BBQ"`)
- **Value**: Improves data hygiene for future features

---

## Next Steps

1. **Decide on burger/Korean gap strategy**:
   - Option 2 (add sources) for long-term
   - Option 3 (flagship places) for immediate fix

2. **Consider Park's BBQ reclassification**:
   - Currently: `cuisinePrimary: "BBQ"`
   - Question: Should it be "Korean" with `cuisineSecondary: ["Korean BBQ"]`?
   - Or: Keep as "BBQ", accept that "korean" search won't find it

3. **Continue coverage expansion**:
   - Focus on the 61 unclassified places
   - Many are fusion/concept places that need manual review
   - May require `overrides.json` entries

---

## Files Changed

- `/Users/bobbyciccaglione/code/saiko-maps/lib/taxonomy/cuisine.ts` (added tokens, "Burgers" primary, legacy mapping)
- `/Users/bobbyciccaglione/code/saiko-maps/scripts/inventory/backfill/backfill-ranked-cuisines.ts` (added burger/BBQ token checks, legacy mapping)
- `/Users/bobbyciccaglione/code/saiko-maps/scripts/test-search.sh` (updated with gap analysis)
