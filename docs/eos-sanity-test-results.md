# EOS Sanity Test Results - 12 Common Queries

**Date**: 2026-02-14  
**Test Scope**: Common user search intents  
**Threshold**: If >25-35% return 0-1 results, adjustment needed

## Test Results

| Query | Count | First 3 Results | Relevant? | Status |
|-------|-------|----------------|-----------|--------|
| **restaurant** | 11 | Otomisan, Yang Chow, DAMA | ✅ Yes | ✅ PASS |
| **dinner** | 0 | - | ❌ No | ⚠️ FAIL |
| **tacos** | 1 | Leo's Tacos Truck | ✅ Yes | ⚠️ MARGINAL |
| **pizza** | 1 | Pizzana | ✅ Yes | ⚠️ MARGINAL |
| **sushi** | 2 | Sushi Tama, Sushi Takeda | ✅ Yes | ✅ PASS |
| **burgers** | 0 | - | ❌ No | ⚠️ FAIL |
| **coffee** | 4 | El Tepeyac Cafe, Ramona Room, Picaresca | ✅ Yes | ✅ PASS |
| **bakery** | 1 | Clark Street Bakery | ✅ Yes | ⚠️ MARGINAL |
| **bar** | 12 | Manuela, Baroo, Homage Brewing | ✅ Yes | ✅ PASS |
| **thai** | 0 | - | ❌ No | ⚠️ FAIL |
| **korean** | 0 | - | ❌ No | ⚠️ FAIL |
| **italian** | 0 | - | ❌ No | ⚠️ FAIL |

## Summary Statistics

- **Total Queries**: 12
- **Zero Results**: 5 (42%) - **⚠️ ABOVE THRESHOLD**
- **1 Result**: 3 (25%)
- **0-1 Results Combined**: 8/12 (67%) - **⚠️ SIGNIFICANTLY ABOVE 25-35% THRESHOLD**
- **2+ Results**: 4 (33%)

### Pass/Fail Breakdown
- ✅ **PASS** (≥2 results): 4/12 (33%)
- ⚠️ **MARGINAL** (1 result): 3/12 (25%)
- ⚠️ **FAIL** (0 results): 5/12 (42%)

## Analysis

### 🚨 Critical Issues

1. **Zero-result queries (42%)**:
   - `dinner` - Generic intent, no matches (likely field name issue)
   - `burgers` - Common food type, no ranked burger places
   - `thai` - Major cuisine type, no ranked Thai places
   - `korean` - Major cuisine type, no ranked Korean places
   - `italian` - Major cuisine type, no ranked Italian places

2. **Single-result queries (25%)**:
   - `tacos` - Only Leo's Tacos Truck
   - `pizza` - Only Pizzana
   - `bakery` - Only Clark Street Bakery

### Root Causes

#### 1. **Cuisine Type Field Not Populated**
The search queries `thai`, `korean`, `italian` return 0 results because:
- Search looks in `cuisineType` field
- Most places likely have `cuisineType: null` (as seen in pizza places)
- Even ranked places don't have cuisine metadata

#### 2. **Generic Intent Terms**
- `dinner` returns 0 because it's not a place name, neighborhood, category, or cuisine type
- Need to map generic intents to categories or show "dinner-appropriate" places

#### 3. **Coverage Gaps**
- `burgers` - No ranked burger places (none meet ≥2 sources threshold)
- Only 108/434 places are ranked (25%), so many common cuisines excluded

## Recommendations

### Option 1: Expand Search Fields (Non-Algorithmic)
Add search against additional metadata:
- `vibeTags` - Already in query, but may need population
- `category` - Already in query (eat, drink, etc.)
- Add generic intent mapping: `dinner` → category: `eat`

### Option 2: Populate Missing Metadata
- Backfill `cuisineType` for all ranked places
- Ensure Italian/Thai/Korean places have proper cuisine tags
- This is editorial work, not algorithmic

### Option 3: Adjust Inclusion Threshold (Carefully)
- Current: ≥2 sources OR chef rec OR Gold mention
- Could consider: ≥1 source + quality signals
- **Risk**: May dilute editorial quality standards

### Option 4: Add Category Fallback
When query matches cuisine but no results:
- Search category: "eat" with broader match
- Still ranked-only, just wider net

## Immediate Action Items

1. **Investigate `cuisineType` population**:
   - Check how many of 108 ranked places have null cuisineType
   - Identify data source for cuisine metadata
   
2. **Add generic intent mapping**:
   - Map `dinner` → category: `eat`
   - Map `lunch` → category: `eat`
   - Map `drinks` → category: `drink`

3. **Consider vibeTags enrichment**:
   - Add `burger`, `thai-food`, `korean-food`, etc. as vibeTags
   - Editorial task, not algorithmic

## Decision Point

**Current State**: 67% of common queries return 0-1 results  
**Threshold**: 25-35% acceptable  
**Verdict**: ⚠️ **ADJUSTMENT NEEDED**

The system is working as designed (ranked-only), but common user intents are dead-ending too frequently. We need non-algorithmic adjustments to improve coverage without compromising editorial quality.
