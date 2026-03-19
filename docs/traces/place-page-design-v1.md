---
doc_id: SKAI-DOC-TRACES-PLACE-PAGE-DESIGN-001
doc_type: traces
status: active
owner: Bobby Ciccaglione
created: 2026-03-11
last_updated: 2026-03-17
project_id: PLACE-PAGE
systems:
  - place-page
  - enrichment-pipeline
  - scenesense
related_docs:
  - SKAI-DOC-TRACES-BEVERAGE-PROGRAM-VOCAB-001
  - SKAI-DOC-SS-001
  - SKAI-DOC-TRACES-WO-ABOUT-001
summary: Canonical design spec for the Saiko place profile page — wireframe, data sources, content model, and rendering rules.
---

# Place Page Design v1

## 1. Purpose

Define the canonical layout, data contract, content model, and rendering rules for the entity profile page so that:
- Every enrichment signal has a clear home (or is explicitly excluded)
- The page degrades gracefully when data is sparse
- Design decisions are documented and durable

## 2. Layout

### 2.1 Structure

Two-column layout from the top. No hero image.

- **Left column (~60%)**: Identity + primary CTAs + editorial content
- **Right column (~40%)**: Structured facts rail (hours, address, links, SceneSense)
- **Below columns (full-width)**: Photos → More Maps → References

### 2.2 Wireframe

┌─────────────────────────────────┬──────────────────────────┐
│  {Name}            (lg serif)   │                          │
│  {Identity Line}                │  (softened — right col   │
│  {Tagline}  (italic serif)      │   starts below identity) │
│  {Open/Closed state}            │                          │
│                                 │                          │
│  Reserve ↗  Website ↗           │                          │
│  Instagram ↗  TikTok ↗          │                          │
│  ───────────────────────────────│──────────────────────────│
│                                 │  HOURS                   │
│  ABOUT                          │  {formatted hours}       │
│  {description}                  │──────────────────────────│
│  ───────────────────────────────│  ADDRESS                 │
│  OFFERING                       │  {address}  Map ↗        │
│  Food / Wine / Service / Price  │──────────────────────────│
│  ───────────────────────────────│  LINKS                   │
│  COVERAGE NOTE                  │  Website ↗ Instagram ↗   │
│  {pull quote + attribution}     │  Menu ↗                  │
│  ───────────────────────────────│──────────────────────────│
│  TIPS                           │  SCENE                   │
│  · tip 1  · tip 2              │  {scene tags}            │
│                                 │──────────────────────────│
│                                 │  ATMOSPHERE              │
│                                 │  {atmosphere tags}       │
│                                 │──────────────────────────│
│                                 │  AMBIANCE                │
│                                 │  {ambiance tags}         │
└─────────────────────────────────┴──────────────────────────┘
  PHOTOS [grid — collapses if none]
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  MORE MAPS [3 map cards, centered — collapses if none]
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  REFERENCES

### 2.3 Right Column Softening

Right column has an empty spacer at the top so the place name dominates. Right column content starts at the same vertical level as the first light rule below the primary CTAs.

### 2.4 Rule Hierarchy

Two tiers:
- **Heavy rule (3px)**: separates major zones — columns→photos, photos→more maps, maps→references. Plain line, no title.
- **Labeled divider (1px)**: separates blocks within each column. Section title centered inline with the 1px line, rule extends on both sides. Editorial/magazine feel.
- **No rule** between items inside a block (individual offering lines, individual tips, individual coverage sources).

## 3. Content Model (LOCKED)

### 3.1 Three Voices — Never Merge

The place page combines up to three distinct narrative voices:

| Voice | Section | Source | Purpose | Tone | Status |
|-------|---------|--------|---------|------|--------|
| **Merchant** | ABOUT | Website about, IG bio, merchant text; synthesized if absent | "What is this place?" | Upbeat, descriptive, slightly enticing, neutral-to-positive | Implement now |
| **External media** | COVERAGE NOTE | LA Times, Eater, Michelin, etc. (coverage_sources) | "Why is this place notable?" | Direct quote, attributed, 1-2 lines max | Implement now |
| **Saiko** | Tagline | AI editorial layers (interpretation_cache TAGLINE via Voice Engine v2) | Saiko's own editorial voice | Confident, understated, cool | Tagline rendered below identity subline |

These voices must never merge. ABOUT and Coverage Note are always separate sections.

### 3.2 ABOUT — Merchant Voice (Identity Layer)

