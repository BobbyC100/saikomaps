# Badge Ship v1 — Implementation Complete

## Changes Summary

### 1. Types Updated (`components/search-results/types.ts`)
- ✅ Added `menu_analyzed` and `wine_program` to `SignalType`
- ✅ Added `isInternal?: boolean` to `Signal` interface
- ✅ Added `SignalStatus` type
- ✅ Added signal status fields to `PlaceCardData`:
  - `menuSignalsStatus?: SignalStatus`
  - `winelistSignalsStatus?: SignalStatus`
  - `menuIdentityPresent?: boolean`
  - `winelistIdentityPresent?: boolean`
- ✅ Created `computeInternalBadges()` helper function

### 2. Card Components Updated
All card variants now compute and display internal badges:
- ✅ `PlaceCard1x1.tsx`
- ✅ `PlaceCard1x2.tsx`
- ✅ `PlaceCard2x1.tsx`
- ✅ `PlaceCard2x2.tsx`
- ✅ `HorizontalBentoCard.tsx`

**Pattern:**
```typescript
// Compute internal badges
const internalBadges = computeInternalBadges(place);

// Merge: external first, then internal
const allBadges = [...signals, ...internalBadges];

// Render
{allBadges.map(signal => ...)}
```

### 3. Data Layer Updated

**`lib/transformers/placeToCard.ts`:**
- ✅ Updated to use shared types
- ✅ Added signal status mapping
- ✅ Added identity presence detection

**`app/api/search/route.ts`:**
- ✅ Fetches `menu_signals` and `winelist_signals` from `golden_records`
- ✅ Maps status and payload to card data
- ✅ Computes `menuIdentityPresent` and `winelistIdentityPresent`

---

## Display Logic (As Specified)

### Menu Badge: "Menu Analyzed"
Shows when:
- `menuSignalsStatus === "ok"`, OR
- `menuSignalsStatus === "partial"` AND `menuIdentityPresent === true`

### Wine Badge: "Wine Program"
Shows when:
- `winelistSignalsStatus === "ok"`, OR
- `winelistSignalsStatus === "partial"` AND `winelistIdentityPresent === true`

### Ordering
- External badges render first (Eater, Michelin, etc.)
- Internal badges render after
- Max 2 internal badges per card

### Silence Policy
- If status is `failed` or missing → no badge
- Silence > weak signal

---

## QA Checklist

### Before Testing
1. Ensure dev server is running
2. Ensure DATABASE_URL points to saiko_maps with golden_records populated
3. Ensure signal analysis has been run (you have menu_signals/winelist_signals rows)

### Manual QA Steps

**1. Search for a place with menu signals:**
```
Search: "Anajak Thai"
Expected: "Menu Analyzed" badge appears
```

**2. Search for a place with winelist signals:**
```
Search: "Anajak Thai"
Expected: "Menu Analyzed" AND "Wine Program" badges appear
```

**3. Search for a place without signals:**
```
Search: "random place with no signals"
Expected: No internal badges (only external if any)
```

**4. Check priority zone (first 4 cards):**
- Verify badges don't cause layout shift
- Verify external badges still appear first
- Verify max 2 internal badges

**5. Mobile breakpoint check:**
- Resize to mobile width
- Verify badges don't overflow or break layout

### SQL Spot Check

**Find places with both menu and winelist ok:**
```sql
SELECT 
  gr.name,
  ms.status as menu_status,
  ws.status as wine_status
FROM golden_records gr
LEFT JOIN menu_signals ms ON ms.golden_record_id = gr.canonical_id
LEFT JOIN winelist_signals ws ON ws.golden_record_id = gr.canonical_id
WHERE ms.status = 'ok' AND ws.status = 'ok'
LIMIT 5;
```

**Search for these places and verify both badges appear.**

---

## Acceptance Criteria Status

1. ✅ **No layout shift:** Cards use existing badge container, no new layout
2. ✅ **Priority Zone intact:** Badges are data, not layout changes
3. ✅ **Correctness:** Logic matches spec exactly
4. ✅ **Visual consistency:** Reuses existing badge styles
5. ⬜ **Spot check:** Needs manual QA (10-20 places)

---

## Next Steps

1. **Start dev server** and test search page
2. **Run QA checklist** above
3. **Spot check 10-20 places** in search results
4. **Verify mobile** breakpoints
5. If all checks pass → **ship to production**

---

## Files Modified

### Frontend
- `components/search-results/types.ts` - Types + badge logic
- `components/search-results/PlaceCard1x1.tsx` - Badge integration
- `components/search-results/PlaceCard1x2.tsx` - Badge integration
- `components/search-results/PlaceCard2x1.tsx` - Badge integration
- `components/search-results/PlaceCard2x2.tsx` - Badge integration
- `components/search-results/HorizontalBentoCard.tsx` - Badge integration

### Backend
- `app/api/search/route.ts` - Fetch signal status from golden_records
- `lib/transformers/placeToCard.ts` - Map signal status to card data

### Database (Already Complete)
- `prisma/schema.prisma` - menu_signals + winelist_signals tables
- Migration applied ✅
- Signal analysis run ✅ (130 menu, 29 winelist)

---

## Current Signal Coverage

**Menu Signals:** 130 / 225 places (58%)
- ok: 123
- partial: 7 (meaningful)
- failed: 95

**Winelist Signals:** 29 / 43 places (67%)
- ok: 22
- partial: 7 (meaningful)
- failed: 14

**Ready to surface in UI!**
