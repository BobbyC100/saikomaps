# Merchant Page Data Audit v2

**Date:** February 8, 2026  
**Updated:** February 9, 2026  
**Purpose:** Comprehensive inventory of available vs. used data for merchant pages

---

## Policy: No Google Ratings or Reviews

**This is a core Saiko principle, not a deferral.**

| Field | Display? | Use in AI? | Store? | Admin-only? |
|-------|----------|------------|--------|-------------|
| `rating` | ❌ Never | ❌ Never | ✅ Yes | ✅ Optional |
| `user_ratings_total` | ❌ Never | ❌ Never | ✅ Yes | ✅ Optional |
| `reviews` (array) | ❌ Never | ❌ Never | ❌ No | ❌ No |
| Star distribution | ❌ Never | ❌ Never | ❌ No | ❌ No |

**Rules:**
- Do not display rating, user_ratings_total, or reviews on any user-facing surface
- Do not use them as ranking signals in SaikoAI recommendations
- Do not use them as fallback editorial content
- Do not use Google's `editorial_summary` as fallback content
- Allowed: Internal/debug/admin-only visibility for QA purposes, but never user-facing

**Rationale:** Saiko is editorial-first. Trust comes from curated sources and curator voice, not aggregated star ratings. We are not Yelp.

---

## Non-Goals

These are explicitly out of scope for the merchant page:

- ❌ Star ratings (Google, Yelp, or any source)
- ❌ Review counts ("234 reviews")
- ❌ Google review text or excerpts
- ❌ Star distribution charts
- ❌ "Trending" or "Popular" badges based on review volume
- ❌ Any UI that resembles a review aggregator

---

## Saiko-Native Trust Model

Trust on Saiko comes from two sources only:

### 1. Coverage Card (External Voice)

Editorial validation from trusted publications.

**Content hierarchy:**
1. **Pull Quote** (preferred) — Direct quote from coverage, clickable via `pull_quote_url`
2. **Excerpt** (fallback) — Summarized coverage point
3. **Source List** (minimum) — Publication names with links

**Styling rules:**
- Quote link styled as citation (underline on hover), not CTA (no button)
- Source list capped at 3-4 visible, "More sources →" link if needed
- If only source list exists (no quote), display must look intentional, not empty

### 2. Curator's Note (Internal Voice)

Personal perspective from the map creator.

**Behavior:**
- Paired with Coverage Card in Editorial tier
- If Coverage is missing, Curator's Note expands to fill the row
- If both are missing, Editorial tier doesn't render (no fallback content)

### Trust Fallback Rules

| Coverage State | Curator's Note State | Result |
|----------------|---------------------|--------|
| Has quote | Has note | Both render side-by-side |
| Has quote | No note | Coverage renders at 4-col |
| Has sources only | Has note | Both render, sources list is compact |
| Has sources only | No note | Coverage renders at 4-col with source list |
| No coverage | Has note | Curator's Note expands to 6-col |
| No coverage | No note | **Editorial tier doesn't render** |

**Critical:** Never backfill empty Editorial tier with Google `editorial_summary` or `reviews`. Empty is better than generic.

---

## Current Data Usage

### ✅ Currently Displayed on Merchant Page

#### Hero Section
- ✅ **Name** (Google Places)
- ✅ **Tagline** (Voice Engine)
- ✅ **Hero Photo** (Google Places photos[0])
- ✅ **Category** (Google Places types → categorized)
- ✅ **Neighborhood** (Google Places address components)
- ✅ **Cuisine Type** (Derived/manual)
- ✅ **Price Level** (Google Places, $-$$$$)
- ✅ **Open/Closed Status** (Google Places opening_hours.open_now)

#### Decision Tier
- ✅ **Primary Action Set** (Directions/Call/Instagram/Share per intent profile)
- ✅ **Reservation URL** (Manual/scraped, Decision Onset)
- ✅ **Instagram** (Google Places or manual, if handle exists)

#### Context Tier
- ✅ **Gallery** (Google Places photos[1-4], up to 4 images)

#### Facts Tier
- ✅ **Hours** (Google Places opening_hours.weekday_text)
- ✅ **Open/Closed + Timing** ("Closes 11 PM" / "Opens 7 AM")

