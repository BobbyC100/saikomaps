# API Contract: Place Canonical Data

> **See also**: [PlaceCanonical Data Contract](./DATA-CONTRACT-PLACE-CANONICAL.md) for the philosophical foundation and system-wide guarantees that govern this API.

**Endpoint**: `GET /api/places/[slug]`  
**Purpose**: Return customer-facing canonical place data for the place page (merchant view)

### Scope

This endpoint returns **Saiko Places only** (endorsed, curated).  
If Saiko supports a broader "place universe" for power users, it must use a separate endpoint and a separate response shape (e.g., `ExternalPlaceCandidate`) that does **not** imply endorsement.

---

## Design Principles

1. **Canonical Only**: Return only promoted/curated fields, never `discovered_*` staging data
2. **Trust First**: Lead with editorial content (coverage, Saiko summary, curator notes)
3. **Action-Oriented**: Surface primary actions (menu, reservations, wine list) prominently
4. **Freshness-Aware**: Include timestamps for client-side staleness checks
5. **Compact Chips**: Identity signals (cuisine, price, vibe) are arrays, not full objects
6. **No Google Cruft**: Filter Google attributes carefully; avoid Yelp-ish noise

---

## Response Structure

```typescript
{
  success: true,
  data: {
    // ────────────────────────────────────────────────────────────
    // IDENTITY & BASIC INFO
    // ────────────────────────────────────────────────────────────
    id: string;
    slug: string;
    name: string;
    status: 'OPEN' | 'CLOSED' | 'TEMP_CLOSED';
    
    // ────────────────────────────────────────────────────────────
    // LOCATION & GEOGRAPHY
    // ────────────────────────────────────────────────────────────
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    neighborhood: string | null;  // Uses neighborhoodOverride if present
    city: string | null;
    
    // ────────────────────────────────────────────────────────────
    // TIER 0 ACTIONS (Primary CTAs)
    // ────────────────────────────────────────────────────────────
    menuUrl: string | null;           // NEW: Direct menu link
    winelistUrl: string | null;       // NEW: Wine list link
    reservationUrl: string | null;    // Resy/OpenTable/etc.
    
    // ────────────────────────────────────────────────────────────
    // CONTACT & SECONDARY ACTIONS
    // ────────────────────────────────────────────────────────────
    phone: string | null;             // Normalized US format
    instagram: string | null;         // Handle only (no @)
    aboutUrl: string | null;          // NEW: About/Story page
    website: string | null;           // Fallback if no specific URLs
    
    // ────────────────────────────────────────────────────────────
    // HOURS & AVAILABILITY
    // ────────────────────────────────────────────────────────────
    hours: Record<string, string> | null;  // { monday: "9:00 AM – 5:00 PM", ... }
    hoursFreshness: {
      cachedAt: string | null;        // ISO timestamp of last Google sync
      isStale: boolean;               // true if > 7 days old
    };
    
    // ────────────────────────────────────────────────────────────
    // TRUST LAYER (Editorial Content)
    // ────────────────────────────────────────────────────────────
    saikoSummary: {
      content: string;
      generatedAt: string;            // ISO timestamp
      modelVersion: string;
      sourceCount: number;            // Length of saikoSummaryCoverageIds
    } | null;
    
    pullQuote: {
      quote: string;
      author: string | null;
      source: string;                 // Publication name
      url: string | null;             // Link to article
    } | null;
    
    coverages: Array<{
      url: string;
      title: string | null;
      publication: string;            // source.name
      excerpt: string | null;
      quote: string | null;
      publishedAt: string | null;     // ISO date (YYYY-MM-DD)
      trustLevel: 'editorial';        // Always editorial (APPROVED only)
    }>;
    
    curatorNote: {
      note: string;
      creatorName: string;
      mapTitle: string;
      mapSlug: string;
    } | null;
    
    // ────────────────────────────────────────────────────────────
    // IDENTITY SIGNALS (Chips/Attributes)
    // ────────────────────────────────────────────────────────────
    cuisine: {
      primary: string | null;         // cuisinePrimary (Saiko editorial)
      secondary: string[];            // cuisineSecondary array
    };
    
    priceLevel: number | null;        // 1-4 ($ - $$$$)
    
    intentProfile: string | null;     // Service model (date-night/lunch-counter/etc.)
    
    vibeTags: string[];               // Max 4 for display
    
    attributes: {                     // Filtered googlePlacesAttributes
      accessibility: string[] | null; // e.g., ["wheelchair_accessible"]
      parking: string[] | null;       // e.g., ["street_parking", "paid_lot"]
      dining: string[] | null;        // e.g., ["outdoor_seating", "reservations"]
    } | null;
    
    // ────────────────────────────────────────────────────────────
    // MEDIA
    // ────────────────────────────────────────────────────────────
    photos: {
      hero: string | null;            // First photo, 800px
      gallery: string[];              // Up to 9 more, 400px each
    };
    
    // ────────────────────────────────────────────────────────────
    // TIPS & RECOMMENDATIONS (Optional)
    // ────────────────────────────────────────────────────────────
    tips: string[];                   // Curator tips
    
    chefRecs: {                       // Chef recommendations (if present)
      chef: string;
      items: string[];
    } | null;
    
    // ────────────────────────────────────────────────────────────
    // TAGLINE (For cards/social)
    // ────────────────────────────────────────────────────────────
    tagline: string | null;
    
    // ────────────────────────────────────────────────────────────
    // RESTAURANT GROUP (Optional context)
    // ────────────────────────────────────────────────────────────
    restaurantGroup: {
      name: string;
      slug: string;
    } | null;
    
    // ────────────────────────────────────────────────────────────
    // MAP APPEARANCES (Where this place is featured)
    // ────────────────────────────────────────────────────────────
    appearsOn: Array<{
      id: string;
      title: string;
      slug: string;
      coverImageUrl: string | null;
      creatorName: string;
      placeCount: number;
    }>;
  }
}
```

