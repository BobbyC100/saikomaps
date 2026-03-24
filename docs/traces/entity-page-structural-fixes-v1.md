---
doc_id: TRACE-ENTITY-PAGE-STRUCTURAL-FIXES-V1
doc_type: change-spec
status: DRAFT
owner: Bobby Ciccaglione
created: 2026-03-23
last_updated: 2026-03-23
layer: Traces
depends_on:
  - ARCH-ENTITY-PAGE-CONTENT-SYSTEM-V0
  - TRACE-PLACE-PAGE-DESIGN-V1
---

# Entity Page Structural Fixes v1

> **Source:** Bobby's live review of Buvons entity page + earlier voice layer feedback session (2026-03-23).
> These are **system-wide issues**, not Buvons-specific. Buvons is the reference case because it's a richly enriched entity where all the problems are visible at once.

---

## Fix 0: Identity Subline Doesn't Reflect Multi-Format Entities

**Problem:** The identity subline only renders a single vertical noun. Buvons is a restaurant, wine bar, AND wine shop — three distinct formats in two physical spaces with separate addresses and different hours. The subline says:

```
RESTAURANT IN LONG BEACH
```

This undersells the place. It should read something like:

```
RESTAURANT, WINE BAR, AND WINE SHOP IN LONG BEACH
```

**Scope:** System-wide. Any entity that operates across multiple formats (restaurant + bar, café + bakery, wine bar + wine shop) will be reduced to a single noun by `getIdentitySublineV2()`. The function reads `primaryVertical` and maps it to one noun via `VERTICAL_NOUN`.

**Structural fix:** The identity subline needs to support multi-format entities. Options:

- **Option A (data-driven):** Add a `formatTags` or `secondaryVerticals` field to the entity contract. `getIdentitySublineV2()` composes all applicable format nouns: "Restaurant, wine bar, and wine shop in Long Beach."
- **Option B (signal-inferred):** Infer secondary formats from existing signals. If `wineProgramIntent` is `serious` or `dedicated` AND the entity has a separate wine shop signal, append "wine bar" and "wine shop." Fragile, but doesn't require new data.
- **Option C (manual override):** Add an optional `identitySublineOverride` field to the entity. If populated, render it instead of the generated subline. Simplest for edge cases, but doesn't scale.

**Recommendation:** Option A long-term. Option C as an interim escape hatch for entities like Buvons where the auto-generated subline is actively misleading.

**Files:**
- `entity-page.identity.ts` — `getIdentitySublineV2()`, `VERTICAL_NOUN` map
- Entity contract / schema — would need `secondaryVerticals` or override field
- API route — would need to surface new field

---

## Fix 1: Tagline Neighborhood Duplication

**Problem:** The identity subline and the tagline can both contain the neighborhood. On Buvons this produces:

```
Buvons
RESTAURANT IN LONG BEACH
Natural wine. Small producers. French-Mediterranean cooking. Long Beach.
```

"Long Beach" appears in the subline and at the end of the tagline. When the About description also mentions the city, it's a triple occurrence.

**Scope:** System-wide. Any entity where the tagline generation pipeline included a neighborhood/city reference will duplicate the identity subline.

**Structural fix:** The tagline rendering path needs neighborhood-aware deduplication. Two options:

- **Option A (render-time):** In `page.tsx`, before rendering the tagline, strip a trailing neighborhood/city token if it matches the neighborhood used in the identity subline. Lightweight, no pipeline changes.
- **Option B (pipeline-time):** Update the tagline generation prompt/template to never include neighborhood, since the identity subline already owns location context. Cleaner long-term, requires re-running tagline generation for affected entities.

**Recommendation:** Option A as an immediate fix, Option B as a pipeline rule going forward so new taglines don't include neighborhood.

**Files:**
- `page.tsx` ~line 827–829 (tagline render)
- Tagline generation pipeline (interpretation_cache TAGLINE prompts)
- `getIdentitySublineV2()` in `entity-page.identity.ts` (source of neighborhood truth)

---

## Fix 2: Origin Story Type Data Leak

**Problem:** The `originStoryType` field (an internal classification token like `concept-first`) is being rendered as visible text via `ORIGIN_STORY_PHRASES`:

```
ABOUT
Buvons is a natural wine bar, bottle shop, and restaurant in Long Beach...
Concept-driven
```