#### Editorial Tier
- ✅ **Curator's Note** (MapPlace.descriptor) — 2-col
- ✅ **Coverage** (Pull Quote OR Excerpt OR Source list) — 4-col
  - Pull Quote (Voice Engine)
  - Pull Quote Source (Voice Engine)
  - Pull Quote Author (Voice Engine)
  - Editorial Sources array (Scraped coverage)

#### Utility Tier
- ✅ **Map** (Google Places lat/lng + address)
- ✅ **Website** (Google Places)
- ✅ **Call** (Google Places formatted_phone_number)

#### Secondary Content
- ✅ **Vibe Tags** (Voice Engine, e.g., "Low-key", "Surf crowd")
- ✅ **Tips** (Voice Engine, e.g., "Go early for a seat")
- ✅ **Best For** (Google Places description)
- ✅ **Also On** (MapPlaces relationships)

---

## Available Data Inventory

### Google Places API — What We Fetch

| Field | Stored in DB? | Displayed? | Notes |
|-------|---------------|------------|-------|
| `place_id` | ✅ | ❌ | Internal only |
| `name` | ✅ | ✅ | Hero |
| `formatted_address` | ✅ | ✅ | Meta + Map card |
| `formatted_phone_number` | ✅ | ✅ | Call action |
| `website` | ✅ | ✅ | Website card / Primary actions |
| `geometry` (lat/lng) | ✅ | ✅ | Map card, Directions |
| `rating` | ✅ | ❌ | **POLICY: Never display** |
| `user_ratings_total` | ✅ | ❌ | **POLICY: Never display** |
| `types` | ✅ | ✅ | Category derivation |
| `photos` | ✅ | ✅ | Hero + Gallery (capped at 4) |
| `opening_hours` | ✅ | ✅ | Hours card |
| `price_level` | ✅ | ✅ | Meta row ($-$$$$) |
| `business_status` | ✅ | ✅ | Status precedence logic |
| `address_components` | ✅ | ✅ | Neighborhood extraction |
| `vicinity` | ✅ | ❌ | Available but unused |

### Google Places API — Available But Not Fetched

| Field | Available? | Recommended? | Use Case |
|-------|------------|--------------|----------|
| `delivery` | ✅ | ✅ Yes | Service options tag |
| `takeout` | ✅ | ✅ Yes | Service options tag |
| `dine_in` | ✅ | ✅ Yes | Service options tag |
| `wheelchair_accessible_entrance` | ✅ | ✅ Yes | Accessibility indicator |
| `reservable` | ✅ | ✅ Yes | Inform Primary Action Set |
| `serves_breakfast` | ✅ | ⏸️ Later | Meal service tags |
| `serves_brunch` | ✅ | ⏸️ Later | Meal service tags |
| `serves_lunch` | ✅ | ⏸️ Later | Meal service tags |
| `serves_dinner` | ✅ | ⏸️ Later | Meal service tags |
| `serves_beer` | ✅ | ⏸️ Later | Beverage tags |
| `serves_wine` | ✅ | ⏸️ Later | Beverage tags |
| `serves_vegetarian_food` | ✅ | ⏸️ Later | Dietary tag |
| `curbside_pickup` | ✅ | ⏸️ Later | Service option |
| `secondary_opening_hours` | ✅ | ✅ Yes | Brunch/delivery/happy hour |
| `url` | ✅ | ✅ Yes | Google Maps direct link |
| `editorial_summary` | ✅ | ❌ No | **POLICY: Never use as fallback** |
| `reviews` | ✅ | ❌ No | **POLICY: Never fetch or display** |

### Voice Engine / SaikoAI — Generated Content

| Field | Stored? | Displayed? | Notes |
|-------|---------|------------|-------|
| `tagline` | ✅ | ✅ | Hero section |
| `tagline_candidates` | ✅ | ❌ | Admin-only alternatives |
| `tagline_pattern` | ✅ | ❌ | Generation strategy |
| `tagline_generated` | ✅ | ❌ | Timestamp |
| `tagline_signals` | ✅ | ❌ | Signal snapshot (JSON) |
| `ad_unit_type` | ✅ | ❌ | Internal merchant classification |
| `ad_unit_override` | ✅ | ❌ | Manual classification flag |
| `pull_quote` | ✅ | ✅ | Coverage Card |
| `pull_quote_source` | ✅ | ✅ | Coverage attribution |
| `pull_quote_author` | ✅ | ✅ | Coverage attribution |
| `pull_quote_url` | ✅ | ✅ | **Make quote clickable** |
| `pull_quote_type` | ✅ | ❌ | Internal only |
| `vibe_tags` | ✅ | ✅ | Secondary content |
| `tips` | ✅ | ✅ | Secondary content |
| `description` | ✅ | ✅ | "Best For" card |