---

## Field Mapping (Prisma → API Response)

| API Field | Prisma Source | Notes |
|-----------|---------------|-------|
| `menuUrl` | `place.menuUrl` | **NEW**: Canonical menu link (promoted from crawler) |
| `winelistUrl` | `place.winelistUrl` | **NEW**: Canonical wine list link |
| `aboutUrl` | `place.aboutUrl` | **NEW**: Canonical about page link |
| `reservationUrl` | `place.reservationUrl` | Existing field |
| `instagram` | `place.instagram` | Handle only (strip @ if present) |
| `phone` | `place.phone` | Already normalized to US format |
| `neighborhood` | `place.neighborhoodOverride` → `place.neighborhood` | Override wins |
| `hours` | `place.hours` | Parse JSON |
| `hoursFreshness.cachedAt` | `place.placesDataCachedAt` | ISO timestamp |
| `hoursFreshness.isStale` | Derived | `true` if > 7 days from now |
| `saikoSummary.content` | `place.saikoSummary` | Only if present |
| `saikoSummary.generatedAt` | `place.saikoSummaryGeneratedAt` | ISO timestamp |
| `saikoSummary.modelVersion` | `place.saikoSummaryModelVersion` | e.g., "claude-3.5-sonnet" |
| `saikoSummary.sourceCount` | `place.saikoSummaryCoverageIds.length` | Count array length |
| `pullQuote` | `place.pullQuote` + related fields | Only if `pullQuote` is non-null |
| `coverages` | `place.coverages` relation | `status: 'APPROVED'` only, order by `publishedAt DESC` |
| `curatorNote` | First `map_places.descriptor` from published maps | First non-empty descriptor |
| `cuisine.primary` | `place.cuisinePrimary` | Saiko editorial field |
| `cuisine.secondary` | `place.cuisineSecondary` | Array of strings |
| `priceLevel` | `place.priceLevel` | 1-4 |
| `intentProfile` | `place.intentProfile` | Service model string |
| `vibeTags` | `place.vibeTags` | Max 4 for display |
| `attributes` | `place.googlePlacesAttributes` + fallback to `golden_records` | **Filter carefully** (see below) |
| `photos.hero` | `place.googlePhotos[0]` | 800px |
| `photos.gallery` | `place.googlePhotos[1..9]` | 400px each |
| `tips` | `place.tips` | Array of strings |
| `chefRecs` | `place.chefRecs` | Parse JSON if present |
| `tagline` | `place.tagline` | Short descriptor |
| `restaurantGroup` | `place.restaurant_groups` relation | Include if present |

