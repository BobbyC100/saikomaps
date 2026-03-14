---
doc_id: ARCH-COVERAGE-TIERS-V1
doc_type: architecture
status: active
owner: Bobby Ciccaglione
created: '2026-03-14'
last_updated: '2026-03-14'
project_id: SAIKO
systems:
  - coverage-operations
  - offering-signals
  - fields-data-layer
  - data-pipeline
related_docs:
  - docs/architecture/coverage-ops-approach-v1.md
  - docs/offering-signals/offering-signals-v1.md
  - docs/offering-signals/beverage-program-vocab-v1.md
  - docs/architecture/identity-scoring-v1.md
  - docs/architecture/social-fields-spec-v1.md
  - docs/scenesense/three-lenses-framework-v1.md
  - docs/scenesense/display-contract-v2.md
  - docs/saikoai-extraction-prompt-v2.1.md
  - docs/ENRICHMENT-OPERATIONS-INVENTORY.md
summary: >-
  Defines the coverage tier model for entity enrichment. Six tiers from raw
  identity through experiential interpretation, with enrichment strategy
  (merchant surfaces first, editorial sources second, human third), entity-type
  signal requirements, and scanner integration points.
---

# Coverage Tiers — Entity Enrichment Model

---

## Purpose

This document defines what "complete coverage" means for an entity in Saiko, how to measure it, and in what order to pursue it.

Coverage is not binary. An entity progresses through tiers of enrichment depth. Each tier adds a layer of understanding — from "this place exists" to "here's what it feels like to be there."

---

## Enrichment Strategy

The enrichment priority order is fixed:

### 1. Merchant-owned surfaces first (the 80% source)

If an entity has a website, we scan it for everything: hours, menu, reservation links, social handles, descriptions, team info, philosophy, beverage programs, service model. Same with Instagram and TikTok — we grab everything useful.

This is the merchant speaking in their own words. It is the highest-fidelity, most authentic source of identity and offering signals.

Merchant-owned surfaces include:
- **Website** — homepage, about, menu, drinks, contact, press pages
- **Instagram** — bio, captions, posting frequency, visual identity
- **TikTok** — bio, content themes, audience engagement
- **Google Places** — hours, phone, address, photos, attributes, business status

If we've thoroughly defined our signal expectations at an entity-type level, merchant surfaces should yield 80% of what we need.

### 2. Approved editorial sources second

Auto-search approved publications for media coverage of the entity. This fills in what the merchant doesn't say about themselves: critical reception, awards, press mentions, pull quotes.

Approved sources include:
- Eater LA
- LA Times Food
- The Infatuation
- Michelin Guide
- Bon Appetit
- Timeout

Editorial coverage provides:
- Pull quotes and critical voice
- Awards and recognition signals
- Cultural positioning
- Trend and moment context

### 3. Human fills the gaps

The remaining 10-20% that can't be automated:
- Confirming "none" for fields that don't apply (taco cart with no website)
- Adding coverage links from niche or non-indexed sources
- Resolving ambiguous duplicates
- Correcting misattributed data
- Adding curator notes and contextual connections

---

## The Six Tiers

### Tier 1 — Identity & Location

**What it answers:** "Can this entity exist on a map?"

| Signal | Source | Required? |
|--------|--------|-----------|
| Name | Intake | Yes |
| Coordinates (lat/lng) | Google Places / manual | Yes (blocking) |
| Address | Google Places | Yes |
| Neighborhood | Derived from coords | Yes |
| Google Place ID | Google Places API | No (see identity scoring) |
| Phone | Google Places / website | No |
| Website | Discovery / manual | No |
| Instagram | Discovery / website | No |
| TikTok | Discovery / website | No |

**Scanner issue types:** `unresolved_identity`, `missing_coords`, `missing_neighborhood`, `missing_phone`, `missing_website`, `missing_instagram`, `missing_tiktok`, `potential_duplicate`

**Resolution tools:** Google Places lookup, social discovery, GPID resolver, neighborhood derivation

