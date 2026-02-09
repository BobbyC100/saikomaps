# Merchant Data Audit Results

**Date:** February 9, 2026  
**Status:** COMPLETE

---

## Executive Summary

**The Good News:** We have **extensive editorial content** from high-quality sources (Infatuation, Resy, Time Out, Eater).

**The Problem:** This content is stored as raw text in the `sources[]` JSON array, but **not extracted into dedicated UI fields** like `pullQuote`.

**Result:** UI components can't easily display this content because it requires parsing JSON and extracting quotes.

---

## Schema Analysis

### Place Model Has These Fields:

**✅ Google Places Data (All Populated)**
- `googlePlaceId` ✅
- `name`, `address`, `latitude`, `longitude` ✅
- `phone`, `website` ✅
- `hours` (JSON) ✅
- `googlePhotos` (JSON array) ✅

**⚠️ Editorial Content Fields (Empty)**
- `pullQuote` ❌ NULL on ALL test places
- `pullQuoteSource` ❌ NULL
- `pullQuoteAuthor` ❌ NULL
- `pullQuoteUrl` ❌ NULL

**📦 Editorial Content (Stored in JSON)**
- `sources` ✅ Rich editorial content from multiple publications
  - But stored as JSON blob, not structured fields

**❌ Empty/Unpopulated Fields**
- `vibeTags` - Empty array `[]`
- `instagram` - NULL (except Seco, which we just fixed)
- `priceLevel` - NULL (except Pizzeria Mozza)
- `restaurantGroupId` - NULL
- `reservationUrl` - NULL

**📝 Curator Notes**
- NOT on Place model
- Located in `mapPlaces.descriptor` (join table)
- Only populated when a place is added to a map

---

## Data Matrix

| Place | Google Data | Photos | Sources | pullQuote | Instagram | vibeTags | Curator Note |
|-------|-------------|--------|---------|-----------|-----------|----------|--------------|
| Seco | ✅ | 10 | 4 (rich) | ❌ | ✅ | ❌ | ✅ (in mapPlaces) |
| Stir Crazy | ✅ | 10 | 3 (rich) | ❌ | ❌ | ❌ | ❌ |
| Pizzeria Mozza | ✅ | 10 | 1 (thin) | ❌ | ❌ | ❌ | ❌ |
| Great White | ✅ | 10 | 1 (thin) | ❌ | ❌ | ❌ | ❌ |

---

## What's IN the Sources Array

### Example: Stir Crazy
```json
{
  "source_id": "src_the_infatuation_2024",
  "publication": "The Infatuation",
  "trust_level": "editorial",
  "title": "Stir Crazy - Review - Hollywood - Los Angeles",
  "content": "Funky natural wine, snacky finger food, and a crowd of assistant art directors who just got back from their first Frieze exhibit... [FULL 800+ word review]",
  "url": "https://www.theinfatuation.com/los-angeles/reviews/stir-crazy",
  "published_at": "2024-03-14"
}
```

**This is EXCELLENT content** - but it's trapped in a JSON blob.

**The Coverage Card can't use it** because:
1. `pullQuote` is NULL
2. `sources[].content` is the full article (hundreds of words)
3. `sources[].excerpt` doesn't exist or is metadata

---

## The Curator Note Mystery

Curator notes are stored in **`mapPlaces.descriptor`**, not on the Place model.

**Seco Example:**
```
Map: "Silver Lake Natural Wine" (PUBLISHED)
Descriptor: "The best natural wine list on the eastside. Unpretentious and always interesting."
```

This is a **120-character editorial note** added when the place was added to that specific map.

**This explains:**
- Why curator notes only appear for some places (only if added to a map)
- Why the same place can have different notes on different maps
- Why the API needs to query `mapPlaces[]` to find curator notes

---

## Voice Engine / SaikoAI Status

### Schema Shows These Fields Were Designed:

**Tagline Generation (v1.1)**
- `tagline` ❌ NULL
- `taglineCandidates` - Empty array
- `taglinePattern` ❌ NULL
- `taglineGenerated` ❌ NULL

**Pull Quote Extraction (v1.1)**
- `pullQuote` ❌ NULL
- `pullQuoteSource` ❌ NULL

**Vibe Tags**
- `vibeTags` - Empty array `[]`

**Ad Unit System**
- `adUnitType` ❌ NULL
- `adUnitOverride` - false

**Status:** These fields exist but are **not populated**. Either:
1. Voice Engine was never run
2. Voice Engine output was never written to database
3. Voice Engine exists but needs to be triggered

---

## Coverage Card: Why It's Breaking

### Current Logic:
1. Check for `pullQuote` ❌ NULL
2. Fallback to `sources[0].excerpt` ⚠️ "Michelin Guide (Los Angeles and surroundings)" (metadata)
3. If both fail, show label only → **Empty card bug**

### What We Actually Have:
```javascript
sources: [
  {
    publication: "The Infatuation",
    content: "[FULL 800-WORD REVIEW]", // ← THIS IS WHAT WE HAVE
    excerpt: undefined // ← THIS IS WHAT WE NEED
  }
]
```

### Solutions:

**Option A: Extract Quotes from sources[].content**
Use first 150 chars of review text as a pseudo-excerpt.

**Option B: Run Quote Extraction**
Process `sources[].content` → extract best quote → save to `pullQuote`.

**Option C: Manual Entry**
Someone picks best quotes and adds them to `pullQuote` field.

---

## Instagram: Data Entry Issue

**Current State:**
- Most places: `instagram: NULL`
- Seco: Had Instagram URL in `website` field (now fixed)

**Root Cause:** Google Places API doesn't provide Instagram handles.

**Solution:** Need a backfill script or manual entry.

**Fallback:** Our code already extracts Instagram from `website` field if needed.

---

## Recommendations

### Immediate (UI Fixes)
1. ✅ Coverage Card - Extract first 150 chars from `sources[0].content` if no pullQuote
2. ✅ Gallery/Curator - Already handled graceful degradation
3. ✅ Instagram - Already have fallback to extract from website

### Short-term (Data)
1. **Quote Extraction Script**
   - Parse `sources[].content`
   - Extract 1-2 sentence quotes
   - Write to `pullQuote` + `pullQuoteSource`

2. **Instagram Backfill**
   - Manual entry or web scraping
   - Populate `instagram` field

3. **Price Level**
   - Google Places API has this (`priceLevel`)
   - Run backfill to populate

### Medium-term (Voice Engine)
1. **Activate Tagline Generation**
   - Use `sources[].content` as input
   - Generate taglines following pattern types
   - Write to `tagline` field

2. **Vibe Tags**
   - Parse reviews for atmosphere descriptors
   - Generate `vibeTags` array

3. **Restaurant Groups**
   - Identify which places belong to groups (e.g., Mozza group)
   - Populate `restaurantGroupId`

---

## Bottom Line

**We have the data** - it's just not in the right format for the UI to use.

**Coverage Card Example:**
- What we have: 800-word Infatuation review in `sources[0].content`
- What UI needs: 150-char quote in `pullQuote`
- **Gap:** Need extraction/transformation step

**Next Steps:**
1. Update Coverage Card to read from `sources[0].content` (temporary fix)
2. Build quote extraction pipeline (permanent fix)
3. Backfill Instagram handles
4. Activate Voice Engine for taglines/vibe tags