"Concept-driven" is a data classification, not user-facing copy. It's a data leak from the enrichment layer into the presentation layer.

**Scope:** System-wide. Any entity with a populated `originStoryType` renders this accent line.

**Structural fix:** Remove the origin story accent line from the page entirely. The `ORIGIN_STORY_PHRASES` map and its render block should be deleted or moved behind an admin-only flag. If origin story context is valuable to users, it should be woven into the About voice descriptor by the generation pipeline — not rendered as a standalone label.

**Files:**
- `page.tsx` lines 375–382 (`ORIGIN_STORY_PHRASES` map) — remove or gate
- `page.tsx` lines 901–903 (render block) — remove

---

## Fix 3: Offering Lines Too Terse

**Problem:** When signal data is thin, the offering composition system produces stub phrases that read as labels rather than sentences:

```
OFFERING
Food       Broadly composed menu
Wine       Considered wine selection
Service    À la carte ordering
```

These don't tell the user anything meaningful about the experience. "Broadly composed menu" is a posture classification, not a description of what you'll eat. "Considered wine selection" says nothing about what kind of wine.

**Scope:** System-wide. The `buildOfferingLines()` function has rich output paths (when cuisine posture + signals exist) but the fallback paths (maturity-only, no signals) produce these stubs.

**Structural fix:** The composition system needs richer sentence templates for low-signal cases. When the full signal chain isn't available, the function should pull in adjacent context to build a real sentence:

- **Food:** "Broadly composed menu" is a posture classification — it doesn't describe what you'll actually eat. The line needs to pull in `cuisineType`, known dishes, or format context to give it substance. For Buvons: "French-Mediterranean plates, seasonal and produce-driven" or similar. Also: what is the *source* of this data? If it's inferred from a posture token with no real menu signal behind it, the line shouldn't render at all rather than rendering something vague.
- **Wine:** Better after the first pass ("Considered wine selection with producers like Antoine Chevalier, Benjamin Taillandier, and Fabien Jouves") but should go further. Buvons specializes in French wine and champagne, hard-to-find producers. The line should read more like: "Specialized in French wine and champagne from hard-to-find producers." This means the composition system needs access to wine region/style signals, not just maturity + producer names.
- **Service:** "À la carte ordering — dishes arrive as they are prepared" is better than the bare label, but still generic. Buvons wine bar and the restaurant next door are both **table service**. The service model classification may be wrong in the data (`a-la-carte` when it should be something that reflects table service at a wine bar). This is potentially a data accuracy issue, not just a copy issue.

**Design principle:** Every offering line should be a sentence a knowledgeable friend might say, not a database label. If the data isn't strong enough to produce that sentence, the line should not render rather than rendering a vague stub.

**Files:**
- `page.tsx` `buildOfferingLines()` ~lines 428–587
- `CUISINE_POSTURE_LEADS`, `WINE_INTENT_LEADS`, `SERVICE_MODEL_PHRASES` maps
- Potentially `entity-page.identity.ts` for shared signal access

---

## Fix 4: Scene Section Duplication

**Problem:** The Scene sidebar section can render content that's already present elsewhere on the page. On Buvons:

```
SCENE
Higher-end pricing
```

Price is already an offering line. When Scene only contains price, it creates a sidebar section for one redundant data point.

**Scope:** System-wide. Scene renders `sceneTags` + `priceText`. If an entity has no scene tags (SceneSense PRL < 3 or no scene output) but does have a price tier, Scene becomes a price-only section.

**Structural fix:** Two changes:

1. **Don't render Scene if it would only show price.** Price is already owned by the Offering section. Scene should only render when it has actual scene tags from SceneSense.
2. **Audit Scene vs Atmosphere/Energy overlap.** Scene tags, atmosphere tags, and energy tags come from the same SceneSense engine. Confirm they're surfacing distinct information, not restating the same signals in different sections.

**Files:**
- `page.tsx` lines 1068–1078 (Scene render block)
- `page.tsx` line 778 (`priceText` extraction from offering rows)
- Scene rendering condition: change from `hasScene || priceText` to `sceneTags.length > 0`

---

## Fix 5: Known For Section — Wrong Data, Wrong Presentation

**Problem:** Known For currently renders two things: signature dishes as a bullet list, and key producers as a flat comma string:

```
KNOWN FOR
Producers: Antoine Chevalier, Benjamin Taillandier, Fabien Jouves, Lassaigne, Marcel Lapierre
```

Issues:
- The section name "Known For" implies the defining characteristics of a place. A flat producer list doesn't communicate *why* these producers matter or what they signal about the place.
- Signature dishes render as bare `<li>` bullets with no voice.
- The data wiring may be pulling the wrong source — `keyProducers` from `derived_signals.identity_signals` may not be the right field for this section's intent.

**Scope:** System-wide. Any entity with `keyProducers` or `signatureDishes` populated hits this.

**Structural fix:** This section needs a rethink on both data and presentation:

1. **Clarify what "Known For" means.** Is it the defining characteristics (what makes this place *this place*)? If so, it should pull from a broader set: signature dishes, defining producers, format (e.g., "the wine club"), or a place's signature experience. Not just a list dump.
2. **Improve producer presentation.** If producers stay, they should have context: "Natural wine from small producers like Antoine Chevalier, Benjamin Taillandier, and Fabien Jouves" — a sentence, not a CSV.
3. **Review data source.** Confirm `keyProducers` is correctly wired from `derived_signals.identity_signals` and is actually returning the right data for this section's purpose.

**Files:**
- `page.tsx` lines 922–938 (Known For render)
- API route / contract: verify `keyProducers` source
- Potentially needs a new composition function like `buildKnownForLines()`

---

## Fix 6: Photo Brightness and Framing

**Problem:** Photos in the grid appear too dark, especially Instagram-sourced photos that come through Google Places. The overall gallery feels dim.

**Scope:** System-wide. Affects every entity with photos.

**Structural fix:**

1. **Brightness lift:** Apply a CSS filter to brighten photos across the board. A subtle `filter: brightness(1.08) contrast(1.03)` on `.photo-tile img` would lift the overall feel without washing out well-exposed shots. This should be tested against a range of entities — some photos are already bright and shouldn't blow out.
2. **Framing/crop:** The current `photo-tile` uses `object-fit: cover` which center-crops. For photos where the subject is off-center (common with Instagram food/interior shots), `object-position` tuning or aspect-ratio-aware cropping could improve framing.

**Files:**
- `place.css` — `.photo-tile img` styles
- `page.tsx` lines 1088–1096 (photo grid render)

---

## Fix 7: Description Neighborhood Redundancy

**Problem:** Merchant-sourced or synthesized descriptions often contain the city/neighborhood:

```
Buvons is a natural wine bar, bottle shop, and restaurant in Long Beach, California.
```

When the identity subline already says "Restaurant in Long Beach", this is redundant. Combined with tagline (Fix 1), the neighborhood can appear three times.

**Scope:** System-wide. Any entity whose voice descriptor or merchant text includes a location reference.

