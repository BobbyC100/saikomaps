# Search Cards Identity Integration — Implementation

**Date**: February 10, 2026  
**Status**: ✅ Complete  
**Scope**: Search cards only (not Explore 2×2)

---

## What Was Built

Integrated `place_personality` into search result card meta lines.

**Before:**
```
Italian · Highland Park · $$
```

**After:**
```
Italian · Highland Park · $$ · Neighborhood Spot
```

---

## Files Changed

### 1. Type Definitions (`components/search-results/types.ts`)
- ✅ Added `PlacePersonality` type
- ✅ Added `placePersonality?` to `PlaceCardData`
- ✅ Added `getPersonalityLabel()` helper function

### 2. Place Card Components
Updated all 4 card variants to show personality inline:

- ✅ `PlaceCard1x1.tsx` — 1×1 grid card
- ✅ `PlaceCard1x2.tsx` — 1×2 tall card
- ✅ `PlaceCard2x1.tsx` — 2×1 wide card
- ✅ `PlaceCard2x2.tsx` — 2×2 large card

### 3. Search API (`app/api/search/route.ts`)
- ✅ Added query to fetch `place_personality` from `golden_records`
- ✅ JOIN on `google_place_id`
- ✅ Return `placePersonality` in response

---

## Personality Label Mapping

| Enum Value | Display Label |
|------------|---------------|
| `institution` | Institution |
| `neighborhood_spot` | Neighborhood Spot |
| `chef_driven` | Chef-Driven |
| `destination` | Destination |
| `scene` | Scene |
| `hidden_gem` | Hidden Gem |

---

## Implementation Details

### Label Rendering
Personality appears **inline** in the meta row, not as a separate badge:

```typescript
{category}
{neighborhood && ` · ${neighborhood}`}
{cuisine && ` · ${cuisine}`}
{price && ` · ${price}`}
{personalityLabel && ` · ${personalityLabel}`}  // ← Added
```

### Null Handling
If `place_personality` is null:
- No label is shown
- No placeholder text
- Meta line renders normally without personality

### API Join
Search API joins `places` with `golden_records`:

```typescript
// Fetch identity signals
const identitySignals = await prisma.golden_records.findMany({
  where: { google_place_id: { in: googlePlaceIds } },
  select: { google_place_id: true, place_personality: true },
});

// Build map
const personalityMap = new Map<string, string | null>();
identitySignals.forEach(record => {
  if (record.google_place_id) {
    personalityMap.set(record.google_place_id, record.place_personality);
  }
});

// Add to result
placePersonality: googlePlaceId ? personalityMap.get(googlePlaceId) : null,
```

---

## What Was NOT Changed

As per spec, the following remain unchanged:

| Element | Status |
|---------|--------|
| Coverage badges | ✅ No change (photo overlay, top-left) |
| Price display | ✅ No change (inline in meta row) |
| Editorial quotes | ✅ No change (keep as-is, no Voice Engine taglines) |
| "Known For" / "Try This" | ✅ Not added (Merchant page only) |
| Vibe words | ✅ Not shown (Engine-only) |
| Cuisine posture | ✅ Not shown (Engine-only) |
| Wine program | ✅ Not shown (Filter-only) |

---

## Card Structure

```
┌─────────────────────────────────┐
│ [PHOTO]                         │
│   ┌──────────────┐              │
│   │ Eater 38     │ ← coverage   │
│   └──────────────┘              │
├─────────────────────────────────┤
│ Guisados               ← name   │
│ Tacos · Echo Park · $ · Institution │
│                        ↑ personality appended to meta │
│                                 │
│ "Braised meats in handmade..."  │
│                    ↑ editorial quote (unchanged) │
│                                 │
│ 🟢 Open              0.3 mi     │
│    ↑ status          ↑ distance │
└─────────────────────────────────┘
```

---

## Acceptance Criteria

- [x] Personality appears inline in meta line (not as separate badge)
- [x] Human-readable labels used (e.g., "Neighborhood Spot" not "neighborhood_spot")
- [x] Cards without personality render normally with no placeholder
- [x] Editorial quotes remain unchanged
- [x] Coverage badge remains on photo overlay
- [x] No "Known For" line on Search cards
- [x] Price displays as before
- [x] All 4 card variants updated
- [x] Search API returns `placePersonality`

---

## Testing

### Manual Test
1. Start dev server: `npm run dev`
2. Visit `/search?q=tacos`
3. Check that place cards show personality in meta line
4. Verify format: `Category · Neighborhood · Price · Personality`
5. Check cards without personality still render correctly

### API Test
```bash
# Test search API response
curl "http://localhost:3000/api/search?q=test" | jq '.places[0].placePersonality'
```

Should return personality value or null.

---

## Data Flow

```
Search Query
    ↓
[Search API]
    ↓
Query places table
    ↓
Fetch place_personality from golden_records (JOIN on google_place_id)
    ↓
Build personality map
    ↓
Return places with placePersonality
    ↓
[Place Card Component]
    ↓
getPersonalityLabel(placePersonality)
    ↓
Render inline in meta row
```

---

## Future Enhancements (Not in V1)

- Filter/sort by personality
- Personality-based card styling
- Personality icons/badges
- Show personality in other card types (Explore, Featured, etc.)

---

## Notes

- Personality data comes from `golden_records` table
- Only places with `google_place_id` can have personality
- Personality requires identity signal extraction to have run
- Places without scraped content will not have personality

---

## Summary

Search Cards Identity Integration is **complete**. Personality labels now appear inline in the meta row of all search result cards, providing at-a-glance orientation about what kind of place it is.

**Built**: February 10, 2026  
**Status**: ✅ Ready for testing
