---
doc_id: HOMEPAGE-SOLUTIONS-V1
doc_type: planning
status: active
owner: Bobby Ciccaglione
created: 2026-03-24
last_updated: 2026-03-24
project_id: SAIKO
systems:
  - homepage
  - traces
related_docs:
  - docs/APP_OVERVIEW.md
summary: >
  Locked implementation decisions and execution plan for wiring the homepage to
  real data sources, including section model, curation strategy, build order,
  and verification checklist.
---

# Homepage Solutions Doc — saikofields.com

**Date:** 2026-03-24
**Status:** Decisions locked, ready for implementation
**Scope:** What needs to happen to make the homepage live with real content

---

## Current State

The homepage is a static mockup. All data (neighborhoods, categories, experiences, counts, images) is hardcoded in `app/page.tsx`. There are no database queries and no API calls. The layout and component architecture are solid - the issue is purely that nothing is wired to real data.

The good news: **all underlying data already exists in the database.** Entities have `neighborhood`, `primaryVertical`, `category`, and `cuisineType` fields. Instagram and Google Photos data exist for imagery. Published maps/lists already exist for collections. We just need queries and a thin data-fetching layer.

---

## Decisions (locked 2026-03-24)

| # | Question | Decision |
|---|----------|----------|
| 1 | Neighborhoods | **Hand-curated.** Short allow-list in code, not a new table. Homepage should feel intentional, not operationally derived. |
| 2 | Categories | **Use `primaryVertical` as system truth**, but present with editorial labels where needed (e.g., "Natural Wine" not just "Wine"). No second classification system. |
| 3 | Experiences | **Use published maps/lists (Option A).** Already real, already curated, already fits the product. No experience tags yet. |
| 4 | BrowseSection | **Remove it.** Creates redundancy and muddies page hierarchy. Sections below do the real work. Lighter nav index can come later. |
| 5 | Item count | **4 per section, across the board.** Cleaner, more consistent, easier to source strong imagery. |
| 6 | Branding | **Saiko Fields.** The domain is saikofields.com. This is the platform/company front door, not a pure consumer destination. The consumer Maps homepage should live on its own surface. |
| 7 | Photo quality | **Assume partial confidence.** Don't block on a full audit, but don't trust auto-selected images blind. Build the pipeline, then manually review the final 12–16 homepage images and override weak ones. |

**Guiding principle:** The homepage should reflect real Saiko editorial objects, not invented homepage-only concepts. That means curated neighborhoods, real verticals, and published lists.

---

## Section Model (final)

The homepage has three content sections after Hero + Search:

| Section | Label | Data source | Cards |
|---------|-------|-------------|-------|
| 1 | BY NEIGHBORHOOD | `entities` grouped by `neighborhood`, filtered to curated allow-list | 4 NeighborhoodCards |
| 2 | BY CATEGORY | `entities` grouped by `primaryVertical`, with editorial display labels | 4 CategoryCards |
| 3 | COLLECTIONS | `lists` where `published = true`, filtered to curated slug allow-list in config | 4 CollectionCards |

BrowseSection is removed. "BY EXPERIENCE" is renamed to "COLLECTIONS" (final label).

---

## Issue-by-Issue Plan

### 1. Neighborhoods — wire to curated allow-list

**What changes:**
- Define a curated neighborhood list in code (e.g., `lib/homepage/config.ts`):
  ```ts
  export const FEATURED_NEIGHBORHOODS = [
    'Echo Park',
    'Highland Park',
    'Koreatown',
    'San Gabriel Valley',
  ]
  ```
- Query `entities` for neighborhood counts, filtered to the allow-list
- Select a representative place per neighborhood for cover imagery and use its best photo
- Keep the component contract unchanged: `{ name, count, imageUrl, href }`

**Files touched:** `lib/homepage/config.ts` (new), `lib/homepage/queries.ts` (new), `app/page.tsx`

---

### 2. Categories — wire to primaryVertical with editorial labels