**Key principle:** GPID is not required for identity. Weighted anchor scoring determines identity completeness. Taco carts and mobile vendors can reach publication threshold without a Google Places listing. See `docs/architecture/identity-scoring-v1.md`.

**Status:** Fully implemented in Coverage Ops.

---

### Tier 2 — Operational Facts

**What it answers:** "Can a user decide to visit?"

| Signal | Source | Entity types |
|--------|--------|-------------|
| Hours | Google Places / website | All with fixed location |
| Price level | Google Places / menu | Restaurants, bars, cafes |
| Cuisine type | Website / editorial | Restaurants |
| Category | Google Places / manual | All |
| Business status (open/closed) | Google Places / manual | All |
| Reservation URL | Website scan | Restaurants with reservations |
| Menu URL | Website scan | Restaurants, bars, cafes |

**Scanner issue types (planned):** `missing_hours`, `missing_price_level`, `missing_cuisine`, `google_says_closed`, `temp_closed`, `perm_closed`

**Resolution tools:** Stage 1 (Google Places backfill), website enrichment (Stage 6)

**Key principle:** Operating status (temp/perm closed) should be auto-detected from Google Places `businessStatus` field AND manually overridable from Coverage Ops.

**Status:** Partially implemented. Hours and price level come from Google Places. Operating status detection and cuisine classification need scanner integration.

---

### Tier 3 — Surface Evidence

**What it answers:** "Do we have raw source material to work with?"

| Signal | Source | Purpose |
|--------|--------|---------|
| Homepage captured | Website crawl | Foundation for all website-derived signals |
| Menu page captured | Website crawl | Food and beverage signal extraction |
| About page captured | Website crawl | Identity, team, philosophy extraction |
| Instagram profile captured | IG API | Merchant voice, temporal signals |
| TikTok profile captured | TikTok discovery | Merchant voice, content themes |
| Social links extracted | Website scan | Cross-reference social handles |
| Reservation provider detected | Website scan | Resy, OpenTable, Tock, SevenRooms |
| Ordering provider detected | Website scan | Toast, ChowNow, Square, DoorDash |

Storage: `merchant_surfaces` (immutable evidence), `merchant_surface_artifacts` (parsed outputs), `merchant_signals` (best-effort synthesis)

**Scanner issue types (planned):** `no_surfaces`, `surfaces_stale`, `surfaces_unparsed`

**Resolution tools:** ERA Stage 2 (surface discovery), Stage 3 (surface fetch), Stage 4 (surface parse)

**Key principle:** Surfaces are immutable evidence records. Never update — always append new rows. This preserves the audit trail and enables re-extraction when prompts improve.

**Status:** ERA pipeline handles this for entities with websites. Scanner does not yet flag surface-level issues.

---

### Tier 4 — Offering Signals

**What it answers:** "What does this place serve and how?"

Three-layer model (see `docs/offering-signals/offering-signals-v1.md`):

**Food Signals:**
- `cuisine_posture` — broad culinary identity
- `menu_format` — tasting menu, a la carte, counter
- `cooking_method` — wood-fired, raw bar, live-fire
- `dish_focus` — pasta, seafood, charcuterie
- `ingredient_focus` — seasonal produce, dry-aged beef
- `meal_focus` — dinner-only, all-day, brunch

**Beverage Signals** (see `docs/offering-signals/beverage-program-vocab-v1.md`):
- 5 program containers: `wine_program`, `beer_program`, `cocktail_program`, `non_alcoholic_program`, `coffee_tea_program`
- Each with maturity scale: `none` / `incidental` / `considered` / `dedicated` / `unknown`
- 25+ locked signal vocabulary items across all programs

**Service Signals:**
- `reservation_model` — required, recommended, not taken
- `walk_in_policy` — counter walk-in, bar only
- `seating_format` — counter, communal, table service
- `sharing_style` — sharing-forward, individual plates
- `pacing_style` — courses-driven, guest-controlled

**Priority tiers within offering signals:**
- **Tier 1 (Identity):** cuisine_posture, wine_program_intent, reservation_model — extracted first, required before lower tiers
- **Tier 2 (Distinctive):** wine_region_focus, cooking_method, cocktail_program — differentiates within category
- **Tier 3 (Detail):** ingredient_focus, pacing_style, sharing_style — rendered only in expanded contexts