**Purpose**: Introduces the place in the merchant's voice. Most important text block on page.

**Source hierarchy**:
1. Merchant-authored text (website about section, homepage intro, IG bio, pinned captions, manifesto)
2. Synthesized by Saiko from available signals (name, category, menu signals, known dishes, location context) when no merchant text exists — written in merchant style

**Tone**: Upbeat, descriptive, slightly enticing. Neutral-to-positive. NOT salesy, not marketing language, not exaggerated.

**Length**: ~40-80 words (compact identity paragraph, not a long story).

**Visual treatment**: Most important text block — visually distinct. Drop-cap first letter, serif typography, slightly larger line height, inset spacing.

**Implementation**: VOICE_DESCRIPTOR pipeline (WO-ABOUT-001) implements a 3-tier generation hierarchy stored in interpretation_cache:
- **Tier 1 (verbatim-v1)**: Extracted from merchant surface artifacts — coherence-filtered, quality-scored
- **Tier 2 (about-synth-v1)**: AI-synthesized from merchant text blocks in the merchant's voice
- **Tier 3 (about-compose-v1)**: AI-composed from structured signals when no merchant text exists

**Read path**: API reads VOICE_DESCRIPTOR from interpretation_cache (is_current=true), falls back to entities.description. Page renders with descriptionSource label for provenance.

**Current data**: entities.description has 5/143 (short one-liners, hand-seeded). Merchant surface text exists in merchant_surface_artifacts for enriched entities. VOICE_DESCRIPTOR pipeline ready for batch execution.

### 3.3 COVERAGE NOTE — External Media Voice (Cultural Validation)

**Purpose**: Surfaces a short quote from trusted editorial/media coverage. "Why is this place notable?"

**Source**: coverage_sources table (LA Times, Eater, Michelin, etc.) + pull quote fields.

**Format**: One sentence (preferred), max two short lines. Direct quotes whenever possible. Always attributed. Source name links to pullQuoteUrl when available.

**Example**: "The best tortillas in Los Angeles." — LA Times

**Not**: ratings, reviews, user comments, popularity metrics. Trusted cultural signals only.

**Naming**: "Curator's Note" is misleading (implies Saiko editorial). Options: Coverage Note, Press Note, In the Press, What They Say. TBD.

### 3.4 Identity Line (Structural Layer)

**Purpose**: Canonical structural description of the place. Sits directly under the name.

**Source**: Assembled from `primaryVertical`, `wine_program_intent`, `cuisine_posture`, `cuisineType`, `service_model`, `neighborhood` by evolved `getIdentitySublineV2()`.

**Model**: `[Offering] [Format] [and Secondary Format] in [Neighborhood]`

**Examples**:
- "Natural wine bar and daytime café in Silver Lake"
- "French restaurant in the Arts District"
- "Wood-fired bakery in Venice"

**Tone**: Calm, precise, industry-native, guidebook-like. Uses hospitality vocabulary, not invented terms. 6–12 words.

**Fallback**: If only format + neighborhood → "Restaurant in Silver Lake"

### 3.5 Reading Flow

Name → Identity Line (structural) → Tagline (Saiko editorial voice) → ABOUT (identity/merchant voice) → Coverage Note (credibility)

This moves the user from structure → identity → validation.

### 3.6 Structured Content (Left Column)

| Section | Data Source | Collapse Rule |
|---------|-----------|---------------|
| Business status banner | entities.business_status | Hide if OPERATIONAL or null |
| Identity (name, identity line, open state) | entities + evolved getIdentitySublineV2() | Name always shown |
| Tagline | interpretation_cache (TAGLINE) with entities.tagline fallback | Hide if null |
| Primary CTAs (Reserve, Website, Instagram, TikTok) | reservation_url, website, instagram, tiktok | Hide if all null |
| ABOUT | Merchant text (entities.description, merchant surfaces, or synthesized) | Hide if null |
| Offering | derived_signals (identity_signals + offering_programs) | Hide if all null |
| Coverage Note | coverage_sources + pull quote | Hide if empty |
| Tips | entities.tips | Hide if empty array |

### 3.7 Facts Rail (Right Column)

| Section | Data Source | Collapse Rule |
|---------|-----------|---------------|
| Hours | entities.hours (parsed) | Hide if null |
| Address | entities.address | Hide if null |
| Links | entities.website, instagram, tiktok, merchant_signals.menu_url | Hide if all null |
| Scene | scenesense.scene | Hide if PRL < 3 |
| Atmosphere | scenesense.atmosphere | Hide if PRL < 3 |
| Ambiance | scenesense.ambiance | Hide if PRL < 3 |