**What changes:**
- Define editorial config mapping verticals to display labels and descriptions:
  ```ts
  export const FEATURED_VERTICALS = [
    { vertical: 'WINE', label: 'Natural Wine', description: 'Natural pours and neighborhood gems' },
    { vertical: 'COFFEE', label: 'Coffee', description: 'Third wave pours and quiet corners' },
    { vertical: 'EAT', label: 'Restaurants', description: 'The places worth knowing about' },
    { vertical: 'DRINKS', label: 'Bars & Drinks', description: 'Where the night starts' },
  ]
  ```
- Query entity counts grouped by `primaryVertical`, filtered to the featured list
- Select the best photo from a representative place in each vertical for cover imagery
- Keep the component contract unchanged: `{ title, description, count, imageUrl, href }`

**Files touched:** `lib/homepage/config.ts`, `lib/homepage/queries.ts`, `app/page.tsx`

**Note:** The 4 verticals shown are a starting suggestion. Bobby picks the final 4.

---

### 3. Collections — wire to published lists

**What changes:**
- Query `lists` where `published = true`, filtered by a curated allow-list of list slugs in `lib/homepage/config.ts` (take the first 4 in configured order)
- Normalize list card contract to: `{ title, description, count, imageUrl, href }`
  - `description` resolves from `subtitle ?? description ?? ''`
- Rename the section from "BY EXPERIENCE" to "COLLECTIONS"
- Create a new `CollectionCard` component, or adapt `NeighborhoodCard`, to fit the list data shape

**Files touched:** `lib/homepage/queries.ts`, `app/page.tsx`, possibly `components/homepage/CollectionCard.tsx` (new)

**Decision locked:** Feature collections via allow-list of list slugs in config (same pattern as neighborhoods). DB flag can be evaluated in a separate work order later.

---

### 4. Remove BrowseSection

**What changes:**
- Delete `BrowseSection` import and usage from `app/page.tsx`
- Optionally remove `components/homepage/BrowseSection.tsx` and `BrowseSection.module.css` if they are no longer used

**Files touched:** `app/page.tsx`, `components/homepage/BrowseSection.tsx` (delete), `components/homepage/index.ts`

---

### 5. Shared photo selection utility

**What changes:**
- Extract the Instagram -> Google Photos fallback logic from `app/api/places/[slug]/route.ts` into a shared utility: `lib/photos/getBestPhoto.ts`
- Define the function signature as `getBestPhoto(entityId): Promise<string | null>`
  - Check `instagram_media` for the entity, rank by photoType preference
  - Fall back to `entities.googlePhotos`
  - Return a URL string
- Call this utility from homepage queries for each featured card's representative place

**Files touched:** `lib/photos/getBestPhoto.ts` (new), `lib/homepage/queries.ts` (uses it)

---

### 6. Update branding to Saiko Fields

**What changes:**
- Update Hero text from "Saiko Maps" to "Saiko Fields"
- Set the Hero subtitle to the locked copy: "Los Angeles"
- Keep the footer "SAIKO" logo text, and update tagline copy only if needed
- Update `app/layout.tsx` metadata title from "Saiko Maps" to "Saiko Fields"
- Update footer copyright from "Saiko Maps" to "Saiko Fields"

**Files touched:** `components/homepage/Hero.tsx`, `components/homepage/HomepageFooter.tsx`, `app/layout.tsx`

**Hero copy locked:**
- H1: "Saiko Fields"
- H2: "Los Angeles"
- CTA: "Explore" (unchanged)

---

### 7. `next/image` optimization

**What changes:**
- Switch `<img>` tags in `NeighborhoodCard`, `CategoryCard`, and the new `CollectionCard` to `<Image>` from `next/image`
- Add `remotePatterns` to `next.config.ts` for Instagram CDN and Google Photos domains
- Add `sizes` prop for responsive behavior
- Add `width`/`height` props to prevent layout shift

**Files touched:** `components/homepage/NeighborhoodCard.tsx`, `components/homepage/CategoryCard.tsx`, `next.config.ts`

---

### 8. Manual image QA pass