**Stop-Early Rule:** If one Tier 1 signal at confidence >= 0.7 and one or two Tier 2 signals at confidence >= 0.6, stop crawling additional sources.

**Scanner issue types (planned):** `missing_offering_identity`, `thin_offering_signals`, `offering_signals_stale`

**Status:** Signal vocabulary locked. Extraction prompt exists (`saikoai-extraction-prompt-v2.1.md`). Programs exist in place-page contract but not yet materialized in DB storage. Phase 3 of Fields v2.

---

### Tier 5 — Editorial Coverage

**What it answers:** "What has been written about this place?"

| Signal | Source | Purpose |
|--------|--------|---------|
| Coverage source links | Editorial search / manual | Press mentions, reviews, features |
| Pull quote | Editorial extraction | Critical voice highlight |
| Pull quote author/source | Editorial extraction | Attribution |
| Description | Website / editorial / synthesis | Place narrative |
| Awards / recognition | Editorial extraction | Credibility signals |

Storage: `coverage_sources` (links), entity fields (pull quote, description)

**Scanner issue types (planned):** `thin_editorial_coverage`, `no_pull_quote`, `missing_description`

**Resolution tools (planned):** Editorial source auto-search against approved publications

**Key principle:** Editorial coverage is the merchant story told by others. It complements the merchant's own voice (Tier 3-4) with external validation and critical perspective.

**Status:** `coverage_sources` table exists. Manual entry possible. Auto-search against approved sources not yet built. Scanner does not yet flag editorial thinness.

---

### Tier 6 — Experiential Interpretation (SceneSense)

**What it answers:** "What does it feel like to be there?"

Three Universal Lenses (see `docs/scenesense/three-lenses-framework-v1.md`):

**Atmosphere Lens** — physical/sensory environment:
- Lighting, noise, spatial scale, seating density, comfort, indoor/outdoor

**Energy Lens** — activity level & temporal rhythm:
- Crowd intensity, movement, service tempo, busy windows, daypart shifts
- Backed by `energy_scores` table with component breakdown

**Scene Lens** — social patterns & behavioral expectations:
- Group size, social roles, dining occasions, formality, social register

**Place Relevance Level (PRL):**
- 1-4 scale measuring cultural significance and relevance
- Can be computed or manually overridden (`prlOverride`)

**Behavioral Tag Scores:**
- `cozy_score`, `date_night_score`, `late_night_score`, `after_work_score`, `scene_score`
- Float 0-1, versioned, dependency-tracked

Storage: `interpretation_cache` (SCENESENSE_PRL output type), `energy_scores`, `place_tag_scores`

**Scanner issue types (planned):** `missing_scenesense`, `scenesense_stale`, `missing_prl`

**Status:** Framework fully specified across 6 docs. Display contract v2 aligned to revised 3-lens model. Energy scores computed for enriched entities. Full SceneSense extraction pipeline not yet wired to Coverage Ops.

---

## Entity-Type Signal Requirements

Not every entity type needs every signal. A taco cart doesn't need a wine program assessment. A hotel doesn't need cuisine_posture.

### Restaurant (full-service)

**Required:** Name, coords, neighborhood, hours, price level, cuisine type, reservation model
**Expected:** Website, Instagram, menu URL, description, at least 1 editorial source, food program identity, beverage program assessment
**Nice-to-have:** TikTok, pull quote, SceneSense, tag scores

### Street food / Taco cart / Mobile vendor

**Required:** Name, coords (or appearance locations), neighborhood
**Expected:** Instagram OR TikTok, cuisine type, meal focus
**Confirmed-none common:** Website, phone, reservation URL, wine program
**Special:** `place_appearances` for location tracking, `marketSchedule` for schedule

### Bar / Wine bar

**Required:** Name, coords, neighborhood, hours
**Expected:** Website, Instagram, beverage program assessment (especially wine/cocktail), reservation model
**Nice-to-have:** TikTok, editorial coverage, SceneSense

