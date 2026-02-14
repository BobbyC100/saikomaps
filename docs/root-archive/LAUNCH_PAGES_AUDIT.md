# Saiko Maps — Launch Pages Audit

**Date**: February 10, 2026  
**Status**: Page inventory for launch planning

---

## Distinct Page Types

### Public Pages (Viewer Experience)

| Page | URL Pattern | Status | Notes |
|------|-------------|--------|-------|
| **Homepage** | `/` | ✅ Built | Marketing landing page, "Start a Map" CTA |
| **Search Results** | `/search?q=...` | ✅ Built | Bento grid search cards |
| **Map View** | `/map/[slug]` | ✅ Built | Field Notes template, list/map toggle |
| **Merchant Page** | `/place/[slug]` | ✅ Built | Bento grid layout with hero, hours, gallery, quotes |
| **Collections Index** | `/collections` | ✅ Built (today) | Lists all 4 flagship collections |
| **Collection Detail** | `/collections/[slug]` | ✅ Built (today) | Shows places in a collection |

### Creator Pages (Map Creation Flow)

| Page | URL Pattern | Status | Notes |
|------|-------------|--------|-------|
| **Dashboard** | `/dashboard` | ✅ Built | User's maps, recent activity |
| **Create Map** | `/maps/new` | ✅ Built | Map creation wizard |
| **Edit Map** | `/maps/[mapId]/edit` | ✅ Built | Edit map metadata |
| **Add Locations** | `/create/[mapId]/locations` | ✅ Built | Search & add places to map |
| **Preview Map** | `/create/[mapId]/preview` | ✅ Built | Preview before publishing |
| **Import Flow** | `/import` | ✅ Built | CSV/Google Saves import |

### Admin Pages (Internal)

| Page | URL Pattern | Status | Notes |
|------|-------------|--------|-------|
| **Review Queue** | `/admin/review` | ✅ Built | Entity resolution review |
| **Instagram Import** | `/admin/instagram` | ✅ Built | Instagram backfill tool |

### Auth Pages

| Page | URL Pattern | Status | Notes |
|------|-------------|--------|-------|
| **Login** | `/login` | ✅ Built | Authentication |
| **Signup** | `/signup` | ✅ Built | User registration |

---

## Your Questions Answered

### 1. What pages are launching?

**Launching (Public-Facing):**
- ✅ Homepage (`/`)
- ✅ Search Results (`/search`)
- ✅ Map View (`/map/[slug]`)
- ✅ Merchant Page (`/place/[slug]`)
- ⏳ Collections Index + Detail (`/collections`, `/collections/[slug]`)
  - Built today, launching once identity signals are extracted

**Launching (Creator Flow):**
- ✅ Dashboard (`/dashboard`)
- ✅ Create/Edit Map (`/maps/new`, `/maps/[mapId]/edit`)
- ✅ Add Locations (`/create/[mapId]/locations`)
- ✅ Auth pages (`/login`, `/signup`)

**Not Launching (Internal Only):**
- Admin review queue
- Instagram import tool

---

### 2. Homepage — Is there a homepage, or does / redirect?

**Answer:** There IS a homepage at `/`.

It's a **marketing landing page** with:
- Hero: "Share places worth finding."
- Tagline: "Create cool, personal maps in minutes. Pick a vibe, drop your spots, share the link."
- CTA: "Start a Map" button → `/maps/new`
- Saiko logo/branding

It does NOT redirect to dashboard or search. It's a proper landing page for new visitors.

---

### 3. Explore mode — Separate page or part of search/homepage?

**Answer:** Explore mode does NOT exist as a separate page currently.

**Where "Explore" could live:**
1. **Homepage sections** — Featured collections, trending maps, etc.
2. **Collections pages** — Already built today (`/collections`)
3. **Future browse page** — `/explore` or `/browse`

**Current state:**
- Collections pages (`/collections`, `/collections/[slug]`) serve the "explore" use case
- These use list cards, not 2×2 bento grid
- 2×2 cards with taglines are currently only in search results

**Clarification needed:** Is "Explore" a distinct feature/page you want to build, or are Collections the explore experience?

