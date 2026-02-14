# Google Places Data Flow Diagnostic Report
**Generated:** February 10, 2026

---

## 🔍 Summary of Findings

**Critical Issue:** The Google Places enrichment script (`scripts/enrich-google-places.ts`) is **NOT writing `address_street` or `address_city` fields** to the database, even though it successfully fetches and writes `phone` and `hours_json`.

---

## 📊 Current State

| Metric | Count | % of Total |
|--------|-------|------------|
| **Total LA County places** | 1,412 | 100% |
| Have `google_place_id` | 1,065 | 75.4% |
| Have `address_street` | 2 | 0.1% ⚠️ |
| Have `hours_json` | 927 | 65.7% ✅ |
| Have `enriched_at` timestamp | 711 | 50.4% |

**Key Gap:**
- **1,063 places** have `google_place_id` but NO `address_street`
- **709 places** have been marked as "enriched" but have NO `address_street`

---

## 🔬 Root Cause Analysis

### 1. Field Mask Request ✅ CORRECT

**File:** `lib/google-places.ts` (lines 162-178)

The Google Places API field mask **includes** the required fields:

```typescript
fields: [
  'place_id',
  'name',
  'formatted_address',        // ✅ Requested
  'formatted_phone_number',
  'website',
  'geometry',
  'rating',
  'user_ratings_total',
  'types',                    // ✅ Requested (for cuisines)
  'photos',
  'opening_hours',            // ✅ Requested
  'price_level',              // ✅ Requested
  'business_status',
  'address_components',       // ✅ Requested
  'vicinity',
].join(','),
```

**Status:** ✅ API is requesting the correct fields.

---

### 2. API Response Parsing ✅ CORRECT

**File:** `lib/google-places.ts` (lines 200-235)

The `getPlaceDetails()` function correctly parses the API response:

```typescript
return {
  placeId: place.place_id,
  name: place.name,
  formattedAddress: place.formatted_address,  // ✅ Parsed
  formattedPhoneNumber: place.formatted_phone_number,
  website: place.website,
  location: {
    lat: place.geometry.location.lat,
    lng: place.geometry.location.lng,
  },
  // ... other fields
  openingHours: place.opening_hours ? { ... } : undefined,  // ✅ Parsed
  priceLevel: place.price_level,              // ✅ Parsed
  addressComponents: addressComponents,       // ✅ Parsed
};
```

**Status:** ✅ API response is parsed correctly.

---

### 3. Database Write Logic ❌ **MISSING FIELDS**

**File:** `scripts/enrich-google-places.ts` (lines 133-172)

The enrichment script **only writes these fields** to the database:

```typescript
const updates: any = {
  enriched_at: new Date(),
};

// ✅ Coords (lat/lng) - writes correctly
if (details.geometry?.location) {
  updates.lat = details.geometry.location.lat;
  updates.lng = details.geometry.location.lng;
}

// ✅ Phone - writes correctly
if (!place.phone && details.formatted_phone_number) {
  updates.phone = details.formatted_phone_number;
}

// ✅ Hours - writes correctly
if (details.opening_hours) {
  updates.hours_json = details.opening_hours;
}

// ❌ NO CODE TO WRITE:
// - address_street (from formatted_address or address_components)
// - address_city
// - address_state
// - address_zip
// - neighborhood (from address_components)
// - category (from types)
// - cuisines (from types)
// - price_tier (from priceLevel)
```

**Status:** ❌ Script is **missing logic** to extract and write address, neighborhood, category, cuisines, and price fields.

---

### 4. Evidence: Sample Record

**Place:** Atlantic Seafood and Dim Sum  
**Google Place ID:** `ChIJQ8DLvEPFwoARd5wfbRi1UEg`

| Field | Value | Expected? |
|-------|-------|-----------|
| `google_place_id` | ✅ Present | ✅ |
| `phone` | ✅ `(626) 872-0388` | ✅ |
| `hours_json` | ✅ Full schedule | ✅ |
| `lat` / `lng` | ✅ `34.0694168`, `-118.1336572` | ✅ |
| `address_street` | ❌ `null` | ❌ Should be filled |
| `address_city` | ❌ `null` | ❌ Should be filled |
| `neighborhood` | ❌ `null` | ❌ Should be filled |
| `enriched_at` | ❌ `null` | Hasn't run for this record yet |