### Internal Database — Saiko-Specific

| Field | Stored? | Displayed? | Notes |
|-------|---------|------------|-------|
| `chef_recs` (JSON) | ✅ | ❌ | **Internal only — not customer-facing** |
| `restaurant_group_id` | ✅ | ✅ | Display as badge/link |
| `RestaurantGroup.name` | ✅ | ✅ | Group name |
| `RestaurantGroup.description` | ✅ | ❌ | Available for group pages |
| `RestaurantGroup.website` | ✅ | ✅ | Group link |
| `PersonPlace` relationships | ✅ | ❌ | Internal only |
| `intent_profile` | ✅ | ✅ (internal) | Drives Primary Action Set |
| `intent_profile_override` | ✅ | ✅ (internal) | Manual profile flag |
| `reservation_url` | ✅ | ✅ | Primary Action Set |
| `status` | ✅ | ✅ | Status banner logic |
| `sources.trust_level` | ✅ | ❌ | Internal quality signal |
| `sources.published_at` | ✅ | ❌ | Coverage recency |

---

## Additions to Implement

### High Priority (Ship Next)

| Addition | Data Source | Location | Effort |
|----------|-------------|----------|--------|
| **Pull Quote Clickable** | `pull_quote_url` (stored) | Coverage Card | Low |
| **Status Banner** | `status` enum (stored) | Hero overlay | Low |
| **Restaurant Group Badge** | `restaurant_group_id` (stored) | Hero section | Low |
| **Service Options** | `delivery`, `takeout`, `dine_in` (fetch) | Service row or meta | Medium |
| **Accessibility Indicator** | `wheelchair_accessible_entrance` (fetch) | Meta or service row | Medium |

### Medium Priority (Next Phase)

| Addition | Data Source | Location | Effort |
|----------|-------------|----------|--------|
| **Secondary Hours** | `secondary_opening_hours` (fetch) | Hours card expandable | Medium |
| **Google Maps Direct Link** | `url` (fetch) | Map card href | Low |
| **Reservable Flag** | `reservable` (fetch) | Inform Primary Actions | Low |

### Deferred (Future Consideration)

| Addition | Notes |
|----------|-------|
| Meal service tags | Nice-to-have, low priority |
| Beverage tags | Nice-to-have, low priority |
| Extended photo gallery | Performance/UX considerations |

### Explicitly Not Implementing

| Item | Reason |
|------|--------|
| Google rating display | **Policy: No ratings** |
| Review count display | **Policy: No ratings** |
| Google reviews | **Policy: No ratings** |
| Star distribution | **Policy: No ratings** |
| Google editorial_summary | **Policy: No fallback content** |
| Chef Recs display | **Internal feature only** |

---

## Edge Cases

### Coverage Card Edge Cases

| Scenario | Behavior |
|----------|----------|
| Has pull quote + source + URL | Quote is clickable, source below |
| Has pull quote, no URL | Quote displays, not clickable |
| Has pull quote, no author | Show source only ("— The Infatuation") |
| Has sources only, no quote | Display source list (capped at 3-4, "More →" if needed) |
| Long quote + long attribution | Clamp quote to 4 lines, attribution to 1 line |
| No coverage data at all | **Coverage card doesn't render** |

### Editorial Tier Edge Cases

| Scenario | Behavior |
|----------|----------|
| Coverage + Curator's Note | Both render side-by-side (4-col + 2-col) |
| Coverage only | Coverage expands to 6-col |
| Curator's Note only | Curator's Note expands to 6-col |
| Neither exists | **Editorial tier doesn't render — no fallback** |

### Status Precedence

```
1. Internal status (highest priority)
   - COMING_SOON → "Opening Soon" banner
   - CLOSED → "Permanently Closed" banner  
   - TEMPORARILY_CLOSED → "Temporarily Closed" banner

2. Google business_status (fallback)
   - CLOSED_TEMPORARILY → "Temporarily Closed"
   - CLOSED_PERMANENTLY → "Permanently Closed"

3. Google open_now (real-time)
   - Only applies if Status = OPEN and business_status = OPERATIONAL
```