**What changes:**
- Review the 12–16 auto-selected homepage images after data wiring is complete
- Add manual overrides in `lib/homepage/config.ts` for any weak selections:
  ```ts
  export const IMAGE_OVERRIDES: Record<string, string> = {
    'echo-park': 'https://...manually-selected-url',
  }
  ```
- Ensure query logic checks overrides first and falls back to auto-selection

**Files touched:** `lib/homepage/config.ts`, `lib/homepage/queries.ts`

---

## Build Order (locked)

| Step | Task | Depends on |
|------|------|------------|
| 1 | Lock branding — update Hero, Footer, metadata to "Saiko Fields" | — |
| 2 | Lock section model — rename section heading "BY EXPERIENCE" -> "COLLECTIONS" and map the data source to published lists | — |
| 3 | Remove BrowseSection import/usage from the homepage and delete component files if unreferenced | — |
| 4 | Create `lib/homepage/config.ts` — curated neighborhoods, featured verticals, featured list slugs | — |
| 5 | Create `lib/photos/getBestPhoto.ts` — shared photo fallback utility | — |
| 6 | Create `lib/homepage/queries.ts` — data queries for all 3 sections | Steps 4, 5 |
| 7 | Wire `app/page.tsx` — replace hardcoded data with query calls, 4 cards per section | Step 6 |
| 8 | Switch to `next/image` in card components | Step 7 |
| 9 | Manual image QA — review 12–16 images, add overrides for weak ones | Step 7 |
| 10 | Add ISR/revalidate caching (optional) | Step 7 |

Steps 1–3 can be done in parallel. Steps 4–5 can be done in parallel. Step 6 depends on both. Step 7 wires everything together. Steps 8–10 are polish.

---

## New Files Summary

| File | Purpose |
|------|---------|
| `lib/homepage/config.ts` | Curated allow-lists: neighborhoods, verticals (with editorial labels), collection slugs, image overrides |
| `lib/homepage/queries.ts` | Server-side data queries: `getNeighborhoods()`, `getCategories()`, `getCollections()` |
| `lib/photos/getBestPhoto.ts` | Shared Instagram → Google Photos fallback, extracted from place API |
| `components/homepage/CollectionCard.tsx` | Card component for published lists (if NeighborhoodCard doesn't fit) |

## Verification Checklist

- Homepage renders with live query-backed data for all 3 sections (no hardcoded section arrays in `app/page.tsx`)
- Section headings are: `BY NEIGHBORHOOD`, `BY CATEGORY`, `COLLECTIONS`
- Exactly 4 cards render in each section
- Collection cards resolve `description` via `subtitle ?? description ?? ''` without runtime errors
- Image selection follows override-first, then auto-selection fallback
- BrowseSection is not imported, rendered, or exported anywhere
- Branding copy shows `Saiko Fields` in Hero/footer/metadata targets listed in this doc

## Out of Scope (this work order)

- No schema migrations or table changes
- No new second classification system beyond `primaryVertical` + editorial labels
- No new `featuredOnHomepage` database flag
- No redesign of homepage layout architecture beyond the locked section model changes

## Modified Files Summary

| File | Change |
|------|--------|
| `app/page.tsx` | Remove hardcoded data, remove BrowseSection, wire to queries, rename experience section |
| `app/layout.tsx` | Update metadata title to "Saiko Fields" |
| `components/homepage/Hero.tsx` | Update branding text |
| `components/homepage/HomepageFooter.tsx` | Update branding text |
| `components/homepage/NeighborhoodCard.tsx` | Switch to next/image |
| `components/homepage/CategoryCard.tsx` | Switch to next/image |
| `components/homepage/index.ts` | Remove BrowseSection export, add CollectionCard export |
| `next.config.ts` | Add remotePatterns for Instagram/Google Photos domains |

## Deleted Files

| File | Reason |
|------|--------|
| `components/homepage/BrowseSection.tsx` | Removed per decision #4 |
| `components/homepage/BrowseSection.module.css` | Removed per decision #4 |