**Structural fix:** This is harder to fix because the description is either merchant-authored (can't edit) or AI-synthesized (can be re-prompted).

- **For synthesized descriptions (Tier 2/3):** Update the VOICE_DESCRIPTOR generation prompts to exclude neighborhood/city from the output, since the identity subline owns location context.
- **For merchant-authored descriptions (Tier 1/verbatim):** Accept the redundancy. Merchant text is their voice — we don't edit it.
- **Render-time option:** Don't strip location from descriptions. The description is a paragraph, and removing a phrase mid-sentence creates awkward copy. Better to fix at generation time.

**Files:**
- `lib/voice-engine-v2/description-prompts.ts` (Tier 2/3 prompt templates)
- `scripts/generate-descriptions-v1.ts` (batch pipeline)

---

## Fix 8: Offering Rendering Gap — Page Ignores 8 of 15 Program Types

**Problem:** The API route fetches **15 program types** from `derived_signals.offering_programs`:

```
food_program, wine_program, beer_program, cocktail_program,
non_alcoholic_program, coffee_tea_program, service_program,
private_dining_program, group_dining_program, catering_program,
dumpling_program, sushi_raw_fish_program, ramen_noodle_program, taco_program, pizza_program
```

But `buildOfferingLines()` in `page.tsx` only reads **7**: food, wine, beer, cocktail, non-alcoholic, coffee/tea, and service. The `LocationData` TypeScript interface also only defines those 7.

The specialty programs we built — **taco, pizza, dumpling, sushi/raw fish, ramen/noodle** — plus the hospitality programs — **private dining, group dining, catering** — are fetched by the API, sent to the page, and silently dropped because the page doesn't know they exist.

This means entities with rich specialty program data (taco programs, sushi programs, etc.) are hitting the generic food fallback path ("Broadly composed menu") instead of rendering the specific program data that was enriched.

**Scope:** System-wide. Any entity with specialty or hospitality program data is affected.

**Structural fix:**

1. **Update `LocationData` interface** to include all 15 program types, not just 7.
2. **Add composition logic to `buildOfferingLines()`** for specialty programs. Each needs its own lead phrase and signal vocabulary, following the same pattern as the existing programs.
3. **Add composition logic for hospitality programs** (private dining, group dining, catering) — these may belong in a different section than Offering, or as supplemental lines.
4. **Decide rendering priority:** When an entity has both a generic `food_program` and a specialty `taco_program`, which renders? The specialty program should likely take precedence since it's more specific.

**Files:**
- `page.tsx` — `LocationData` interface (~line 95–103), `buildOfferingLines()` (~lines 428–587)
- API route already sends all 15 — no API changes needed

---

## Fix 9: SceneSense Data Not Rendering

**Problem:** Buvons (a richly enriched entity) shows no SceneSense data on the page — no Atmosphere, no Energy tags in the sidebar. The sidebar only shows Scene with "Higher-end pricing" (which is just a price tier, not SceneSense output).

This needs investigation: either SceneSense data doesn't exist for Buvons (PRL < 3, or the engine hasn't run), or the data exists but isn't being surfaced correctly through the API → contract → page pipeline.

**Scope:** Potentially system-wide. If SceneSense isn't materializing for well-enriched entities, the sidebar is hollow across the board — which feeds directly into Tension 4 (sidebar depends on SceneSense) from the Content System v0 doc.

**Structural fix:**

1. **Audit Buvons SceneSense state:** Query `derived_signals` for SceneSense-related rows. Does PRL exist? What level? Are atmosphere/energy/scene arrays populated?
2. **Trace the pipeline:** If SceneSense data exists in the DB but doesn't show on the page, the break is in the API route or contract. If it doesn't exist in the DB, the break is in the SceneSense engine (hasn't run, or PRL threshold not met).
3. **Broader audit:** Check how many entities with signal score ≥ 3 (from the empirical snapshot in v0) actually have materialized SceneSense data. If the number is low, the sidebar problem is a data coverage issue, not a rendering issue.

**Files:**
- API route: verify SceneSense fields are being read and returned
- `lib/scenesense.ts` — SceneSense assembly
- `page.tsx` lines 763–768 (SceneSense variable extraction), 1029–1078 (sidebar render)

---

## Execution Priority

| Fix | Complexity | Blast Radius | Suggested Order |
|-----|-----------|-------------|-----------------|
| Fix 2: Origin story data leak | Trivial (delete render block) | Low | First — immediate cleanup |
| Fix 4: Scene duplication | Small (change render condition) | Low | Second — quick win |
| Fix 1: Tagline neighborhood | Small (render-time strip) | Medium | Third — visible improvement |
| Fix 6: Photo brightness | Small (CSS only) | Low | Fourth — visual polish |
| Fix 9: SceneSense not rendering | Small-Medium (audit + trace) | High | Fifth — unlocks sidebar value |
| Fix 8: Offering rendering gap (8 missing programs) | Medium (interface + composition) | High | Sixth — unlocks specialty program data |
| Fix 3: Offering line richness | Medium (composition logic + data audit) | Medium | Seventh — voice quality + data accuracy |
| Fix 0: Identity subline multi-format | Medium (contract + identity helper) | Medium | Eighth — needs schema decision |
| Fix 5: Known For rethink | Medium (data + presentation) | Medium | Ninth — needs design decision |
| Fix 7: Description redundancy | Medium (pipeline change) | Low | Tenth — affects future generations only |

---

## Relationship to Entity Page Content System v0

These fixes address **Tension 3** (flat section hierarchy), **Tension 6** (voice consistency), and partially **Tension 1** (restaurant monoculture — offering lines being too thin). They are scoped to the current page architecture and do not require choosing a Direction (A–D) first. They can ship independently and incrementally.

---

*Saiko Fields · Entity Page Structural Fixes v1 · 2026-03-23*