---

### 4. Collections — Are the 4 flagship collections launching?

**Answer:** ✅ Yes, collections are launching.

**Built today:**
- `/collections` — Index page listing all 4 collections
- `/collections/[slug]` — Detail pages for each collection

**4 Flagship Collections:**
1. LA Institutions
2. Neighborhood Spots
3. Natural Wine Bars
4. Chef's Tables

**Launch dependency:** Need identity signals extracted first to populate collections (requires ≥5 places per collection).

**Validation:** Run `npx tsx scripts/validate-collections.ts` after signals are extracted.

---

### 5. Any pages you're missing?

Additional pages that exist:

| Page | URL Pattern | Status | Purpose |
|------|-------------|--------|---------|
| **Search Results Demo** | `/search-results-demo` | ✅ Built | Demo/testing page |
| **Setup** | `/setup` | ✅ Built | User onboarding |
| **Templates** | `/templates` | ✅ Built | Map template selection |

---

## Page Type Summary

### Public Experience (7 pages)
1. Homepage (`/`)
2. Search Results (`/search`)
3. Map View (`/map/[slug]`)
4. Merchant Page (`/place/[slug]`)
5. Collections Index (`/collections`)
6. Collection Detail (`/collections/[slug]`)
7. Login/Signup (`/login`, `/signup`)

### Creator Experience (6 pages)
1. Dashboard (`/dashboard`)
2. Create Map (`/maps/new`)
3. Edit Map (`/maps/[mapId]/edit`)
4. Add Locations (`/create/[mapId]/locations`)
5. Preview Map (`/create/[mapId]/preview`)
6. Import (`/import`)

### Admin (2 pages)
1. Review Queue (`/admin/review`)
2. Instagram Import (`/admin/instagram`)

**Total: 15 distinct page types**

---

## Identity Signal Integration Status

| Page Type | Identity Signals Integrated | Status |
|-----------|----------------------------|--------|
| Search Results | ✅ Yes (personality inline) | Complete |
| Map View | ✅ Yes (identity summary) | Complete |
| Merchant Page | ⏳ Not yet | Could add |
| Collections | ✅ Yes (query by signals) | Complete |
| Homepage | ⏳ Not yet | Could add featured collections |

---

## Launch Checklist

### Ready Now
- [x] Homepage
- [x] Search Results (with personality integration)
- [x] Map View (with identity summary)
- [x] Merchant Page
- [x] Dashboard
- [x] Create/Edit flow
- [x] Auth pages

### Awaiting Identity Signals
- [ ] Collections Index (needs ≥5 places per collection)
- [ ] Collection Detail pages (needs identity signals extracted)

### Optional Enhancements
- [ ] Homepage featured collections section
- [ ] Merchant page identity badges
- [ ] Browse/Explore landing page

---

## Clarifications Needed

### 1. Explore vs. Collections
Are these the same thing, or separate features?
- **Collections** = Editorial groupings (built today)
- **Explore** = Broader browse experience?

### 2. Where do 2×2 cards with taglines appear?
Currently only in search results. Should they also appear on:
- Homepage?
- Collections pages?
- New Explore page?

### 3. Homepage featured content
Should homepage show:
- Featured collections?
- Trending maps?
- Recent maps?
- Nothing (stay as pure landing page)?

---

## Summary

**Launching:**
- ✅ Homepage (`/`)
- ✅ Search Results (`/search`) — Now with personality inline
- ✅ Map View (`/map/[slug]`) — Now with identity summary
- ✅ Merchant Page (`/place/[slug]`)
- ⏳ Collections (`/collections`, `/collections/[slug]`) — Awaiting identity signals
- ✅ Creator flow (dashboard, create, edit)
- ✅ Auth pages

**Total: 13-15 page types** depending on what counts as "distinct"

**Missing/Unclear:**
- Explore page (separate from collections?)
- Homepage featured content (collections? trending maps?)

**Next step:** Clarify Explore vs. Collections and homepage content strategy.

---

**Date**: February 10, 2026  
**Status**: Audit complete
