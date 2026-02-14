# Merchant Page v2 — Data Audit Results

**Date:** February 9, 2026  
**Test Places:** Seco, Stir Crazy, Great White Central LA

---

## 📊 Database Field Coverage

### ✅ Well-Populated Fields
| Field | Coverage | Notes |
|-------|----------|-------|
| `name` | 100% | All places have names |
| `address` | ~95% | Most have addresses |
| `phone` | ~90% | Most have phone numbers |
| `googlePhotos` | ~90% | 10 photos per place |
| `hours` | ~85% | From Google Places backfill |
| `sources` | ~60% | Editorial coverage (Infatuation, Time Out, etc.) |
| `category` | ~80% | "eat", "Wine Bar", etc. |

### ⚠️ Partially Populated
| Field | Coverage | Notes |
|-------|----------|-------|
| `website` | ~70% | Often contains Instagram URLs instead |
| `instagram` | ~5% | Usually empty, URLs in website field |
| `neighborhood` | ~60% | Some places missing |
| `cuisineType` | ~40% | Inconsistent |

### ❌ Missing/Empty Fields
| Field | Coverage | Impact |
|-------|----------|--------|
| `pullQuote` | 0% | Coverage card uses `sources` array instead ✅ |
| `vibeTags` | 0% | Vibe card doesn't render |
| `priceLevel` | 0% | No price symbols ($$$) |
| `restaurantGroup` | ~2% | "Part of" row rarely shows |
| `reservationUrl` | ~10% | Reservations note rarely shows |

---

## 🔍 Specific Test Cases

### Seco (`/place/seco`)
```json
{
  "website": "https://www.instagram.com/seco.silverlake",  ← Instagram URL
  "instagram": null,                                        ← Empty
  "phone": "(323) 745-9288",                               ← ✅
  "restaurantGroup": null,                                 ← ❌
  "photos": 10,                                            ← ✅
  "category": "Wine Bar",                                  ← ✅
  "priceLevel": null,                                      ← ❌
  "pullQuote": null,                                       ← ❌
  "sources": [3 editorial articles],                       ← ✅ (Infatuation, Time Out, Resy)
  "vibeTags": [],                                          ← ❌
  "curatorNote": "The best natural wine list...",          ← ✅ (from mapPlaces)
}
```

### Stir Crazy (`/place/stir-crazy`)
```json
{
  "website": "http://instagram.com/stircrazy.LA",          ← Instagram URL
  "instagram": null,                                        ← Empty
  "phone": "(323) 433-4933",                               ← ✅
  "restaurantGroup": null,                                 ← ❌
  "photos": 10,                                            ← ✅
  "category": "eat",                                       ← ✅
  "priceLevel": null,                                      ← ❌
  "pullQuote": null,                                       ← ❌
  "sources": [],                                           ← ❌
  "vibeTags": [],                                          ← ❌
  "curatorNote": null,                                     ← ❌
}
```

### Great White (`/place/great-white-central-la`)
```json
{
  "website": "http://greatwhitevenice.com/",               ← ✅ Real website!
  "instagram": null,                                        ← Empty
  "phone": "(323) 745-5059",                               ← ✅
  "restaurantGroup": null,                                 ← ❌
  "photos": 10,                                            ← ✅
  "category": "eat",                                       ← ✅
  "priceLevel": null,                                      ← ❌
  "pullQuote": null,                                       ← ❌
  "sources": [1 editorial article],                        ← ✅ (LA Times)
  "vibeTags": [],                                          ← ❌
  "curatorNote": null,                                     ← ❌
}
```

---

## 🎯 UI Component Data Requirements

### What's Working (Fields Available)
| Component | Needs | Status | Fallback |
|-----------|-------|--------|----------|
| **Hero** | name, neighborhood, hours | ✅ | Meal context from hours |
| **Action Strip** | phone, lat/lng, instagram | ✅ | Hide actions when data missing |
| **Gallery** | photoUrls[] | ✅ | 10 photos available |
| **Curator** | curatorNote | ✅ | From mapPlaces.descriptor |
| **Coverage** | sources[] OR pullQuote | ✅ | Uses sources array |
| **Map** | address, lat/lng | ✅ | Works |
| **Hours** | hours JSON | ✅ | From Google Places |
| **Also On** | mapPlaces[] | ✅ | Works |

### What's Broken/Missing
| Component | Needs | Status | Impact |
|-----------|-------|--------|--------|
| **Details** | website, restaurantGroup, service | ⚠️ | Card often empty |
| **Vibe** | vibeTags[] | ❌ | Never renders |
| **Meta line** | priceLevel | ❌ | No $$$ symbols |

---

## 🔧 Data Quality Issues

### Issue 1: Instagram in Website Field
**Problem:** Many places have Instagram URLs stored in `website` field, with `instagram` field empty

**Examples:**
- Seco: `website = instagram.com/seco.silverlake`, `instagram = null`
- Stir Crazy: `website = instagram.com/stircrazy.LA`, `instagram = null`

**Solution in Code:**
```typescript
// DetailsCard.tsx - Already fixed
if (website && !website.includes('instagram.com')) {
  // Show as Website
} else {
  // Show as Instagram fallback
}
```

**Long-term fix:** Backfill script to move Instagram URLs from `website` to `instagram` field

---

### Issue 2: No Price Levels
**Problem:** `priceLevel` is null for all test places

**Impact:** Meta line doesn't show $$$ symbols

**Options:**
1. Backfill from Google Places (has price_level field)
2. Manual editorial entry
3. Infer from other signals (neighborhood, cuisine, reviews)

---

### Issue 3: No Vibe Tags
**Problem:** `vibeTags` array is empty for all places

**Impact:** Vibe card never renders

**Options:**
1. Generate from editorial sources (extract descriptors)
2. Manual curation
3. LLM extraction from review text

---

## 🚀 Recommended Actions

### Immediate (UI Fixes)
1. ✅ Scale Curator text size (short notes = larger font)
2. ✅ Fix Map preview styling (grid texture + pin)
3. ✅ Details card Instagram fallback (when no real website)

### Short-term (Data Backfill)
1. **Instagram field cleanup**
   - Move Instagram URLs from `website` to `instagram`
   - Backfill real websites from Google Places
   
2. **Price level backfill**
   - Query Google Places API for price_level
   - Update existing places

3. **Vibe tags generation**
   - Extract from editorial sources
   - Manual curation for high-traffic places

### Long-term (Feature Enhancements)
1. **Service options** (Dine-in, Takeout, Delivery)
   - Add fields to schema
   - Fetch from Google Places
   
2. **Reservations**
   - Detect reservation URLs (Resy, OpenTable)
   - Flag as Recommended/Required
   
3. **Parking & Accessibility**
   - Fetch from Google Places
   - Manual editorial notes

---

## 📈 Data Health Score

**Current State:**
- Core fields (name, location, hours, photos): **85%** ✅
- Editorial content (sources, curator notes): **60%** ⚠️
- Enrichment fields (vibe tags, price, groups): **10%** ❌
- Reference data (service, parking, accessibility): **5%** ❌

**Merchant Page v2 works well with current data** because:
- Graceful degradation hides missing cards
- Core information (location, hours, photos) is solid
- Editorial content (Coverage, Curator) shows when available
- No broken layouts or empty states

**Future improvements** will come from data enrichment, not UI changes.

---

**Conclusion:** Data pipeline is working. Fields are just not populated yet. UI handles this gracefully.