---

## Google Attributes Filtering Rules

**Goal**: Surface useful signals, avoid Yelp-ish noise.

### Include (if present):
- **Accessibility**: `wheelchair_accessible_entrance`, `wheelchair_accessible_parking`, `wheelchair_accessible_restroom`, `wheelchair_accessible_seating`
- **Parking**: `parking_street`, `parking_lot`, `parking_valet`, `parking_garage`, `parking_free`
- **Dining**: `outdoor_seating`, `takeout`, `delivery`, `reservations_required`, `reservations_accepted`, `dine_in`

### Exclude:
- Payment methods (assume all accept cards)
- "Good for" attributes (good_for_kids, good_for_groups) - too subjective
- Ambiance (casual_atmosphere, cozy) - use vibeTags instead
- Service speed (fast_service) - not trust signals
- Alcohol/menu specifics (serves_beer, serves_wine) - redundant with category

### Implementation:
```typescript
function filterGoogleAttributes(raw: any): {
  accessibility: string[] | null;
  parking: string[] | null;
  dining: string[] | null;
} | null {
  if (!raw || typeof raw !== 'object') return null;
  
  const accessibility = [
    'wheelchair_accessible_entrance',
    'wheelchair_accessible_parking',
    'wheelchair_accessible_restroom',
    'wheelchair_accessible_seating',
  ].filter(key => raw[key] === true);
  
  const parking = [
    'parking_street', 'parking_lot', 'parking_valet',
    'parking_garage', 'parking_free',
  ].filter(key => raw[key] === true);
  
  const dining = [
    'outdoor_seating', 'takeout', 'delivery',
    'reservations_required', 'reservations_accepted', 'dine_in',
  ].filter(key => raw[key] === true);
  
  if (accessibility.length === 0 && parking.length === 0 && dining.length === 0) {
    return null;
  }
  
  return {
    accessibility: accessibility.length > 0 ? accessibility : null,
    parking: parking.length > 0 ? parking : null,
    dining: dining.length > 0 ? dining : null,
  };
}
```

---

## Freshness & Staleness

**Hours Staleness Rule**:
- If `placesDataCachedAt` is `null` → `isStale: true`
- If `now() - placesDataCachedAt > 7 days` → `isStale: true`
- Otherwise → `isStale: false`

**Client-Side Behavior**:
- If `hoursFreshness.isStale === true`, show hours but add a warning: "⚠️ Hours may be outdated"
- Consider hiding "Open now" indicator if stale

---

## Error Handling

| Scenario | Status | Response |
|----------|--------|----------|
| Missing `slug` param | 400 | `{ error: 'Place slug is required' }` |
| Place not found in DB | 404 | `{ error: 'Place not found' }` |
| Place exists but wrong `cityId` | 404 | `{ error: 'Place not found' }` (city-gated) |
| Server error | 500 | `{ error: 'Failed to fetch place', details: '...' }` |

---

## Security & Performance

1. **City Gating**: Always filter by `cityId` (LA only for now)
2. **Status Filtering**: Include places with `status: OPEN | CLOSED | TEMP_CLOSED` (exclude archived/pending)
3. **Coverage Filtering**: Only `status: 'APPROVED'` coverages
4. **Map Filtering**: Only `status: 'PUBLISHED'` maps in `appearsOn`
5. **Pagination**: Not needed for single place endpoint
6. **Caching**: Consider 5-minute CDN cache for non-admin requests

---

## Migration Notes

### Breaking Changes from Current API:
1. **Removed**:
   - `description` (Google-generic, prefer `saikoSummary`)
   - `cuisineType` (Google field, replaced by `cuisine.primary`)
   - `googlePlaceId` (internal, not customer-facing)
   - `isOwner` (move to separate admin endpoint)
   - Top-level `guide` object (redundant with `appearsOn[0]`)