### Coffee shop / Cafe

**Required:** Name, coords, neighborhood, hours
**Expected:** Website, Instagram, coffee/tea program assessment
**Nice-to-have:** Food program (if substantial), TikTok

### Hotel

**Required:** Name, coords, neighborhood, website, phone
**Expected:** Instagram, reservation URL, description, price level
**Different signals:** Room count, amenities, check-in/out, on-site dining (via entity relationships)

### Activity / Venue (non-food)

**Required:** Name, coords, neighborhood
**Expected:** Website, Instagram, description, hours
**Not applicable:** Most food/beverage signals

---

## Scanner Integration

The issue scanner (`lib/coverage/issue-scanner.ts`) should evolve to check coverage depth per tier:

### Current (Tier 1 only)
- `unresolved_identity` — no GPID
- `missing_coords` — no lat/lng (blocking)
- `missing_neighborhood` — no neighborhood
- `missing_phone` — no phone
- `missing_website` — no website
- `missing_instagram` — no Instagram
- `missing_tiktok` — no TikTok
- `potential_duplicate` — fuzzy name/GPID/social match

### Next phase (Tier 2)
- `missing_hours` — no hours data
- `missing_price_level` — no price level (restaurants only)
- `missing_cuisine` — no cuisine type (restaurants only)
- `google_says_closed` — Google businessStatus indicates closure
- `operating_status_unknown` — no businessStatus data

### Future (Tiers 3-6)
- `no_surfaces` — no merchant surfaces captured
- `thin_offering_signals` — entity type expects offering signals but none present
- `thin_editorial_coverage` — zero or few coverage sources
- `missing_description` — no description from any source
- `missing_scenesense` — no SceneSense interpretation cached
- `missing_prl` — no PRL assigned

### Entity-type-aware severity

Issue severity should be influenced by entity type:
- `missing_website` is MEDIUM for a restaurant but should be LOW (or suppressed) for a taco cart
- `missing_instagram` is LOW for a hotel but MEDIUM for a street food vendor (IG is their primary channel)
- `thin_offering_signals` is HIGH for a full-service restaurant but irrelevant for an activity venue

---

## Measuring Coverage Completeness

Coverage completeness is a per-entity percentage based on entity type signal requirements.

```
completeness = signals_present / signals_expected_for_entity_type
```

This enables:
- Coverage dashboard showing "72% of restaurants have Tier 1 complete"
- Per-entity coverage score visible in admin
- Bulk actions targeting entities below a threshold

Completeness bands:
- **Publishable** (Tier 1 complete) — entity can appear on maps
- **Useful** (Tiers 1-2 complete) — user can make a visit decision
- **Rich** (Tiers 1-4 complete) — full offering story in merchant's words
- **Complete** (Tiers 1-6 complete) — experiential interpretation available

---

## Relationship to Existing Systems

| System | Role in coverage |
|--------|-----------------|
| ERA Pipeline (`scripts/enrich-place.ts`) | Executes enrichment stages 1-7 per entity |
| Issue Scanner (`lib/coverage/issue-scanner.ts`) | Detects coverage gaps, creates `entity_issues` |
| Coverage Ops UI (`/admin/coverage-ops`) | Operator triage board for resolving issues |
| Website Enrichment (`lib/website-enrichment/`) | Extracts signals from merchant websites |
| SaikoAI Extraction Prompt | AI prompt for parsing surface text into signals |
| Fields v2 (`observed_claims` → `canonical_entity_state`) | Sanctioned ground truth for extracted signals |
| Interpretation Cache | Versioned AI-generated editorial outputs |
| SceneSense Framework | Experiential interpretation model |

---

## What's Not Covered Here

- **Rendering rules** — how signals become UI text (see `docs/voice/saiko-voice-layer.md`)
- **SceneSense interpretation logic** — how raw signals become atmosphere/energy/scene descriptors (see SceneSense docs)
- **Signal freshness decay** — time-weighted confidence penalties (planned for Offering Signals v2)
- **Consumer-facing coverage indicators** — whether/how to show coverage depth to end users
