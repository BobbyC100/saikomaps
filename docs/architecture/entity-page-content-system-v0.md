---
doc_id: ARCH-ENTITY-PAGE-CONTENT-SYSTEM-V0
doc_type: problem-framing
status: DRAFT
owner: Bobby Ciccaglione
created: 2026-03-20
last_updated: 2026-03-23
layer: Traces / Fields boundary
depends_on:
  - ARCH-ENRICHMENT-MODEL-V1
  - TRACE-PLACE-PAGE-DESIGN-V1
  - SKAI-DOC-FIELDS-ENRICHMENT-MODEL-V1
  - ARCH-OFFERING-PROGRAMS-UNIFIED-V1
---

# Entity Page Content System — Problem Framing v0

> **Status:** DRAFT — Problem framing, not a spec. Intended to map the current state, name the tensions, and frame design questions for Bobby's review.

---

## 1. What This Doc Is

The entity page has grown through incremental additions. Each feature — offering programs, SceneSense, taglines, pull quotes, voice descriptors, identity signals, coverage sources, recognitions — was added as its own section, tested against restaurant-shaped data, and shipped.

The result works well for a richly enriched restaurant. It works less well for a thinly enriched restaurant. It doesn't work naturally for a park, a coffee shop with no food program, or a mobile vendor.

This doc maps what we have, names the tensions, and frames the questions that need answering before we design a flexible content system.

---

## 2. The Two Axes of Variation

The entity page must flex along two independent dimensions:

### Axis 1: Enrichment Depth

How much interpretation data exists for a given entity.

| Tier | What it looks like | Approximate signals |
|---|---|---|
| **Super-enriched** | Full offering programs (food, wine, cocktail, beer, coffee, service), SceneSense (atmosphere + energy + scene), voice descriptor, tagline, pull quote w/ attribution, curator note, coverage sources, recognitions, identity signals (personality, signature dishes, key producers, origin story), photos | 25+ interpretation fields populated |
| **Solid middle** | Identity resolved, hours, basic offering (cuisine type, maybe 1–2 program maturity values), description (website or synthesis), maybe a tagline. No curator note, no SceneSense, no pull quote. | 8–12 fields populated |
| **Thin** | INGESTED status. Name, address, maybe hours. No interpretation data. Google Places basics only. | 3–5 fields populated |

The page currently handles depth variation through **silent collapse**: if a field is null, its section doesn't render. This works mechanically but creates problems:

- A super-enriched page has 8–10 sections in the main column. A thin page has 1–2. The visual rhythm and page proportions shift dramatically.
- The sidebar (atmosphere, energy, scene, links) may be completely empty for thin entities, leaving a blank right column.
- Section headers ("Offering", "Coverage", "Curator Note") pile up on rich pages without clear hierarchy between them. Which sections are primary? Which are supplemental?

### Axis 2: Entity Type

What kind of place this is, which determines what data is *relevant*.

| Vertical | Data that matters | Data that doesn't apply |
|---|---|---|
| **EAT** (restaurant) | Food/wine/cocktail/beer programs, cuisine posture, service model, reservations, signature dishes, key producers, menu URL | Amenities, facilities, parent/child relationships |
| **COFFEE** | Coffee/tea program, maybe pastry. Atmosphere matters a lot. | Wine program, cocktail program, reservations (usually) |
| **DRINKS** (bar) | Cocktail/beer/wine programs, atmosphere, energy. Hours matter differently (late-night). | Food program depth is secondary. Cuisine posture rarely applies. |
| **PARKS** | Amenities, facilities, parent/child relationships, hours, transit. Atmosphere still relevant. | All offering programs, cuisine, reservations, menu URL, wine list |
| **SHOP** | What they sell, hours, website. | All food/drink programs, reservations |
| **CULTURE** (museum, gallery) | Hours, admission, events. Description matters more. | Food/drink programs, cuisine |
| **BAKERY / PURVEYORS** | Food program (narrow), specialties. More like a shop than a restaurant. | Full beverage programs, reservations |
| **ACTIVITY** | Schedule, description, location. May be mobile/pop-up. | All standard venue assumptions |