**Rule:** Never show conflicting status. Internal always wins.

---

## Data Freshness

### Refresh Rules

| Trigger | Action |
|---------|--------|
| Page view + `cached_at` > 7 days | Refresh Google Places data |
| Manual admin action | Force refresh |
| Weekly cron | Sweep all active places |

### Staleness Indicator

If `places_data_cached_at` > 14 days, consider showing subtle "Info may be outdated" indicator.

---

## Summary

### Data Philosophy

**Saiko is editorial, not aggregated.**

Trust comes from:
1. **Coverage Card** — External editorial voice (publications)
2. **Curator's Note** — Internal curator voice (map creator)

Trust does NOT come from:
- Star ratings
- Review counts
- User-generated reviews
- Algorithmic summaries

### Quick Reference

| Category | Display? |
|----------|----------|
| Google rating/reviews | ❌ Never |
| Pull quotes from press | ✅ Yes (clickable) |
| Curator notes | ✅ Yes |
| Source attributions | ✅ Yes |
| Chef recommendations | ❌ Internal only |
| Restaurant group | ✅ Yes |
| Service options | ✅ Yes (fetch needed) |
| Accessibility | ✅ Yes (fetch needed) |

---

## v2.1 Clarifications (LOCKED)

These rules resolve ambiguities and prevent implementation drift.

### Editorial Tier Layout

| Card | Width | Notes |
|------|-------|-------|
| Coverage Card | 4-col | External voice — deserves more width |
| Curator's Note | 2-col | Personal voice — compact, conversational |

**Rules:**
- If one is missing, the other expands to 6-col
- Never render more than two cards in Editorial tier
- 4+2 asymmetry is intentional (trust hierarchy)

### Instagram Placement

- Instagram appears **only** in Primary Action Set
- If not present in Primary Action Set, it does not render anywhere
- ~~Editorial Tier~~ — removed, was incorrectly listed in v2

### Hours Constraints

- Hours lives only in the Facts tier
- Hours never spans multiple tiers
- Hours never dictates the height of Editorial or Utility tiers
- Secondary hours render only inside expandable Hours content
- **Hours is never a vertical anchor and never spans rows outside the Facts tier**

### Utility Intent

| Card | Intent | Notes |
|------|--------|-------|
| Directions | Action | Lives in Primary Action Set |
| Map | Reference | Lives in Utility tier |

**Rule:** The Map card must never include a primary "Get Directions" CTA. Clicking the map opens Expanded Map View (reference), not navigation (action). Map must not visually compete with Primary Action Set.

### Restaurant Group Badge

**Guarded display — not automatic.**

Display only when:
- Group has navigable context (Saiko group page exists), OR
- Group provides clarifying context (e.g., "sister restaurant to X")

Do NOT display when:
- It would function as prestige signaling
- Group is large enough to feel like brand endorsement without context

### Data Freshness Indicator

**Deterministic rule:**
- If `places_data_cached_at` > 14 days → show indicator
- Location: Inside Hours expanded view OR Map card footer
- **Never** in Hero, **never** in Meta row

---

## Corrected Data Usage (v2.1)

### Instagram — MOVED

**Previous location (v2):** Listed under Editorial Tier  
**Correct location:** Decision Tier → Primary Action Set only

### Current Data Usage (Corrected)

#### Decision Tier
- ✅ **Primary Action Set** (Directions/Call/Instagram/Share per intent profile)
- ✅ **Reservation URL** (Manual/scraped, Decision Onset)
- ✅ **Instagram** (Google Places or manual) — **MOVED HERE from Editorial**

#### Editorial Tier
- ✅ **Curator's Note** (MapPlace.descriptor) — 2-col
- ✅ **Coverage** (Pull Quote OR Excerpt OR Source list) — 4-col
- ~~Instagram~~ — **REMOVED, now in Decision Tier**

---

**Status:** Audit Complete (v2.1)  
**Policy Locked:** No Google Ratings  
**Clarifications Locked:** Editorial layout, Instagram placement, Hours constraints, Utility intent, Restaurant Group guardrails  
**Date:** February 9, 2026