### 3.8 Full-Width Sections

| Section | Data Source | Collapse Rule |
|---------|-----------|---------------|
| Photos | entities.googlePhotos | Hide if empty |
| More Maps | appearsOn (published maps) | Hide if empty. Max 3 cards. |
| References | Coverage sources + data provenance | Always show if any content rendered |

## 4. Data Gaps (Current → Target)

| Data | Exists in DB | Wired to API? | Wired to Page? |
|------|-------------|---------------|----------------|
| Reservation URL | merchant_signals.reservation_url | ✅ (merchant_signals → entities fallback) | ✅ |
| Beverage programs | derived_signals.offering_programs | ✅ | ✅ (signal-aware composition) |
| VOICE_DESCRIPTOR (ABOUT) | interpretation_cache | ✅ | ✅ (3-tier fallback) |
| Business status | entities.business_status | ✅ | ✅ (banner for non-OPERATIONAL) |
| Place personality | derived_signals.identity_signals | ✅ | ✅ (scene sidebar + identity) |
| Signature dishes | derived_signals.identity_signals | ✅ | ✅ (Known For section) |
| Key producers | derived_signals.identity_signals | ✅ | ✅ (Known For section) |
| Origin story type | derived_signals.identity_signals | ✅ | ✅ (About accent line) |
| Language signals → SceneSense | derived_signals.identity_signals | ✅ | ✅ (routes to SceneSense lenses) |
| Identity signals (core 4) | derived_signals.identity_signals | ✅ | ✅ (offering signals: posture, service, price, wine intent) |
| Confidence metadata | derived_signals.identity_signals | — | — (pipeline internal, not page-facing) |

## 5. Rendering Rules

### 5.1 Offering Section — Signal-Aware Composition

Offering lines are composed from program maturity + program signals, not flat labels. The system uses static phrase assembly: structural signal names map to human-readable fragments and compose into natural sentences.

**Architecture**: `resolveSignalPhrases(signals[], vocabulary) → fragments[] → composeSentence(lead, fragments, connector) → sentence`

**Food**: Cuisine posture drives the lead phrase (e.g. "Seasonal, produce-driven kitchen"), food signals compose as detail fragments via `"built around"` connector. 16 signal phrases mapped (FOOD_SIGNAL_PHRASES). Falls back to maturity + cuisineType when posture is absent.

**Wine**: Wine program intent drives the lead phrase (9 intents mapped in WINE_INTENT_LEADS, e.g. "Producer-driven natural wine list"). Wine signals (3 locked: natural_wine_focus, orange_wine_presence, pet_nat_presence) compose via `"with"` connector. Falls back to maturity label if no intent.

**Cocktails**: Maturity drives the lead ("Dedicated cocktail program" / "Composed cocktail menu"), cocktail signals (locked v1: seasonal_menu) compose via `"featuring"`. Falls back to `servesCocktails` boolean.

**Beer**: Maturity drives the lead ("Dedicated beer program" / "Considered beer selection"), beer signals (locked v1: craft_beer_focus) compose via `"with"`. Falls back to `servesBeer` boolean.

**Non-Alcoholic**: Signal-first — if any of the 10 locked signals resolve (e.g. zero_proof_cocktails, house_soda_program, horchata_presence, na_spirits_presence), they drive the sentence via `"including"` connector. Maturity shapes the lead. Falls back to maturity-only label when no signals detected.

**Coffee & Tea**: Signal-first — if any of the 11 locked signals resolve (e.g. espresso_program, matcha_program, specialty_tea_presence, afternoon_tea_service), they compose via `"featuring"`. Falls back to maturity-only label.

**Service + Price**: Use existing phrase maps (SERVICE_MODEL_PHRASES, PRICE_PHRASES). No signal composition.

**Cap**: Max 6 offering lines rendered (OFFERING_CAP). Signal fragments capped at 3 per program.

**Collapse rule**: Programs with maturity `none` or `unknown` and no resolved signals do not render.

All signal vocabularies are defined in the Beverage Program + Signal Vocabulary v1 spec (SKAI-DOC-TRACES-BEVERAGE-PROGRAM-VOCAB-001). Display phrase mappings live in page.tsx alongside the rendering logic.

### 5.2 SceneSense (SKAI-DOC-SS-001)

