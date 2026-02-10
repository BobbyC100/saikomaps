# Map Identity Summary — Implementation

**Date**: February 10, 2026  
**Status**: ✅ Complete and tested  
**Test**: `npx tsx scripts/test-map-identity-summary.ts` — ALL 7 TESTS PASSING

---

## What Was Built

Auto-generated single-line summaries that orient viewers about what kind of places are on a map.

**Example outputs:**
- "12 places — mostly neighborhood spots, $–$$."
- "8 places — chef-driven spots and destinations, $$$."
- "15 places — mixed, $–$$$."
- "3 places — $$."
- "1 place — mostly institutions, $$."

---

## Display Priority

**Order of precedence:**

1. **Map Identity Summary (auto-generated)** → always shown first
2. **Curator description** → shown below, if present

The summary is NOT a fallback. It always appears, regardless of whether the curator wrote a description.

---

## Files Created/Updated

### Core Logic
- ✅ `lib/map-identity-summary.ts` — Generator function + test cases

### Components Updated
- ✅ `app/map/[slug]/components/TitleCard.tsx` — Display summary below title
- ✅ `app/map/[slug]/page.tsx` — Pass identity signals to TitleCard

### API Updated
- ✅ `app/api/maps/public/[slug]/route.ts` — Fetch identity signals from golden_records

### Testing
- ✅ `scripts/test-map-identity-summary.ts` — 7 test cases

---

## Generation Logic

### 1. Place Count

Always included. Format: `{n} places` or `1 place`.

### 2. Personality Phrase

Analyzes `place_personality` distribution:

| Condition | Output | Example |
|-----------|--------|---------|
| One personality ≥ 60% | `mostly {personality}` | "mostly institutions" |
| Two personalities each ≥ 30% | `{personality} and {personality}` | "chef-driven spots and destinations" |
| Otherwise | `mixed` | "mixed" |
| No personality data | (omitted) | — |

**Rules:**
- Max two personalities named
- Never list three or more
- Never show percentages
- Labels are pluralized (e.g., "institutions", "neighborhood spots")

### 3. Price Phrase

Analyzes `price_tier` distribution:

| Condition | Output | Example |
|-----------|--------|---------|
| All same tier | Single value | "$$" |
| Mixed tiers | Range | "$–$$$" |
| No price data | (omitted) | — |

---

## Output Format

```
{count} places — {personality phrase}, {price phrase}.
```

Always ends with a period.

---

## Test Results

All 7 test cases passing ✅:

```bash
npx tsx scripts/test-map-identity-summary.ts
```

| Test Case | Expected | Result |
|-----------|----------|--------|
| Mostly institutions | "4 places — mostly institutions, $–$$$." | ✅ Pass |
| Two personalities | "4 places — chef-driven spots and destinations, $$$–$$$$." | ✅ Pass |
| Mixed personalities | "4 places — mixed, $–$$$." | ✅ Pass |
| No personality data | "3 places — $$–$$$." | ✅ Pass |
| No price data | "3 places — mostly neighborhood spots." | ✅ Pass |
| No data at all | "2 places." | ✅ Pass |
| Single place | "1 place — mostly institutions, $$." | ✅ Pass |

---

## Visual Placement

```
┌─────────────────────────────────────────┐
│  Silver Lake Coffee             ← title │
│  12 places — mostly neighborhood spots, $–$$. │
│                                 ↑ auto-summary (NEW) │
│                                         │
│  My favorite coffee spots around the    │
│  reservoir and Sunset Junction.         │
│                     ↑ curator description │
└─────────────────────────────────────────┘
```

**Styling:**
- Font size: 13px
- Font family: DM Sans
- Color: #888 (muted)
- Position: Below title, above curator description
- Always visible (not conditional on curator description)

---

## Data Flow

```
Map Page Load
    ↓
[API: /api/maps/public/[slug]]
    ↓
Fetch map + places from places table
    ↓
JOIN with golden_records (on google_place_id)
    ↓
Return places with place_personality and price_tier
    ↓
[TitleCard Component]
    ↓
Call generateMapSummary(places)
    ↓
Display summary below title
```

---

## API Changes

Updated `/api/maps/public/[slug]/route.ts`:

```typescript
// Fetch identity signals
const googlePlaceIds = list.mapPlaces
  .map(mp => mp.place.googlePlaceId)
  .filter((id): id is string => id !== null);

const identitySignals = await db.goldenRecord.findMany({
  where: { googlePlaceId: { in: googlePlaceIds } },
  select: {
    googlePlaceId: true,
    placePersonality: true,
    priceTier: true,
  },
});

// Build map and enrich places
const signalsMap = new Map();
identitySignals.forEach(record => {
  if (record.googlePlaceId) {
    signalsMap.set(record.googlePlaceId, {
      placePersonality: record.placePersonality,
      priceTier: record.priceTier,
    });
  }
});
```

---

## Edge Cases Handled

| Scenario | Output |
|----------|--------|
| 0 places | Empty string (no summary shown) |
| 1 place with data | "1 place — mostly institutions, $$." |
| 1 place, no data | "1 place." |
| All same personality & price | "8 places — mostly institutions, $$." |
| No personality, mixed prices | "10 places — $–$$$." |
| No price, mixed personalities | "10 places — mixed." |
| 50/50 split personalities | "10 places — institutions and neighborhood spots, $$." |
| Places without google_place_id | Counted but don't contribute to personality/price phrases |

---

## Label Mapping

### Personality (Pluralized)

| Enum Value | Display Label |
|------------|---------------|
| `institution` | institutions |
| `neighborhood_spot` | neighborhood spots |
| `chef_driven` | chef-driven spots |
| `destination` | destinations |
| `scene` | scene spots |
| `hidden_gem` | hidden gems |

### Price (No Change)

| Value | Display |
|-------|---------|
| `$` | $ |
| `$$` | $$ |
| `$$$` | $$$ |
| `$$$$` | $$$$ |

---

## Future Enhancements (Not in V1)

- Use summary in OG metadata (for share previews)
- Show summary on map cards in browse/search
- Include in map export/share images
- Cache summary to avoid recalculation

---

## Acceptance Criteria

- [x] Summary always appears below map title
- [x] Summary appears even when curator wrote description
- [x] Curator description appears below summary (if present)
- [x] Place count accurate
- [x] "Mostly" when one personality ≥ 60%
- [x] Two personalities shown when each ≥ 30%
- [x] "Mixed" when no clear majority
- [x] Price range shows min–max correctly
- [x] Single price when all same
- [x] Empty maps show no summary
- [x] Ends with period
- [x] Logic tested with 7 test cases ✅

---

## Usage

### Programmatic

```typescript
import { generateMapSummary } from '@/lib/map-identity-summary';

const places = [
  { place_personality: 'institution', price_tier: '$$' },
  { place_personality: 'institution', price_tier: '$$$' },
  { place_personality: 'neighborhood_spot', price_tier: '$' },
];

const summary = generateMapSummary(places);
console.log(summary);
// Output: "3 places — mostly institutions, $–$$$."
```

### In TitleCard Component

```typescript
const places = mapData.locations.map(loc => ({
  place_personality: loc.placePersonality || null,
  price_tier: loc.priceTier || null,
}));

const summary = generateMapSummary(places);

// Render below title
{summary && (
  <p style={{ fontSize: '13px', color: '#888' }}>
    {summary}
  </p>
)}
```

---

## Testing

```bash
# Run unit tests
npx tsx scripts/test-map-identity-summary.ts
```

All 7 test cases pass ✅

---

## Ken's Filter

> "The system explains the shape; the human adds color."

Summary is factual orientation, not editorial voice:

✅ **Good**: "12 places — mostly neighborhood spots, $–$$."  
❌ **Bad**: "12 great neighborhood spots you'll love!"

✅ **Good**: "8 places — mixed, $$$."  
❌ **Bad**: "A curated selection of 8 amazing restaurants."

---

## Summary

Map Identity Summary is **complete and tested**. It provides instant orientation about what kind of places are on a map, appearing above curator descriptions to ensure consistent scanning behavior.

**Built**:
- ✅ Generator function with full logic
- ✅ TitleCard integration
- ✅ API updated to fetch identity signals
- ✅ 7 test cases passing
- ✅ All edge cases handled

**Ready**: To display on all map pages once identity signals are extracted.

---

**Built by**: Claude Sonnet 4.5  
**Date**: February 10, 2026  
**Status**: ✅ Complete
