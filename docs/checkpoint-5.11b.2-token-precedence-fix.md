# Checkpoint 5.11B.2 — Token Backfill Precedence Fix

**Status**: ✅ Complete  
**Date**: 2026-02-14

---

## Goal

Fix the token-based cuisine backfill so it never overrides a trustworthy existing cuisine signal (e.g., Otomisan incorrectly becoming Thai).

---

## Problem

The original token backfill was treating tokens as the primary truth source, causing wrong classifications even when the DB already had a good legacy value in `cuisineType`.

**Examples observed (before fix)**:
- Otomisan Restaurant: `cuisineType = Japanese` but token inference yielded Thai
- El Tepeyac Cafe: Token inference yielded Coffee (format) instead of cuisine

---

## Principle

**Tokens are fallback. Legacy cuisine is higher confidence when it's within a trusted set.**

No manual overrides required for common cases. No per-place tuning.

---

## Implementation

### Changes Made

Updated `scripts/inventory/backfill/backfill-ranked-cuisines.ts` to implement strict precedence:

#### Precedence Order (Deterministic)

1. **Skip if `cuisinePrimary` already exists** → Do not propose changes
2. **Check for Manual Override** → If in `overrides.json`, use it
3. **Trusted Legacy Cuisine** → If `cuisineType` is in `LEGACY_ALLOWED` set, use it (HIGH confidence)
4. **Category-Based Formats** → Wine Bar, Cocktail Bar, Brewery, Coffee, Bakery (HIGH confidence)
5. **Name-Based Token Inference** → Use `TOKENS` patterns (MEDIUM confidence)
6. **No Inference** → Leave `cuisinePrimary` null

#### Trusted Legacy Cuisine Allowlist

Created `LEGACY_ALLOWED` set in `lib/taxonomy/cuisine.ts`:
- Japanese, Sushi
- Italian
- Mexican
- Chinese
- Thai
- Korean
- Vietnamese
- French
- American
- Mediterranean
- Middle Eastern
- Indian

(Excludes generic formats like "Bar", "Cafe", "Restaurant", "Brewery")

---

## Test Results

### Test 1: Otomisan Debug

```bash
npx tsx scripts/inventory/backfill/backfill-ranked-cuisines.ts --debug "Otomisan"
```

**Before Fix**:
- proposed_primary: "Thai" (incorrect)
- rule_hit: "nameToken=thai"

**After Fix**:
- proposed_primary: "Japanese" ✅
- rule_hit: "legacy=Japanese → noSecondary"
- confidence: "high"

### Test 2: Full Dry Run

```bash
npx tsx scripts/inventory/backfill/backfill-ranked-cuisines.ts
```

**Results**:
- Total ranked places: 108
- With primary: 46 (43%)
- No primary: 62 (57%)
- Overrides: 0

**Primary Distribution**:
- American: 7
- Italian: 7
- Japanese: 6 (includes Otomisan ✅)
- Cocktail Bar: 6
- Wine Bar: 5
- Coffee: 4
- Mexican: 4
- Chinese: 3
- Sushi: 2
- Thai: 1
- Vietnamese: 1

### Test 3: Execute

```bash
npx tsx scripts/inventory/backfill/backfill-ranked-cuisines.ts --execute
```

**Result**: ✅ Updated 46 places

### Test 4: Verification

```sql
SELECT name, cuisineType, cuisinePrimary FROM places WHERE name = 'Otomisan Restaurant';
```

**Result**:
- cuisineType: "Japanese"
- cuisinePrimary: "Japanese" ✅
- cuisineSecondary: []

---

## Acceptance Criteria

✅ **Must Fix**
- Otomisan → Japanese (from legacy cuisineType) ✅
- Otomisan → NOT Thai ✅

✅ **Must Not Break**
- Token-based inference still works for places with null/garbage cuisineType ✅
- DRY RUN output remains stable/deterministic ✅

---

## Debug Mode

The script now supports `--debug "Name"` to inspect specific place classification:

```bash
npx tsx scripts/inventory/backfill/backfill-ranked-cuisines.ts --debug "Otomisan"
```

**Output Format**:
```
🔍 DEBUG MODE - Found: Otomisan Restaurant
─────────────────────────────────────
Input:
  name: "Otomisan Restaurant"
  category: "eat"
  cuisineType (legacy): "Japanese"
  cuisinePrimary (existing): "null"

Proposal:
  proposed_primary: "Japanese"
  proposed_secondary: []
  rule_hit: "legacy=Japanese → noSecondary"
  confidence: "high"
─────────────────────────────────────
```

---

## Notes

- No manual `overrides.json` entries needed for this checkpoint
- Secondary cuisine work remains out-of-scope
- The fix eliminates most need for overrides by respecting trusted legacy data
- Category-based formats (Coffee, Wine Bar) still have correct precedence for non-food venues

---

## Next Steps

1. ✅ Token precedence fixed
2. Wire `cuisinePrimary` into search logic
3. Update EOS diversity filter to use `cuisinePrimary`
4. Add more specific name tokens or overrides for edge cases as needed
