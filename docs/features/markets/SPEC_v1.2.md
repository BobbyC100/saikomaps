# Markets Integration — SPEC v1.2

**Version:** 1.2  
**Owner:** Ken  
**Status:** ACTIVE  
**Last verified vs code:** 2026-02-15  
**Canonical path:** /docs/features/markets/SPEC_v1.2.md

---

## Summary

Add recurring public markets (farmers markets, night markets, food halls, flea markets) as first-class Places using the existing Place system.

No new page template.  
No event engine.  
No vendor directory.

Markets validate Saiko as a layered civic mapping platform, not a restaurant-only directory.

---

## Scope

### Included
- Add `placeType` field to places
- Add `categories` table with FK relation
- Add `marketSchedule` JSON field
- Add `parentId` field (future-proof only, unused at launch)
- Update `/api/places/[slug]` to expose classification fields
- Add page-level gating to replace HoursCard with MarketFactsCard for markets

### Excluded
- One-off events
- Ticketing
- Vendor directory
- Real-time schedule logic
- New page templates

---

## Schema Changes

### 1. Enum

```prisma
enum PlaceType {
  venue
  activity
  public
}
```

### 2. Categories Model

```prisma
model categories {
  id        String  @id @default(cuid())
  slug      String  @unique
  label     String
  is_active Boolean @default(true)

  places    places[]
}
```

### 3. Places Model Additions

Add to `places`:

```prisma
placeType     PlaceType @default(venue) @map("place_type")

categoryId    String? @map("category_id")
category      categories? @relation(fields: [categoryId], references: [id])

parentId      String? @map("parent_id")
parent        places?  @relation("PlaceHierarchy", fields: [parentId], references: [id], onDelete: SetNull)
children      places[] @relation("PlaceHierarchy")

marketSchedule Json? @map("market_schedule")

@@index([categoryId])
@@index([parentId])
```

**Migration name:**

```
markets_foundation_place_type_category
```

---

## Seed Data (V1)

Insert initial categories:
- `restaurant`
- `market`
- `food_hall`

No additional taxonomy required for v1.

---

## API Changes

**File:** `app/api/places/[slug]/route.ts`

Add to location payload:

```typescript
placeType: place.placeType,
categorySlug: place.category?.slug ?? (typeof place.category === "string" ? place.category : null),
marketSchedule: place.marketSchedule ?? null,
```

Do not remove legacy category string yet.

Backward compatibility required.

---

## Page Logic Changes

**File:** `app/(viewer)/place/[slug]/page.tsx`

Add to `LocationData`:

```typescript
placeType?: "venue" | "activity" | "public" | null;
categorySlug?: string | null;
marketSchedule?: unknown | null;
```

Add gating:

```typescript
const isMarket =
  location.placeType === "public" &&
  location.categorySlug === "market";
```

Render logic:
- If `isMarket` → render `<MarketFactsCard />`
- Else → render `<HoursCard />`

No other module order changes.

---

## MarketFactsCard (New Component)

**File:** `components/merchant/MarketFactsCard.tsx`

Minimal UI:
- Weekly schedule display
- Website link
- Instagram link
- Optional vendor type tags

No complex schedule logic.  
No time-based filtering.  
No event expansion.

---

## Acceptance Criteria

- Schema migration applies cleanly
- `prisma migrate status` shows no drift
- Existing restaurant pages unchanged
- Market page renders without HoursCard
- Restaurant pages still render HoursCard
- Build passes
- No TypeScript errors

---

## Conflict Rules

If production schema differs from this spec:
- Production code is canonical.
- Update spec or create alignment PR.
- Do not silently edit this document.

---

## Notes

Markets are modeled as Places with `placeType = public` and `category = market`.

This is not an event system.

This validates the platform taxonomy without expanding surface area.
