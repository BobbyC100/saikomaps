# Saiko Maps V1 — Launch Pages (FINAL)

**Date**: February 10, 2026  
**Status**: ✅ Clarified and locked

---

## Pages Launching

### Public Pages (8 pages)

| Page | URL | Status | Notes |
|------|-----|--------|-------|
| **Homepage** | `/` | ✅ Ship | Pure marketing landing, "Start a Map" CTA |
| **Search Results** | `/search?q=...` | ✅ Ship | Bento grid, personality inline in meta |
| **Map View** | `/map/[slug]` | ✅ Ship | Field Notes, identity summary below title |
| **Merchant Page** | `/place/[slug]` | ✅ Ship | Full bento grid layout |
| **Login** | `/login` | ✅ Ship | Auth |
| **Signup** | `/signup` | ✅ Ship | Auth |

### Creator Pages (5 pages)

| Page | URL | Status | Notes |
|------|-----|--------|-------|
| **Dashboard** | `/dashboard` | ✅ Ship | User's maps |
| **Create Map** | `/maps/new` | ✅ Ship | Map creation flow |
| **Edit Map** | `/maps/[mapId]/edit` | ✅ Ship | Edit metadata |
| **Add Locations** | `/create/[mapId]/locations` | ✅ Ship | Search & add places |
| **Preview** | `/create/[mapId]/preview` | ✅ Ship | Preview before publish |

**Total: 13 pages**

---

## Pages NOT Launching (Removed)

| Page | Status | Reason |
|------|--------|--------|
| `/collections` | ❌ Removed | V2 concept, doesn't exist in V1 |
| `/collections/[slug]` | ❌ Removed | V2 concept, doesn't exist in V1 |
| `/explore` | ❌ Don't build | Post-launch feature |

---

## Clarifications (Final Answers)

### 1. Explore vs Collections?

**Answer:** Neither exists in V1.

- **Collections** = V2 concept (groups of maps)
- **Explore** = Post-launch browse page

For V1, users discover maps through:
- Search (`/search`)
- Direct links from creators
- (Post-launch) Featured maps on homepage

### 2. Homepage content?

**Answer:** Pure marketing landing page.

**Has:**
- Hero: "Share places worth finding"
- CTA: "Start a Map" button
- Branding/logo

**Does NOT have (V1):**
- Featured maps section
- Collections
- Search bar
- User-generated content

### 3. Where do 2×2 tagline cards appear?

**Answer:** Nowhere in V1.

Voice Engine taglines are reserved for:
- Share cards / export images (when built)
- Merchant page secondary copy (optional, future)

**Search cards use:**
- Personality inline in meta row ✅
- Editorial quotes (not taglines) ✅

---

## Flagship Maps (Not Collections)

Saiko will create **4 Flagship Maps** as regular maps (not a separate entity):

1. **LA Institutions** → `/map/la-institutions`
2. **Neighborhood Spots** → `/map/neighborhood-spots`
3. **Natural Wine Bars** → `/map/natural-wine-bars`
4. **Chef's Tables** → `/map/chefs-tables`

**Implementation:**
- Use standard `lists` table
- Create system user: `maps@saiko.com`
- Create as `author_type: 'saiko'` (or similar)
- Query places by identity signals
- Add to maps via standard `map_places` junction

**No special code needed** — they're just maps.

---

## Terminology (Important)

| ❌ Don't Say | ✅ Say Instead |
|-------------|----------------|
| Collection | Map |
| Collections page | (doesn't exist) |
| Flagship Collections | Flagship Maps |
| Collection detail | Map view |

Stop using "Collection" terminology in V1.

---

## Identity Signal Integration (Complete)

| Page | Integration | Status |
|------|-------------|--------|
| Search Results | Personality inline in meta | ✅ Complete |
| Map View | Identity summary below title | ✅ Complete |
| Merchant Page | None (V1) | — |
| Homepage | None (V1) | — |

---

## Features Built Today

### 1. Voice Engine v2.0 ✅
- Generates taglines using identity signals
- **Not displayed on V1 pages** (share cards only)
- Test: `npx tsx scripts/test-voice-engine-v2.ts`

### 2. Search Cards Identity Integration ✅
- Personality inline in meta row
- Format: `Category · Neighborhood · Price · Personality`
- Graceful null handling

### 3. Map Identity Summary ✅
- Auto-orientation below map title
- Format: `{count} places — {personality}, {price}.`
- Test: `npx tsx scripts/test-map-identity-summary.ts` — 7/7 PASSING

### 4. ~~Flagship Collections~~ ❌ Removed
- V2 concept, removed from codebase
- Replaced with Flagship Maps plan (use regular maps)

---

## V1 Launch Checklist

### Pages Ready
- [x] Homepage (pure landing)
- [x] Search Results (with personality inline)
- [x] Map View (with identity summary)
- [x] Merchant Page
- [x] Dashboard
- [x] Create/Edit flow
- [x] Auth pages

### Not Building for V1
- [ ] Collections Index (removed)
- [ ] Collections Detail (removed)
- [ ] Explore page (post-launch)
- [ ] 2×2 tagline cards (share cards only)
- [ ] Homepage featured content (post-launch)

### To Build After Identity Signals
- [ ] Create system user (`maps@saiko.com`)
- [ ] Create 4 Flagship Maps manually
- [ ] Validate each has ≥5 places
- [ ] Test map pages render correctly

---

## Identity Signal Dependencies

Everything identity-related waits for signal extraction:

1. **Search card personalities** — Display once extracted
2. **Map identity summaries** — Display once extracted
3. **Flagship Maps** — Create once extracted & validated
4. **Voice Engine taglines** — Generate once extracted (for share cards)

**Currently:** Scraper running (~90 min remaining)

---

## Summary

**Launching:**
- 13 page types (public + creator flow)
- Search with personality inline
- Maps with identity summary
- Pure marketing homepage

**Not Launching:**
- Collections pages (removed, V2 concept)
- Explore page (post-launch)
- 2×2 tagline cards (share cards only)

**Post-Launch:**
- Create 4 Flagship Maps (as regular maps)
- Add featured maps to homepage
- Build share card templates with taglines
- Consider Explore page

---

**Date**: February 10, 2026  
**Status**: ✅ Pages clarified, collections removed, ready for launch