2. **Added**:
   - `menuUrl`, `winelistUrl`, `aboutUrl` (new canonical URLs)
   - `hoursFreshness` (staleness indicator)
   - `saikoSummary` (structured with provenance)
   - `cuisine` (structured primary/secondary)
   - `attributes` (filtered Google attributes)
   - `photos` (structured hero/gallery)

3. **Restructured**:
   - `pullQuote` now an object (was top-level fields)
   - `curatorNote` now an object with context
   - `coverages` now use relational data (not JSON fallback)

### Backward Compatibility:
- Current API at `/api/places/[slug]/route.ts` should remain for now
- New API can be `/api/places/[slug]/canonical` or version `/api/v2/places/[slug]`
- Deprecation timeline: 2 sprints

---

## Example Response

```json
{
  "success": true,
  "data": {
    "id": "abc123",
    "slug": "alta-adams",
    "name": "Alta Adams",
    "status": "OPEN",
    "address": "5359 W Adams Blvd, Los Angeles, CA 90016",
    "latitude": 34.0358,
    "longitude": -118.3494,
    "neighborhood": "West Adams",
    "city": "Los Angeles",
    "menuUrl": "https://altaadams.com/menu-alt/",
    "winelistUrl": null,
    "reservationUrl": "https://resy.com/cities/la/alta-adams",
    "phone": "(323) 571-4999",
    "instagram": "altaadams",
    "aboutUrl": null,
    "website": "https://altaadams.com",
    "hours": {
      "monday": "Closed",
      "tuesday": "5:00 PM – 10:00 PM",
      "wednesday": "5:00 PM – 10:00 PM"
    },
    "hoursFreshness": {
      "cachedAt": "2026-02-10T08:30:00.000Z",
      "isStale": false
    },
    "saikoSummary": {
      "content": "Chef Keith Corbin's Southern California soul food...",
      "generatedAt": "2026-02-01T12:00:00.000Z",
      "modelVersion": "claude-3.5-sonnet",
      "sourceCount": 3
    },
    "pullQuote": null,
    "coverages": [
      {
        "url": "https://www.latimes.com/...",
        "title": "Alta Adams Review",
        "publication": "Los Angeles Times",
        "excerpt": "...",
        "quote": "...",
        "publishedAt": "2023-05-15",
        "trustLevel": "editorial"
      }
    ],
    "curatorNote": {
      "note": "Best fried chicken in LA, no debate",
      "creatorName": "Bobby",
      "mapTitle": "West Adams Essential Eats",
      "mapSlug": "west-adams-essentials"
    },
    "cuisine": {
      "primary": "Southern / Soul Food",
      "secondary": ["New American", "California Soul"]
    },
    "priceLevel": 2,
    "intentProfile": "Dinner Destination",
    "vibeTags": ["Date Night", "Local Favorite", "Chef-Driven"],
    "attributes": {
      "accessibility": ["wheelchair_accessible_entrance"],
      "parking": ["parking_street"],
      "dining": ["reservations_accepted", "outdoor_seating"]
    },
    "photos": {
      "hero": "https://maps.googleapis.com/.../maxwidth=800",
      "gallery": [
        "https://maps.googleapis.com/.../maxwidth=400",
        "https://maps.googleapis.com/.../maxwidth=400"
      ]
    },
    "tips": [],
    "chefRecs": null,
    "tagline": "Chef Keith Corbin's California soul food",
    "restaurantGroup": null,
    "appearsOn": [
      {
        "id": "map123",
        "title": "West Adams Essential Eats",
        "slug": "west-adams-essentials",
        "coverImageUrl": "...",
        "creatorName": "Bobby",
        "placeCount": 12
      }
    ]
  }
}
```

---

## Next Steps

1. Implement `getPlaceCanonical()` helper function
2. Create new route at `/api/places/[slug]/canonical` or `/api/v2/places/[slug]`
3. Update frontend to consume new structure
4. Add freshness warnings for stale hours
5. Surface new URL fields (menu, winelist, about) in UI
6. Deprecate old endpoint after migration window