**Diagnosis:** The Google Places API response **contains** `formatted_address` and `address_components`, but the enrichment script **does not write them** to the database.

---

## 🎯 What's Working

1. ✅ **API calls are successful** — `hours_json` proves the API is returning data
2. ✅ **Field mask is correct** — We're requesting all the fields we need
3. ✅ **Parsing works** — `lib/google-places.ts` correctly extracts data from API responses
4. ✅ **Phone and hours write successfully** — Script can write to the database

---

## ❌ What's Broken

The enrichment script **only enriches 3 things**:
1. Coordinates (`lat`, `lng`)
2. Phone (`phone`)
3. Hours (`hours_json`)

**It completely ignores:**
1. ❌ Address (`address_street`, `address_city`, `address_state`, `address_zip`)
2. ❌ Neighborhood (from `address_components`)
3. ❌ Category (from `types`)
4. ❌ Cuisines (from `types`)
5. ❌ Price tier (from `priceLevel`)

---

## 🔧 Required Fix

### In `scripts/enrich-google-places.ts`, add after line 164:

```typescript
// Address - parse from formatted_address
if (details.formatted_address) {
  const addressParts = details.formatted_address.split(',').map(s => s.trim());
  if (addressParts.length >= 3) {
    updates.address_street = addressParts[0];
    updates.address_city = addressParts[1];
    // addressParts[2] is usually "State ZIP"
    const stateZip = addressParts[2].split(' ');
    if (stateZip.length >= 2) {
      updates.address_state = stateZip[0];
      updates.address_zip = stateZip[1];
    }
  }
  console.log(`  ✓ Address: ${addressParts[0]}`);
}

// Neighborhood - parse from address_components
if (details.address_components) {
  const neighborhood = details.address_components.find(c => 
    c.types.includes('neighborhood') || 
    c.types.includes('sublocality_level_1') ||
    c.types.includes('sublocality')
  );
  if (neighborhood && !place.neighborhood) {
    updates.neighborhood = neighborhood.long_name;
    console.log(`  ✓ Neighborhood: ${neighborhood.long_name}`);
  }
}

// Category - map from types
if (details.types && !place.category) {
  // Simple mapping: take first relevant type
  const categoryMap: Record<string, string> = {
    'restaurant': 'Restaurant',
    'cafe': 'Cafe',
    'bar': 'Bar',
    'bakery': 'Bakery',
    'food': 'Restaurant',
    'meal_takeaway': 'Restaurant',
    'meal_delivery': 'Restaurant',
  };
  for (const type of details.types) {
    if (categoryMap[type]) {
      updates.category = categoryMap[type];
      console.log(`  ✓ Category: ${categoryMap[type]}`);
      break;
    }
  }
}

// Price tier - map from priceLevel
if (details.priceLevel !== undefined && !updates.price_tier) {
  updates.price_tier = details.priceLevel;
  console.log(`  ✓ Price: ${'$'.repeat(details.priceLevel)}`);
}
```

---

## 📈 Impact of Fix

| Field | Current Fill Rate | Expected After Fix |
|-------|-------------------|-------------------|
| `address_street` | 0.1% | ~75% |
| `neighborhood` | 47.3% | ~75% |
| `category` | 47.5% | ~75% |
| `price_tier` | 18.6% | ~50% |

**Platinum Profile Impact:**
- Fixing address alone would improve Tier 1 completeness from 62.9% → **~85%**
- Adding neighborhood and category would push it to **~90%+**
- This would move many places significantly closer to the 90% Platinum threshold

---

## 🏃 Next Steps

1. **Update enrichment script** to write missing fields
2. **Re-run enrichment** on 1,065 places with `google_place_id`
3. **Monitor results** — should see address_street fill rate jump from 0.1% → 75%
4. **Verify sample records** after enrichment

---

## One-Line Summary

**The enrichment script successfully calls the Google Places API and gets all required data, but only writes 3 fields (`lat`, `lng`, `phone`, `hours_json`) to the database. It completely ignores `address_street`, `neighborhood`, `category`, `cuisines`, and `price_tier`, even though the API response contains them. This is why we see 65.7% of places with hours but only 0.1% with addresses — the script simply never writes addresses to the database.**
