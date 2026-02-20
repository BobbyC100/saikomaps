# Schema Updates & Data Model Implementation Summary

**Date:** February 18, 2026  
**Directive:** Schema Updates & Data Model Decisions - Implementation Directive  
**Status:** Complete

---

## 1. Primary Vertical Enum

- **Status:** Already correct. Enum has all 12 values: EAT, COFFEE, WINE, DRINKS, SHOP, CULTURE, NATURE, STAY, WELLNESS, BAKERY, PURVEYORS, ACTIVITY.
- **Files verified:** `prisma/schema.prisma`, `lib/primaryVertical.ts`, `scripts/backfill-primary-vertical.sql`, `prisma/migrations/20260218000000_add_primary_vertical/migration.sql`
- No changes needed.

---

## 2. Schema Additions (4 New Fields on `places`)

All 4 fields added to `prisma/schema.prisma` and migrated:

| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| `transitAccessible` | `Boolean?` | null | Is the place near public transit? |
| `thematicTags` | `String[]` | `[]` | Editorial tags (e.g. "wine-forward", "date-spot") |
| `contextualConnection` | `String?` | null | E.g. "Part of Silver Lake's wine bar scene" |
| `curatorAttribution` | `String?` | null | Who wrote the curator note |

**Migration:** `prisma/migrations/20260218010000_add_place_page_fields/migration.sql`  
**Note:** `prisma db push` was used to apply schema; migration file is available if you prefer `prisma migrate deploy`.

---

## 3. Place Page Component Updates

### Status Cell (Cell 3)
- Added `priceLevel` → displays as $ / $$ / $$$ / $$$$
- Added `transitAccessible` → shows "Transit nearby" with Train icon when true
- Price moved here from Offerings cell per directive

### Offerings Cell (Cell 4)
- Removed `priceLevel` (now in Status cell)
- Uses `cuisineType` as section header
- Uses `tips[]` as "Don't miss" list (max 5)
- Comment added: interim solution until menu parsing

### Editorial Cell (Cell 5)
- Primary content: `sources[0].excerpt` if available, else `curatorNote`
- Source attribution link: "Read on {publication} →"
- Added `thematicTags` → displayed as inline chips (#tag-format)
- Added `contextualConnection` → small italic text
- Added `curatorAttribution` → byline "— {name}"
- `hasEditorialContent` now true when any of: sources, curatorNote, thematicTags, contextualConnection, curatorAttribution

### Experience Cell (Cell 2)
- Vibe tags sorted by priority (occasion > atmosphere > timing)
- Max 5 tags displayed (PLACE_PAGE_TAG_LIMIT)

---

## 4. Vibe Tag Priority

**New file:** `lib/config/vibe-tags.ts`

- `VIBE_TAG_PRIORITY` mapping for known tags
- `sortVibeTagsByPriority()` – sorts by priority
- `PLACE_PAGE_TAG_LIMIT = 5`
- `CARD_TAG_LIMIT = 3`

**Updated:**
- `ExperienceCell` – sorts and slices to 5
- `lib/transformers/placeToCard.ts` – sorts and slices to 3 for cards
- `app/api/search/route.ts` – sorts and slices to 3 for search results

---

## 5. API Updates

**`app/api/places/[slug]/route.ts`**
- Returns: `transitAccessible`, `thematicTags`, `contextualConnection`, `curatorAttribution`

---

## 6. Backfill Script

**New file:** `scripts/backfill-place-page-fields.ts`

```bash
npx tsx scripts/backfill-place-page-fields.ts [transit|thematic|contextual|curator|all]
```

- **transit:** No-op (leave null for manual curation per directive Option B)
- **thematic:** Stub (TODO: extract from curatorNote, place_personality, sources)
- **contextual:** Stub (TODO: generate from neighborhood + vertical + personality)
- **curator:** Populates `curatorAttribution` from `map_places` + `lists.users` when descriptor exists

---

## 7. Admin UI

**Status:** No admin place edit form exists in the codebase. Places are edited via scripts and API (`map-places`, import routes, etc.). Admin UI for the 4 new fields would need to be built separately.

---

## 8. Files Modified

| File | Changes |
|------|---------|
| `prisma/schema.prisma` | Added 4 fields to places model |
| `prisma/migrations/20260218010000_add_place_page_fields/migration.sql` | New migration |
| `lib/config/vibe-tags.ts` | New – vibe tag priority config |
| `app/(viewer)/place/[slug]/components/cells/StatusCell.tsx` | Price, transit |
| `app/(viewer)/place/[slug]/components/cells/OfferingsCell.tsx` | Removed price |
| `app/(viewer)/place/[slug]/components/cells/EditorialCell.tsx` | New fields, curator note fallback |
| `app/(viewer)/place/[slug]/components/cells/ExperienceCell.tsx` | Vibe tag priority, max 5 |
| `app/(viewer)/place/[slug]/components/MerchantGrid.tsx` | Pass new props, hasEditorialContent |
| `app/(viewer)/place/[slug]/page.tsx` | LocationData + MerchantGrid props |
| `app/api/places/[slug]/route.ts` | Return new fields |
| `app/api/search/route.ts` | Vibe tag priority for cards |
| `lib/transformers/placeToCard.ts` | Vibe tag priority for cards |
| `scripts/backfill-place-page-fields.ts` | New backfill script |

---

## 9. Success Criteria Checklist

- [x] All 4 new fields exist in schema
- [x] Place page components display new fields when present
- [x] Primary Vertical enum has 12 values
- [x] Vibe tags display with priority (max 5 on page, 3 on cards)
- [x] Price in Status cell, not Offerings cell
- [x] Offerings cell uses interim mapping (cuisine + tips)
- [x] Editorial cell shows new fields when present
- [x] No TypeScript errors
- [ ] Admin UI for new fields (not present – would need to be built)
- [x] Backfill script exists and documented

---

## 10. Questions / Blockers

1. **Transit accessibility:** Directive recommends 0.5 mi threshold. LA Metro API or manual curation?
2. **Thematic tags extraction:** AI extraction from curatorNote/place_personality or manual curation?
3. **Contextual connection:** AI generation or manual only?
4. **Admin UI:** No place edit form exists. Add one, or continue using scripts/API?