- PRL < 3 → render nothing (all three surfaces hidden)
- PRL 3 (LITE) → max 2 tags per surface
- PRL 4 (FULL) → max 4 tags per surface
- UI renders arrays as-is — no re-sorting, filtering, capping
- Never read raw language_signals in UI

### 5.3 Collapse Rules

Every block collapses silently if empty. No placeholders, no "coming soon", no empty states. Per Merchant Data Hierarchy v2.1: blocks earn their space.

## 6. Design Philosophy

- Text-first research paper / museum placard / guidebook
- NOT Yelp / Google Maps / food blog
- Strong typographic hierarchy
- No hero image
- Existing CSS token system: 35+ custom properties in place.css

## 7. Build Approach

Incremental (data first):
- **Phase 1**: Wire all data gaps through contract → API → page. No layout changes. Verify with Camphor on localhost.
- **Phase 2**: Restructure to the two-column wireframe.

## 8. Key Files

| File | Role |
|------|------|
| app/(viewer)/place/[slug]/page.tsx | Profile page component |
| app/(viewer)/place/[slug]/place.css | Tokenized CSS |
| app/api/places/[slug]/route.ts | API route |
| lib/contracts/place-page.ts | Data contract |
| lib/contracts/place-page.identity.ts | Identity line helpers |
| scripts/assemble-offering-programs.ts | WO-006 beverage programs |
| scripts/generate-descriptions-v1.ts | VOICE_DESCRIPTOR batch pipeline |
| lib/voice-engine-v2/description-extraction.ts | Tier 1 extraction + coherence filter |
| lib/voice-engine-v2/description-prompts.ts | Tier 2/3 prompt templates |
| lib/voice-engine-v2/description-generator.ts | AI generation for Tier 2/3 |
| lib/scenesense.ts | SceneSense assembly |

## 9. Showcase Entity

**Camphor** (slug: camphor-restaurant-2-michelin-1-michelin-star-arts-district-french)
- Identity signals: cuisine_posture=balanced, service_model=small-plates, price_tier=$$$, wine_program_intent=classic, place_personality=chef-driven
- Reservation URL in merchant_signals
- 8 language signal descriptors
- Google Places: address, lat/lng, phone, hours, photos
- No description, no curator note

## 10. Resolved Decisions

1. **ABOUT vs Coverage Note vs Saiko Voice** — LOCKED. Three distinct voices, never merge. ABOUT = merchant voice (identity). Coverage Note = external media (validation). Saiko Voice = tagline rendered below identity subline (Voice Engine v2 output from interpretation_cache).

## 11. Open Questions

1. ~~**ABOUT content sourcing**~~: RESOLVED — VOICE_DESCRIPTOR pipeline (WO-ABOUT-001) implements 3-tier sourcing: verbatim merchant text → AI-synthesized from merchant blocks → AI-composed from signals. See about-description-spec-v1.md.
2. **Coverage Note naming**: "Curator's Note" is misleading. Final name TBD (Coverage Note, Press Note, In the Press, What They Say).
3. **Reference Ledger launch rule**: "No derived signals unless ≥1 ledger reference exists" — when does this gate activate?
4. **Reference Confidence Model**: Not all references are equal (LA Times vs merchant site). Needs design.
5. **Established year**: Where does it live? (Future field for identity block)
6. **Offering summary**: Single-sentence "sign language" from Place Page Data Contract v1 — how does it relate to the Offering section?

---
Revision History

| Version | Date | Changes | Author |
|---|---|---|---|
| 1.0 | 2026-03-11 | Initial design spec from planning session | Bobby / Claude |
| 1.1 | 2026-03-16 | Tagline rendered on page (Saiko voice live). TikTok CTA added. Pull quote source linked via pullQuoteUrl. Wireframe and content model updated. | Bobby / Claude |
| 1.2 | 2026-03-16 | VOICE_DESCRIPTOR pipeline built (3-tier description hierarchy). Offering section rewritten with signal-aware composition across all 7 programs. Business status banner added. Beverage signal display phrases mapped for all locked v1 vocabularies. Data gaps table updated. Open question 1 resolved. | Bobby / Claude |
| 1.3 | 2026-03-17 | All data gaps closed. key_producers and origin_story_type wired through API → contract → page. Reservation URL confirmed wired (merchant_signals → entities fallback). Identity signals fully wired (7/10 page-facing, 3 confidence metadata internals). Data gaps table rewritten to reflect actual state. | Bobby / Claude |