The current page handles type variation through **two mechanisms**:
1. The same silent collapse (irrelevant null fields don't render)
2. A parks-specific conditional block (amenities, facilities, parent park) that only renders when `primaryVertical === 'PARKS'`

This means a COFFEE entity renders the same page template as an EAT entity — it just has fewer sections because wine/cocktail programs are null. There's no type-aware content prioritization.

---

## 3. Current Content Inventory

Every interpretation layer field that can appear on the entity page, grouped by source system.

### 3.1 Identity Zone (above the fold)

| Field | Source | Renders as | Restaurant | Park | Coffee |
|---|---|---|---|---|---|
| `name` | entities table | H1 title | ✓ always | ✓ always | ✓ always |
| Identity subline | `getIdentitySublineV2()` — composed from vertical + neighborhood + cuisine | Structural sentence below title | ✓ "French restaurant in Silver Lake" | ✓ "Public park in Echo Park" | ✓ "Coffee shop in Los Feliz" |
| `tagline` | interpretation_cache (TAGLINE) → entities fallback | Italic serif lede | ✓ when enriched | ✓ when enriched | ✓ when enriched |
| Open state + energy | `getOpenStateLabelV2()` + scenesense.atmosphere[0] | Status line: "Open now — Warm and bustling" | ✓ when hours + scenesense exist | ? hours exist but energy may not | ✓ when hours + scenesense exist |
| Business status banner | entities.businessStatus | Banner: "Temporarily closed" | ✓ conditional | ✓ conditional | ✓ conditional |

### 3.2 Primary CTAs

| Field | Source | Renders as | Restaurant | Park | Coffee |
|---|---|---|---|---|---|
| `reservationUrl` | reservation_provider_matches → entities fallback | "Reserve on Resy ↗" | ✓ when present | ✗ irrelevant | ✗ rare |
| `website` | entities table | "Website ↗" | ✓ when present | ✓ when present | ✓ when present |
| `instagram` | entities table | "Instagram ↗" | ✓ when present | ? less common | ✓ when present |
| `tiktok` | entities table | "TikTok ↗" | ✓ when present | ✗ rare | ✓ when present |

### 3.3 Main Column — Sections (rendered top to bottom when present)

| Section | Key Fields | Source | Restaurant | Park | Coffee |
|---|---|---|---|---|---|
| **About** | `description`, `originStoryType` | interpretation_cache (VOICE_DESCRIPTOR) → entities.description | ✓ primary | ✓ primary | ✓ primary |
| **Offering** | Offering program sentences | `buildOfferingLines()` from offeringPrograms + offeringSignals | ✓ primary (Food, Wine, Cocktails, Beer, Coffee, Service, Price) | ✗ empty | ✓ partial (Coffee only) |
| **Known For** | `signatureDishes`, `keyProducers` | derived_signals (identity_signals) | ✓ when enriched | ✗ irrelevant | ? rare |
| **Coverage** | `pullQuote`, attribution | interpretation_cache (PULL_QUOTE) → entities fallback | ✓ when enriched | ✗ rare | ✗ rare |
| **Curator Note** | `curatorNote`, `curatorCreatorName` | entities (from map creator) | ✓ when curated | ✓ when curated | ✓ when curated |
| **Tips** | `tips[]` | entities table | ✓ when curated | ? | ? |
| **Amenities** | `amenities[]` | entities.thematicTags (parks only) | ✗ | ✓ primary | ✗ |
| **Facilities** | `parkFacilities[]` | parkFacilityRelationship | ✗ | ✓ when parent park | ✗ |
| **Part of** | `parentPark` | parkFacilityRelationship | ✗ | ✓ when child facility | ✗ |

### 3.4 Sidebar (right column)

| Section | Key Fields | Source | Restaurant | Park | Coffee |
|---|---|---|---|---|---|
| **Atmosphere** | `scenesense.atmosphere[]` | SceneSense engine (PRL ≥ 3) | ✓ when enriched | ? may not fire | ✓ when enriched |
| **Energy** | `scenesense.energy[]` | SceneSense engine (PRL ≥ 3) | ✓ when enriched | ? may not fire | ✓ when enriched |
| **Links** | website, instagram, menu, winelist, tiktok, events URLs | multiple sources | ✓ varies | ✓ minimal | ✓ varies |
| **Scene** | `scenesense.scene[]`, `placePersonality`, price text | SceneSense + derived_signals + offeringSignals | ✓ when enriched | ? | ✓ when enriched |

### 3.5 Photos Section (below two-column body)

| Field | Source | Restaurant | Park | Coffee |
|---|---|---|---|---|
| `photoUrls[]` | entities.photoUrls (curated) + Google Photos fallback | ✓ usually | ✓ sometimes | ✓ usually |
| Hours (utility rail) | entities.hours | ✓ usually | ✓ sometimes | ✓ usually |
| Address (utility rail) | entities.address | ✓ always | ✓ always | ✓ always |
| Phone (utility rail) | entities.phone | ✓ usually | ✗ rare | ✓ sometimes |

### 3.6 Footer (More Maps, Recognitions, Appendix)

| Section | Source | Notes |
|---|---|---|
| More Maps | map_places relation | Universal — appears if entity is on published maps |
| Recognitions | entities.recognitions | Mostly restaurants. Rare for other types. |
| Appendix (References) | Computed from data provenance | Universal — traces sources for every populated section |
| Appendix (Coverage) | coverage_sources table | Mostly restaurants. Growing for other types. |

### 3.7 Empirical Snapshot (2026-03-23)

To reduce "thin" from vibe language to something testable, we ran a corpus audit on active entities (`status IN OPEN, CANDIDATE`), using five page-relevant signals:

- `About` present (voice descriptor or description)
- `Offering` present (offering_programs derived signal)
- `SceneSense` proxy present (energy_scores or place_tag_scores)
- `Coverage` present (alive coverage_sources)
- `Tagline` present (interpretation_cache TAGLINE or entities.tagline)

#### Active Entity Mix by Vertical (n = 1,075)

| Vertical | Count | Share |
|---|---:|---:|
| EAT | 805 | 74.9% |
| CULTURE | 97 | 9.0% |
| SHOP | 69 | 6.4% |
| ACTIVITY | 39 | 3.6% |
| PARKS | 36 | 3.3% |
| STAY | 25 | 2.3% |
| NATURE | 4 | 0.4% |

#### Five-Signal Density Distribution (score 0-5)

| Density score | Entity count | Share |
|---|---:|---:|
| 0 | 123 | 11.4% |
| 1 | 472 | 43.9% |
| 2 | 239 | 22.2% |
| 3 | 132 | 12.3% |
| 4 | 99 | 9.2% |
| 5 | 10 | 0.9% |

#### Candidate Thin Thresholds

| Definition | Thin count | Thin share | Not-thin share |
|---|---:|---:|---:|
| thin = score < 1 | 123 | 11.4% | 88.6% |
| thin = score < 2 | 595 | 55.3% | 44.7% |
| thin = score < 3 | 834 | 77.6% | 22.4% |

Working default for framing: **thin = score < 2**.

Why this is a useful initial cut:
- It cleanly separates the large "0-1 signal" cohort from entities with at least two meaningful content signals.
- It creates a practical split for layout policy experiments (single-column fallback vs full two-column).
- It is rerunnable as enrichment coverage changes, so the threshold can be recalibrated from data instead of opinion.

Note: this snapshot uses a SceneSense **proxy** signal (energy/tag evidence) rather than strict `SCENESENSE_PRL` materialization; strict PRL-gated cuts should be run separately before policy lock.

---

## 4. Named Tensions

### Tension 1: Restaurant Monoculture

The offering composition system (`buildOfferingLines`) is a ~200-line function that produces natural-language sentences from program maturity, signals, and posture data. It handles Food, Wine, Cocktails, Beer, Coffee/Tea, Non-alcoholic, Service, and Price.

This is Saiko's most sophisticated voice system. But it only fires for food/drink verticals. A park page skips the entire Offering section. A culture venue skips it. A shop skips it.

**Question:** Should non-food verticals have their own composition systems? A park's "offering" might be trails, playgrounds, sports facilities. A museum's might be permanent collection, rotating exhibits, admission tiers. Or should Offering remain food/drink-specific and other verticals use different section names entirely?

### Tension 2: Thin Pages Are Hollow

A thinly enriched entity (working definition: five-signal score < 2) renders: title, identity subline, maybe hours, maybe address. No About, no Offering, no sidebar content. The two-column layout creates an empty right column. The page feels skeletal.

**Question:** Should there be a minimum viable page template — a condensed single-column layout that activates when interpretation data is below a threshold? Or should we invest in enriching entities to a baseline before publishing, making thin pages a data problem rather than a design problem?

### Tension 3: Section Hierarchy Is Flat

Every section uses the same `sk-section-header` treatment. About, Offering, Known For, Coverage, Curator Note, Tips — they all look the same. On a rich page, this creates a wall of equally-weighted sections.

**Question:** Should there be a content tier system? Example:
- **Primary content** (About, Offering) — always rendered first, with more visual weight
- **Supporting content** (Known For, Coverage, Curator Note) — rendered with lighter treatment
- **Supplemental** (Tips, Amenities) — compact, utility-level treatment

### Tension 4: Sidebar Depends on SceneSense

The sidebar's primary content (Atmosphere, Energy, Scene) comes from SceneSense, which requires PRL ≥ 3. Entities below that threshold get a sidebar with just Links (and maybe nothing). This means the two-column layout's right column is meaningful only for well-enriched entities.

**Question:** Should the sidebar contain non-SceneSense content for thinner entities (working cut: score < 2)? Candidates: hours (currently duplicated in photo utility rail), address, neighborhood context, transit info. Or should the layout collapse to single-column below that threshold?

### Tension 5: Parks Were Bolted On

Parks have three sections (Amenities, Facilities, Part of) conditionally rendered with `primaryVertical === 'PARKS'` checks. These are the first entity-type-specific sections. But they're not integrated into the content hierarchy — they just append to the bottom of the main column after Tips.

**Question:** Should type-specific content sections have defined positions in the page hierarchy? For a park, Amenities might be the *primary* content (equivalent to Offering for a restaurant). Facilities might be structural (equivalent to Known For). The current implementation treats them as afterthoughts.

### Tension 6: Voice Consistency Across Types

The voice layer (tagline, voice descriptor, identity subline, offering sentences) was tuned for restaurants. The identity subline says "French restaurant in Silver Lake" — clear and useful. For a park it says "Public park in Echo Park" — functional but less informative. For a mobile vendor, what does the subline even say?

**Question:** Does the voice system need vertical-specific phrase templates? Or is the current generic approach good enough with better fallbacks?

### Tension 7: The Appendix Is Universal but the Content Isn't

The appendix (References, Methodology, Coverage) renders for every entity. For a super-enriched restaurant with 6 source groups, it's meaningful provenance documentation. For a thin entity with one source (Google Places), the appendix is mostly empty ceremony.

**Question:** Should the appendix scale with content depth? Render the full three-column appendix only when there's enough provenance to justify it?

---

## 5. Entity Type Data Shape Summary

Based on the schema and API route, here's what each vertical *can* populate vs. what the page *currently renders* for it:

### 5.1 Data Available by Vertical

| Data Domain | EAT | COFFEE | DRINKS | PARKS | SHOP | CULTURE | BAKERY | ACTIVITY |
|---|---|---|---|---|---|---|---|---|
| Offering programs (15 types) | ✓ rich | partial | partial | ✗ | ✗ | ✗ | partial | ✗ |
| Cuisine posture / service model | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Reservation system | ✓ | rare | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| SceneSense (PRL ≥ 3) | ✓ | ✓ | ✓ | ? | ? | ? | ✓ | ? |
| Identity signals (personality, dishes, producers) | ✓ | partial | partial | ✗ | ✗ | ✗ | partial | ✗ |
| Tagline (interpretation_cache) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Voice descriptor (interpretation_cache) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Pull quote | ✓ | rare | rare | rare | rare | possible | rare | rare |
| Coverage sources | ✓ | possible | possible | rare | rare | possible | rare | rare |
| Recognitions | ✓ | rare | rare | ✗ | ✗ | possible | rare | ✗ |
| Amenities | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Facilities / parent-child | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Events / catering URLs | ✓ | ✗ | ✓ | ✗ | ✗ | ✓ | ✗ | ✓ |
| Appearances (pop-ups) | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ |
| Hours | ✓ | ✓ | ✓ | varies | ✓ | ✓ | ✓ | varies |

### 5.2 What's Missing From the Page Today

Fields that exist in the contract but **don't currently render** or render only via conditional bolting:

Provisional priority framing below is for decision support only; final assignment should be owner-reviewed.

| Field | In Contract | Currently Rendered | Priority framing (provisional) | Notes |
|---|---|---|---|---|
| `placeType` ('venue' / 'activity' / 'public') | ✓ | ✗ not used | **Now** | Could drive layout/section decisions |
| `eventsUrl`, `cateringUrl` | ✓ | ✗ not rendered | **Later** | In canonical_entity_state but no page section |
| `eventInquiryEmail`, `eventInquiryFormUrl` | ✓ | ✗ not rendered | **Later** | Hospitality fields with no page home yet |
| `appearancesAsSubject`, `appearancesAsHost` | ✓ | ✗ always empty arrays | **Later** | Pop-up / market vendor support — not wired |
| `transitAccessible` | ✓ | ✗ not rendered on canonical page | **Intentionally omitted (for now)** | Was in MerchantGrid (old bento) but not in two-column layout |
| `recognitions` | ✓ | ✓ rendered | **Now** | Already present; extension beyond EAT is low-lift |
| `marketSchedule` | In LocationData interface | ✗ not rendered | **Later** | For market/pop-up schedules |

---

## 6. Possible Design Directions

Not recommendations — framing options for Bobby to evaluate.

### Direction A: Vertical Page Profiles

Define a "page profile" per vertical that specifies which sections appear, in what order, with what hierarchy. The page template remains one component but it reads from a profile config.

```
EAT profile:    Identity → About → Offering → Known For → Coverage → Curator Note → Tips
PARKS profile:  Identity → About → Amenities → Facilities → Part of
COFFEE profile: Identity → About → Offering (coffee only) → Curator Note → Tips
```

Considerations:
- **Implementation complexity:** low to moderate (mostly config + resolver wiring).
- **Editorial control:** high (explicit ordering/section policy per vertical).
- **UX consistency:** medium (can drift across verticals without guardrails).
- **Time-to-ship:** good for top verticals; slower as long-tail profiles are added.
- **Maintainability:** medium-low over time due to profile sprawl risk.

### Direction B: Content Tiers (Enrichment-Aware)

Instead of vertical-specific profiles, define content tiers based on what's populated. The page renders in tiers:

1. **Identity tier** (always): name, subline, tagline, status, CTAs
2. **Primary tier** (first non-identity content block): About *or* the strongest section available
3. **Detail tier**: Offering, Known For, Amenities, Facilities — whatever applies
4. **Editorial tier**: Coverage, Curator Note, Tips — the outside-voice content
5. **Context tier** (sidebar): Atmosphere, Energy, Scene, Links

The page adjusts density based on how many tiers have content. Thin entities get a compact single-tier layout. Rich entities get the full spread.

Considerations:
- **Implementation complexity:** moderate (tier resolver and fallback behavior).
- **Editorial control:** medium (good for depth handling, weaker for vertical nuance).
- **UX consistency:** high for depth behavior, medium for type-specific expectations.
- **Time-to-ship:** fast for a B-lite version (especially thin-page fallback).
- **Maintainability:** high (single logic path), but depends on good tier definitions.

### Direction C: Hybrid (Profile + Tiers)

Vertical profiles define *which* sections belong at *which* tier. The tier system handles *how* they render based on depth.

```
EAT:    primary = [About, Offering]    detail = [Known For]    editorial = [Coverage, Curator, Tips]
PARKS:  primary = [About, Amenities]   detail = [Facilities]   editorial = [Curator]
COFFEE: primary = [About, Offering]    detail = []             editorial = [Curator, Tips]
```

Considerations:
- **Implementation complexity:** highest (resolver layer + profile schema + tier semantics).
- **Editorial control:** high (explicit type policy with depth-aware rendering).
- **UX consistency:** high when tuned; strongest long-term model.
- **Time-to-ship:** slower initial rollout unless phased.
- **Maintainability:** good after stabilization, but initial cognitive load is high.

Boundary note (pending final call): this resolver should likely live in Traces as rendering policy, while Fields continues to own contract availability and data shape.

### Direction D: Page Variants (Minimal)

Instead of a flexible system, define 2–3 page variants:
- **Venue page** (EAT, COFFEE, DRINKS, BAKERY, PURVEYORS) — current page with polish
- **Public page** (PARKS, NATURE) — redesigned for amenity/facility data
- **Activity page** (ACTIVITY, pop-ups) — schedule-centric, lighter

Considerations:
- **Implementation complexity:** low for first variant split, grows with each divergence.
- **Editorial control:** high within each variant.
- **UX consistency:** medium (consistency within variant, divergence across variants).
- **Time-to-ship:** fast for immediate vertical pain relief.
- **Maintainability:** low-medium long term due to duplication and parallel evolution.

---

## 7. Open Questions for Bobby

1. **Is the two-column layout the right frame for all entity types?** Parks and thin entities don't have sidebar content. Should they be single-column?

2. **Should the Offering section remain food/drink-specific?** Or should we generalize it into a "What's Here" section that renders type-appropriate content (programs for restaurants, amenities for parks, collection info for museums)?

3. **What should a thin page look like?** For entities below the working threshold (`score < 2`), should the canonical fallback be single-column, compact two-column, or another variant?

4. **Should thin entities be publishable at all?** Separate from layout fallback: should there be a publication gate tied to enrichment depth (for example, depth threshold and/or PRL requirements)?

5. **Which direction (A–D) matches your instinct?** Or is there a different framing?

6. **Where do events and hospitality fields live?** `eventsUrl`, `cateringUrl`, `eventInquiryEmail` exist in the contract but have no page section. Is this a near-term addition or future work?

7. **Should mobile vendors / pop-ups get the `appearances` treatment now?** The data model supports it (place_appearances, appearancesAsSubject/Host) but the page renders empty arrays. Is this a priority?

8. **Do you agree with the provisional "Now / Later / Intentionally omitted" framing in Section 5.2?** If not, which fields move tiers first?

9. **Does the CSS rename (`place.css` → `entity.css`) belong in this project or as a standalone housekeeping task?**

---

*Saiko Fields · Entity Page Content System · Problem Framing v0 · 2026-03-20*
