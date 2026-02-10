# Saiko Maps — Flagship Maps (V1)

**Date**: February 10, 2026  
**Status**: Design approved, awaiting identity signals  
**Type**: Regular maps with `author_type: 'saiko'`

---

## What Are Flagship Maps?

Flagship Maps are **Saiko-authored maps** using the exact same data model and pages as user-created maps. They're editorial groupings powered by identity signals, but they live at regular map URLs like `/map/la-institutions`.

**Not a separate feature.** Just maps that Saiko creates instead of users.

---

## V1 Flagship Maps (4 Total)

### 1. LA Institutions
**URL:** `/map/la-institutions`  
**Title:** "LA Institutions"  
**Description:** "The places that were here before you and will be here after. No reinvention, no pivot, no rebrand. Just the same thing, done right, for a long time."  
**Query:** `place_personality = 'institution' AND county = 'Los Angeles'`

### 2. Neighborhood Spots
**URL:** `/map/neighborhood-spots`  
**Title:** "Neighborhood Spots"  
**Description:** "The places people actually go. Not for a special occasion — for a Tuesday. Regulars, familiar faces, and food that shows up the same way every time."  
**Query:** `place_personality = 'neighborhood_spot' AND county = 'Los Angeles'`

### 3. Natural Wine Bars
**URL:** `/map/natural-wine-bars`  
**Title:** "Natural Wine Bars"  
**Description:** "Low-intervention bottles, interesting producers, maybe some orange wine if you're lucky. These places care about what's in the glass."  
**Query:** `wine_program_intent = 'natural' AND county = 'Los Angeles'`

### 4. Chef's Tables
**URL:** `/map/chefs-tables`  
**Title:** "Chef's Tables"  
**Description:** "The chef decides. You sit down, you trust the kitchen, and you see where it goes. These are the tasting menus worth planning around."  
**Query:** `service_model = 'tasting_menu' AND place_personality = 'chef_driven' AND county = 'Los Angeles'`

---

## Data Model

Use existing `lists` table with no schema changes:

```typescript
{
  id: uuid(),
  user_id: 'saiko_system',        // System user ID
  title: 'LA Institutions',
  slug: 'la-institutions',
  description: 'The places that were here...',
  description_source: 'editorial',
  status: 'PUBLISHED',
  published: true,
  template_type: 'field-notes',
  // ... standard map fields
}
```

**Key field:** Use existing fields, no new columns needed.

**Author identification:**
- Use a system user account (`email: 'maps@saiko.com'` or similar)
- Standard `user_id` relationship
- Display as "by Saiko Maps" in UI

---

## How to Create

### Manual Creation (V1 Approach)

1. Create system user if doesn't exist:
   ```sql
   INSERT INTO users (id, email, name) 
   VALUES ('saiko-system', 'maps@saiko.com', 'Saiko Maps');
   ```

2. Create map records:
   ```sql
   INSERT INTO lists (id, user_id, title, slug, description, status, published, ...)
   VALUES (...);
   ```

3. Query places and add to map:
   ```typescript
   const places = await prisma.golden_records.findMany({
     where: { 
       place_personality: 'institution',
       county: 'Los Angeles',
       identity_signals: { path: ['confidence_tier'], equals: 'publish' },
     },
   });
   
   // Add to map via map_places junction table
   ```

### Future: Automated Sync (V2)

Later, build a script that:
- Runs query on identity signals
- Syncs matching places to flagship map
- Runs nightly or on-demand

But for V1, just manually create the 4 maps once identity signals are ready.

---

## Display

Flagship Maps use the **exact same page** as user maps:
- URL: `/map/la-institutions` (standard map route)
- Layout: Field Notes template
- Components: TitleCard, place cards, map/list toggle
- Identity summary: "12 places — mostly institutions, $–$$." (auto-generated)

**Only difference:** Author name shows "Saiko Maps" instead of a user name.

---

## Homepage Integration (Not V1)

For launch, homepage stays pure landing page. Post-launch, consider adding:

```
┌─────────────────────────────────────────┐
│  Hero: "Share places worth finding"     │
│  CTA: "Start a Map"                     │
├─────────────────────────────────────────┤
│  Featured Maps (optional, post-launch)  │
│    ├─ LA Institutions                   │
│    ├─ Natural Wine Bars                 │
│    └─ Chef's Tables                     │
└─────────────────────────────────────────┘
```

But V1 homepage has no featured content.

---

## Validation

Before creating flagship maps, validate:

```bash
# Check that each map will have ≥5 places
SELECT place_personality, COUNT(*) 
FROM golden_records 
WHERE county = 'Los Angeles' 
  AND signals_generated_at IS NOT NULL
  AND identity_signals->>'confidence_tier' = 'publish'
GROUP BY place_personality;
```

Only create maps that meet the 5-place minimum.

---

## Ken's Filter (Still Applies)

Map names must sound like they could appear on Eater:

✅ **Good Names:**
- LA Institutions
- Natural Wine Bars
- Neighborhood Spots
- Chef's Tables

❌ **Bad Names:**
- Protein-Centric Restaurants
- Places with Natural Wine
- Bobby's Picks
- Hidden Gems Under $$$

---

## Implementation Checklist

For V1 launch:

- [x] Remove `/collections` routes
- [x] Remove collections library code
- [x] Remove collections docs
- [ ] Validate identity signal counts (≥5 per map)
- [ ] Create system user: `maps@saiko.com`
- [ ] Create 4 flagship maps as regular maps
- [ ] Test maps render correctly at `/map/[slug]`
- [ ] Add to homepage (post-launch, optional)

---

## What's Different from "Collections" Concept?

| Feature | Collections (removed) | Flagship Maps (V1) |
|---------|----------------------|-------------------|
| Entity type | Separate model | Regular maps |
| URL pattern | `/collections/[slug]` | `/map/[slug]` |
| Data model | New tables | Existing `lists` + `map_places` |
| Page template | Custom | Field Notes (standard) |
| Author | System | System user (Saiko Maps) |
| Creation | Query-based auto-sync | Manual (V1) or scripted (V2) |

Flagship Maps are just maps that Saiko creates. Nothing special.

---

## Summary

"Collections" doesn't exist in V1. Instead, Saiko will manually create 4 **Flagship Maps** using the standard map creation flow, with places queried by identity signals.

**V1 Approach:**
- Use existing map infrastructure
- Create system user
- Manually create 4 maps
- No new code needed

**Post-Launch:**
- Build auto-sync script
- Add featured maps to homepage
- Consider "Explore" page repurposing collections code

---

**Status**: Collections removed, Flagship Maps clarified  
**Action**: Create 4 Saiko-authored maps once signals ready  
**Date**: February 10, 2026
