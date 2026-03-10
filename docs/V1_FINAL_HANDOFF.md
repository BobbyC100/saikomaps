# Saiko Maps — V1 Final Handoff

**Date**: February 10, 2026  
**Status**: ✅ Launch-ready with clarifications  
**Session**: Full implementation + V1 scope clarification

---

## What Changed Today

### Features Implemented ✅

1. **Voice Engine v2.0** — Generates taglines from identity signals (not displayed on V1 pages, reserved for share cards)
2. **Search Cards Identity Integration** — Personality inline in meta row
3. **Map Identity Summary** — Auto-generated orientation below map title
4. **Launch Pages Audit** — Clarified V1 scope and removed Collections

### Code Removed ❌

1. `/collections` routes (removed — V2 concept)
2. `/lib/collections/` (removed — replaced with Flagship Maps plan)
3. Collection-related scripts and docs (removed)

---

## V1 Launch Scope (LOCKED)

### Pages Shipping (13 total)

**Public (6):**
- Homepage: `/` — Pure landing page
- Search: `/search?q=...` — With personality inline
- Map View: `/map/[slug]` — With identity summary
- Merchant: `/place/[slug]` — Full bento grid
- Auth: `/login`, `/signup`

**Creator (7):**
- Dashboard: `/dashboard`
- Create flow: `/maps/new` → `/create/[mapId]/locations` → `/create/[mapId]/preview`
- Edit: `/maps/[mapId]/edit`

### Pages NOT Shipping

- Collections Index: `/collections` — ❌ Removed (V2 concept)
- Collections Detail: `/collections/[slug]` — ❌ Removed (V2 concept)
- Explore: `/explore` — Not built yet (post-launch)

---

## Key Clarifications

### 1. Collections vs. Flagship Maps

**Old concept (removed):** "Collections" as separate entity  
**New concept (V1):** "Flagship Maps" as regular Saiko-authored maps

Flagship Maps are just maps that Saiko creates:
- Use existing `lists` table
- Live at `/map/[slug]` (standard map route)
- Created manually for V1, can automate later

**4 Flagship Maps to create post-launch:**
1. LA Institutions (`/map/la-institutions`)
2. Neighborhood Spots (`/map/neighborhood-spots`)
3. Natural Wine Bars (`/map/natural-wine-bars`)
4. Chef's Tables (`/map/chefs-tables`)

See: `FLAGSHIP_MAPS_V1.md`

### 2. Homepage Content

**V1:** Pure marketing landing page
- Hero + "Start a Map" CTA
- No featured maps or collections

**Post-launch:** Can add featured Flagship Maps section

### 3. Where Taglines Appear

**V1:** Nowhere on pages
- Reserved for share cards (when built)
- Optional secondary copy on merchant pages (future)

**Search cards use:**
- Personality inline in meta ✅
- Editorial quotes (not taglines) ✅

### 4. Terminology

Stop saying "Collection" — use "Map" instead:
- ❌ "Flagship Collections" → ✅ "Flagship Maps"
- ❌ "Collections page" → ✅ "Map view"
- ❌ "Collection" → ✅ "Map"

---

## Identity Signal Integration

| Page | Integration | Status |
|------|-------------|--------|
| Search Results | Personality inline (`Category · Neighborhood · Price · Personality`) | ✅ Complete |
| Map View | Identity summary (`12 places — mostly institutions, $–$$.`) | ✅ Complete |
| Merchant Page | None (V1) | — |
| Homepage | None (V1) | — |

Both features gracefully handle missing data (null personalities, missing prices).

---

## Files Created

### Documentation
- `V1_LAUNCH_PAGES_FINAL.md` — Complete V1 page inventory
- `FLAGSHIP_MAPS_V1.md` — How Flagship Maps work (not Collections)
- `LAUNCH_PAGES_CLARIFICATION.md` — User-provided clarifications
- `VOICE_ENGINE_V2_*.md` — Voice Engine v2.0 docs (4 files)
- `SEARCH_CARDS_IDENTITY_INTEGRATION.md` — Search card spec
- `MAP_IDENTITY_SUMMARY_IMPLEMENTATION.md` — Map summary spec

### Implementation
- `lib/voice-engine-v2/` — Complete Voice Engine v2.0 (5 files)
- `lib/map-identity-summary.ts` — Map summary generator
- `components/search-results/types.ts` — Updated with personality
- `components/search-results/PlaceCard*.tsx` — 4 card variants updated
- `app/map/[slug]/components/TitleCard.tsx` — Displays identity summary
- `app/api/maps/public/[slug]/route.ts` — Fetches identity signals

### Scripts
- `scripts/test-voice-engine-v2.ts` — Voice Engine tests
- `scripts/test-map-identity-summary.ts` — Identity summary tests (7/7 PASSING)
- `scripts/generate-taglines-v2.ts` — Batch tagline generation

### Schema Changes
- `prisma/schema.prisma` — Added tagline fields to `golden_records`

---

## Files Removed

- `app/(viewer)/collections/page.tsx` ❌
- `app/(viewer)/collections/[slug]/page.tsx` ❌
- `lib/collections/` (entire directory) ❌
- `scripts/validate-collections.ts` ❌
- `FLAGSHIP_COLLECTIONS_IMPLEMENTATION.md` ❌
- `FLAGSHIP_COLLECTIONS_SUMMARY.md` ❌

---

## Pending Tasks

### Before Launch
- [ ] Test all 13 page types render correctly
- [ ] Verify identity signals display on search/map pages
- [ ] Validate homepage is pure landing (no featured content)
- [ ] Check no `/collections` routes exist

### After Identity Signals Extracted
- [ ] Run database migration: `npx prisma migrate dev --name add_voice_engine_v2_fields`
- [ ] Validate Flagship Map counts: Ensure ≥5 places per map
- [ ] Create system user: `maps@saiko.com`
- [ ] Manually create 4 Flagship Maps
- [ ] Generate taglines: `npx tsx scripts/generate-taglines-v2.ts --limit=50`

### Post-Launch
- [ ] Build share card templates with taglines
- [ ] Add featured Flagship Maps to homepage
- [ ] Build Explore page (repurpose old collections code?)
- [ ] Automate Flagship Map syncing

---

## Testing

### Completed Today

1. **Voice Engine v2.0**: Tested with sample data, generates valid taglines
2. **Map Identity Summary**: 7/7 test cases passing
   ```bash
   npx tsx scripts/test-map-identity-summary.ts
   ```
3. **Search Cards**: Verified personality renders inline
4. **Map View**: Verified identity summary appears below title

### Still Needs Testing

- Flagship Maps (once created)
- Share cards (not built yet)
- Homepage content (once deployed)

---

## Key Files Reference

### Core Business Logic
- `lib/voice-engine-v2/orchestrator.ts` — End-to-end tagline generation
- `lib/map-identity-summary.ts` — Map summary generator
- `components/search-results/types.ts` — Search card data types

### Page Components
- `app/map/[slug]/page.tsx` — Map view
- `app/map/[slug]/components/TitleCard.tsx` — Map title + summary
- `components/search-results/PlaceCard*.tsx` — Search result cards (4 variants)

### API Routes
- `app/api/maps/public/[slug]/route.ts` — Map data with identity signals
- `app/api/search/route.ts` — Search API (personality inline)

---

## Data Model Summary

### Identity Signals (in `golden_records`)

| Field | Type | Used Where |
|-------|------|------------|
| `place_personality` | enum | Search cards, map summary |
| `price_tier` | enum | Search cards, map summary |
| `cuisine_posture` | enum | Voice Engine (taglines) |
| `signature_dishes` | array | Voice Engine (taglines) |
| `vibe_words` | array | Voice Engine (taglines) |
| `origin_story_type` | enum | Voice Engine (taglines) |
| `service_model` | enum | Voice Engine (taglines) |
| `wine_program_intent` | enum | Voice Engine (taglines) |

### Tagline Fields (in `golden_records`)

| Field | Type | Purpose |
|-------|------|---------|
| `tagline` | string | Selected tagline |
| `tagline_candidates` | array | All 4 generated options |
| `tagline_pattern` | string | Which pattern won |
| `tagline_generated_at` | datetime | When generated |
| `tagline_signals` | json | Snapshot of inputs |
| `tagline_version` | int | Voice Engine version |

---

## What to Tell Users

### About V1 Launch
"Saiko Maps launches with 13 pages: homepage, search, map creation, and merchant pages. Identity signals power search card personalities and map orientation summaries."

### About Collections
"Collections don't exist in V1 — they're a future concept. Instead, Saiko will create editorial 'Flagship Maps' using the same map system users have."

### About Taglines
"Voice Engine taglines are reserved for share cards and export images. Search cards use editorial quotes to preserve trust calibration."

### About Flagship Maps
"After identity signals are extracted, Saiko will manually create 4 editorial maps: LA Institutions, Neighborhood Spots, Natural Wine Bars, and Chef's Tables. These aren't a special feature — they're just maps that Saiko creates."

---

## Summary

**Implemented today:**
- Voice Engine v2.0 (taglines from identity signals)
- Search Cards Identity Integration (personality inline)
- Map Identity Summary (auto-generated orientation)
- V1 Launch clarification (removed Collections, defined scope)

**V1 is launching with:**
- 13 page types (public + creator)
- Identity-powered search and map pages
- Pure marketing homepage
- No collections or explore pages

**Post-launch:**
- Create 4 Flagship Maps as regular Saiko-authored maps
- Build share card templates with taglines
- Add featured maps to homepage
- Consider Explore page

**Status**: ✅ Launch-ready once identity signals extracted

---

**Date**: February 10, 2026  
**Session**: Complete
