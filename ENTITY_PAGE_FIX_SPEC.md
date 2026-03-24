# Entity Page Fix Spec — Global Issues

**Date:** 2026-03-23
**Source:** Buvons entity page review (feedback applies site-wide)
**Scope:** Systems-level fixes, not per-entity patches

---

## Issue 1 — Identity Line Fallback Fires Too Easily

**Observed:** "Restaurant in Long Beach" — generic fallback instead of the actual concept.

**Root cause:** `getIdentitySublineV2()` in `lib/contracts/entity-page.identity.ts` builds its format phrase from a single `primaryVertical` enum (EAT, WINE, COFFEE, etc.) plus an optional cuisine qualifier. Buvons is a natural wine bar, bottle shop, *and* restaurant — one entity, one owner, but the identity system only models one vertical. It picks EAT → "restaurant" and has no mechanism to express multi-format concepts.

**What needs to change:**

1. **Data layer:** Entities need a way to express multi-format identity. Either a `secondaryVerticals` field on the entity, or a structured `conceptFormat` field in identity signals (e.g., `["natural wine bar", "bottle shop", "restaurant"]`). This is an additive schema change — new field, no existing field repurposed.

2. **Contract layer:** `getIdentitySublineV2()` needs a new composition path. When a multi-format concept exists, it should compose a phrase like "Natural wine bar, bottle shop, and restaurant in Long Beach" rather than falling through the single-vertical logic. The function already handles WINE qualifier logic (`WINE_QUALIFIER` map) — this extends that pattern to compound formats.

3. **Enrichment layer:** The identity enrichment pipeline (`lib/saikoai/prompts/entity-enrichment.ts`) should be prompted to extract compound format signals where applicable, so this data populates automatically over time.

**Files involved:**
- `lib/contracts/entity-page.identity.ts` — derivation logic
- `prisma/schema.prisma` — if adding a new field
- `lib/saikoai/prompts/entity-enrichment.ts` — extraction prompt
- `app/api/places/[slug]/route.ts` — pass new field through contract

**Decision:** Add `format_descriptors: string[]` to identity signals (derived_signals blob). Additionally, add a nullable `identityLineOverride` text column on the entity itself — if set, `getIdentitySublineV2()` returns it verbatim, skipping all derivation. This gives the enrichment pipeline room to populate automatically while preserving a manual escape hatch until the admin editing UI ships. When the admin UI is live, it writes to `identityLineOverride` directly.

---

## Issue 2 — Tagline Duplicates Location from Identity Line

**Observed:** "Long Beach" appears in both the identity line and the tagline.

**Root cause:** The tagline generator prompt (`lib/voice-engine-v2/prompts.ts`, `TAGLINE_GENERATOR_SYSTEM_PROMPT_V2`) does not instruct the model to omit location. The user prompt (`buildTaglineGeneratorUserPromptV2`) passes neighborhood to the model as context, and PATTERN 2 explicitly asks the model to "lead with where it is." The identity line already claims location — the tagline should never repeat it.

**What needs to change:**

1. **Prompt layer (unconditional rule):** Add to `TAGLINE_GENERATOR_SYSTEM_PROMPT_V2`:
   ```
   LOCATION RULE: Never include the neighborhood, city, or street name in any tagline. Location is handled by the identity line. Your taglines are about what the place IS, not where it is.
   ```

2. **Pattern 2 rework:** PATTERN 2 ("Neighborhood Anchor") must be redefined. It currently instructs the model to lead with geography. Replace with a pattern that uses *character* or *role in its context* without naming the location. E.g., "The kind of place the neighborhood organizes around" instead of "On Main Street in Long Beach."

3. **Post-generation filter (defense in depth):** In `lib/voice-engine-v2/generator.ts` or the selector, add a lint step: if the selected tagline contains the entity's neighborhood or city name, reject it and re-select.

**Files involved:**
- `lib/voice-engine-v2/prompts.ts` — system prompt + Pattern 2
- `lib/voice-engine-v2/generator.ts` or `selector.ts` — lint/filter

---

## Issue 3 — "Concept-driven" Leaking onto Page

**Observed:** "Concept-driven" renders on the entity page. This is a Saiko Voice / interpretation token — internal vocabulary, not display copy.

**Root cause:** This likely comes from `placePersonality` being rendered directly in the Scene sidebar. In `page.tsx` line ~761: `const sceneText = location.placePersonality?.trim() || null;` — and line ~1011: `{sceneText && <p>{sceneText}</p>}`. The `placePersonality` field contains internal classification tokens (e.g., "concept-driven", "neighborhood-spot", "scene"), not assembled display copy. It is being rendered raw.

**What needs to change:**

1. **Traces layer (immediate fix):** Stop rendering `placePersonality` directly. Either:
   - Remove the raw render entirely (preferred — SceneSense already derives display copy from this token), or
   - Map it through a display-safe vocabulary before rendering (like the SceneSense voice engine already does with `SCENE_CONTEXT`, `SCENE_FORMALITY`, etc.)

2. **Audit:** Check if any other internal classification tokens are leaking to the page. Candidates: `originStoryType`, `cuisinePosture`, `wineProgramIntent` — all of these are internal tokens that should only be consumed by derivation functions, never rendered raw.

**Files involved:**
- `app/(viewer)/place/[slug]/page.tsx` — lines ~761, ~1011

---

## Issue 4 — Offering Lines Too Short

**Observed:** "Broadly composed menu", "Considered wine selection", "À la carte ordering" — correct tokens but too terse. Each should be a full sentence.

**Root cause:** `buildOfferingLines()` in `page.tsx` (line 428) uses `composeSentence()` to join a lead phrase with signal fragments. When there are *no signal fragments* for a program, the lead phrase renders alone — and the lead phrases are deliberately short (e.g., "Broadly composed menu", "Considered wine selection"). The `composeSentence` function returns just the lead when `fragments.length === 0`.

The system works well when enrichment has populated program signals. When signals are sparse, the output degrades to stub phrases.

**What needs to change:**

1. **Offering composition (Traces layer):** When a program has maturity/posture but zero signal fragments, the system should produce a minimum-viable sentence rather than rendering the lead phrase naked. Options:
   - Expand the lead phrases in `CUISINE_POSTURE_LEADS` and `WINE_INTENT_LEADS` to be full sentences by default (e.g., "Broadly composed menu with range across the card" → still reads well when fragments *do* get appended)
   - Add a fallback sentence generator that fires when fragments are empty

2. **Minimum length rule:** Add a guard in `buildOfferingLines` — if a sentence is under ~6 words and has no fragments, either expand it or suppress it. A terse label with no substance is worse than no label.

**Files involved:**
- `app/(viewer)/place/[slug]/page.tsx` — `buildOfferingLines()`, `CUISINE_POSTURE_LEADS`, `WINE_INTENT_LEADS`, and similar lead maps

---

## Issue 5 — Scene Section Rendering Raw Tokens

**Observed:** "Destination-leaning" and "Higher-end pricing" appear as raw tokens rather than assembled copy.

**Root cause:** The SceneSense voice engine (`lib/scenesense/voice-engine.ts`) outputs display-ready single words/phrases from lookup maps — `SCENE_CONTEXT['DESTINATION_LEANING']` returns `'Destination-leaning'`, `SCENE_FORMALITY['REFINED']` returns `'Refined'`, etc. These were designed as compact tags, not prose. The page renders them as-is in the sidebar (`sidebar-tag-block`).

Two sub-problems:
- **SceneSense outputs are tags, not sentences.** The voice engine produces `string[]` where each element is a 1-2 word tag. For the sidebar tag format this is intentional — but it looks raw/unfinished.
- **PRL threshold may not be met** for Buvons, meaning SceneSense might be running in LITE mode (max 2 items per surface) or not running at all, producing the sparsest possible output.

**What needs to change:**

1. **Investigate PRL for Buvons.** If PRL < 3, SceneSense returns null and the scene section should not render at all. If it is rendering with sparse data, either PRL is being overridden or the threshold check has a bug.

2. **Scene display mode: sentence-assembly.** The voice engine display maps (`SCENE_CONTEXT`, `SCENE_FORMALITY`, `SCENE_ROLE`, `ENERGY_MAP`, etc.) should produce full natural-language phrases instead of bare tokens. E.g., `DESTINATION_LEANING` → "People come from outside the neighborhood for this" instead of "Destination-leaning." Each map value becomes a complete, display-ready sentence.

3. **Price in Scene:** "Higher-end pricing" is being surfaced in the Scene sidebar via `priceText` from `buildOfferingLines`. This is a Traces-layer presentation choice — if it looks like a raw token, the offering line for Price needs the same minimum-sentence treatment as Issue 4.

**Files involved:**
- `lib/scenesense/voice-engine.ts` — display map values
- `lib/scenesense/assembly.ts` — PRL check, mode selection
- `app/(viewer)/place/[slug]/page.tsx` — scene rendering block (~lines 1007-1018)

---

## Issue 6 — Directions in Links Rail (Should Be Primary CTA)

**Observed:** Directions appears in the sidebar Links section alongside Menu / Wine list / Call.

**Root cause:** In `page.tsx` lines 754-758, Directions is added to `sidebarLinks[]` alongside the other links. It renders in the sidebar under the "Links" header. But Directions is an action (navigational intent), not a reference link. It belongs in the primary CTA strip alongside Reserve / Website / Instagram.

**What needs to change:**

1. **Move Directions to primary CTAs:** Add `mapRefUrl` to the `#primary-ctas` block (lines 817-834). Render it as "Directions ↗" alongside the existing CTAs.

2. **Remove Directions from sidebarLinks:** Delete the `sidebarLinks.push({ label: 'Directions', url: mapRefUrl })` line.

3. **Keep Map ↗ in utility rail:** The Address block (lines 1061-1065) already has a "Map ↗" link. This is the right place for a map reference — the utility rail is for practical lookup. Directions as a primary CTA is for "I want to go there now."

**Files involved:**
- `app/(viewer)/place/[slug]/page.tsx` — sidebarLinks construction + primary-ctas block

---

## Issue 7 — Known For Pulling Wrong Data

**Observed:** Known For section displays the wine producer list. Wrong frame — should highlight what makes the place distinct (owner, concept, dual-space format, natural wine focus).

**Root cause:** The Known For section in `page.tsx` (lines 862-878) renders `signatureDishes` and `keyProducers` from identity enrichment. For a place like Buvons where producers *are* a big part of the offering, the system surfaces them — but it doesn't distinguish between "these are the producers they stock" (a catalog fact) and "this is what makes the place known" (an editorial assertion).

**What needs to change:**

1. **Reframe Known For as editorial, not enrichment-derived.** Known For should answer "what would someone who's been here tell a friend?" — not "what did the enrichment pipeline extract from the menu." This requires a different data source: either a curated `knownForStatements` field (editorial), or a voice-engine-generated summary that synthesizes identity signals into a narrative.

2. **Short-term (data sourcing):** Add a `knownFor` text field (or `knownForStatements: string[]`) to the entity contract. Populate it editorially or via a new prompt that takes identity signals + coverage and produces 2-3 sentences about what makes the place distinct.

3. **Rendering change:** If `knownForStatements` exists, render those. Fall back to signatureDishes only if no editorial known-for exists. Suppress `keyProducers` from this section entirely — producers belong in the Offering section's wine program line, not in Known For.

**Decision:** Known For is a voice-engine output. Add a new prompt/generation path that takes identity signals + coverage evidence and produces 2-3 sentences about what makes the place distinct. Output cached in `interpretation_cache` with a new `outputType` (e.g., `KNOWN_FOR`). Rendering falls back to `signatureDishes` only when no voice-engine output exists. `keyProducers` removed from this section entirely — producers belong in the Offering wine program line.

**Files involved:**
- `app/(viewer)/place/[slug]/page.tsx` — Known For rendering
- `lib/contracts/entity-page.ts` — contract shape
- `lib/voice-engine-v2/` — new Known For generation prompt + orchestration
- `prisma/schema.prisma` — new `KNOWN_FOR` value in `InterpretationOutputType` enum (if not already extensible)

---

## Issue 8 — Photo Quality / Brightness

**Observed:** IG photos are good but dark. Open question on brightness/quality filtering.

**Root cause:** Photos come from `instagram_media` (ingested from IG) and are served as-is. No brightness, quality, or framing filtering exists in the pipeline.

**What needs to change:**

This is an open investigation, not a code fix. Two paths:

1. **Client-side brightness normalization:** Apply a CSS filter (e.g., `brightness(1.1)`) to photos below a luminance threshold. Cheap, reversible, but cosmetic — doesn't actually improve the photo.

2. **Pipeline-side quality scoring:** Add a photo evaluation step in the enrichment pipeline that scores brightness/contrast/composition and either filters out low-quality photos or ranks them. This is a larger project and may already have a foundation in `place_photo_eval` (referenced in the PRL mapper).

**Decision:** CSS brightness normalization now, pipeline quality scoring later.

**Phase 1 (now):** Apply a subtle CSS `brightness()` / `contrast()` filter to photo tiles to lift dark IG photos. Tuned conservatively — slight lift, not blown out. Reversible with one line removal.

**Phase 2 (later):** Add luminance/quality scoring to the photo enrichment pipeline. Score on ingest, filter or rank by quality on render. Scoped separately.

**Files involved (Phase 1):**
- `app/(viewer)/place/[slug]/place.css` — photo tile styles

---

## Issue 9 — Coverage Empty State Renders Instead of Collapsing

**Observed:** "No coverage sources yet." renders on the page. Two problems: (a) empty state should collapse silently per spec; (b) no coverage records exist for Buvons.

**Root cause:**

**(a) Rendering bug:** In `page.tsx` lines 1163-1185, the appendix Coverage column renders an else-branch with `<p className="coverage-empty">No coverage sources yet.</p>` when `coverageSources` is empty. Per spec, empty sections should collapse — not show placeholder text.

**(b) Data gap:** Buvons has no records in the `coverage_sources` table. This is a data entry / enrichment issue, not a code bug. Coverage needs to be populated separately.

**What needs to change:**

1. **Traces layer (immediate fix):** Replace the empty-state render with a silent collapse. If `coverageSources` is empty or missing, do not render the Coverage column in the appendix at all. Same pattern already used for other sections (e.g., Curator Note only renders when present).

2. **Audit all empty states:** Check every section on the place page for similar "no X yet" placeholder patterns. Any section that shows a "nothing here" message should collapse silently instead.

3. **Data entry (separate task):** Populate coverage records for Buvons and other entities missing them. This is a data ops task, not a code change.

**Files involved:**
- `app/(viewer)/place/[slug]/page.tsx` — appendix Coverage block (lines ~1163-1185)

---

## Issue 10 — Section Dividers Inconsistent

**Observed:** Horizontal line breaks and labeled dividers look messy — inconsistent line weight, spacing, and label treatment.

**Root cause:** The page uses two divider systems that coexist awkwardly:

1. **`.sk-section-header`** — flexbox row with a label span and a `::after` pseudo-element that draws a 1px rule extending to the right. Used for most section labels. Defined in `place.css` lines 432-460.

2. **`.heavy-rule`** — a standalone `<hr>` with `border-top: var(--pp-rule-weight)` (3px). Used as a zone separator between major blocks (before Photos, before More Maps).

The inconsistency comes from:
- The `::after` rule on `.sk-section-header` has `margin-right: 16px` which creates uneven right-edge alignment across different sections
- The heavy-rule uses `--pp-rule-weight` (3px) while section headers use 1px — intentional hierarchy, but the visual gap between them feels unresolved
- In the sidebar, section headers suppress the rule (`#photos-utility-rail .sk-section-header::after { display: none }`) which is correct for tight columns but creates a jarring difference from the main column
- Spacing tokens (`margin-top: var(--sk-space-stack)` = 24px above, `margin-bottom: var(--sk-space-base)` = 12px below) may need tightening

**What needs to change:**

1. **Tighten `.sk-section-header` CSS:**
   - Remove or reduce the `margin-right: 16px` on `::after` so the rule extends to the column edge consistently
   - Consider whether the `::after` rule should be thinner or use `--sk-color-border-muted` at a lower opacity
   - Audit spacing tokens — `--sk-space-stack` (24px) above may be too much for tightly packed sidebar sections

2. **Audit heavy-rule usage:** Confirm that `<hr className="heavy-rule">` is only used at true zone boundaries (the current two uses — before Photos and before More Maps — seem correct). If other `<hr>` elements have crept in, remove them.

3. **Consistent label treatment:** Ensure all `.sk-section-header span` elements use the same type system values. Currently they should all use `--sk-type-section-size` (11px), `--sk-type-section-weight` (500), `--sk-type-section-tracking` (0.12em). Verify no inline overrides are leaking.

**Files involved:**
- `app/(viewer)/place/[slug]/place.css` — section header styles, heavy-rule, spacing tokens

---

## Summary by Layer

| Layer | Issues | Fix Type |
|-------|--------|----------|
| **Data Layer** | #1 (multi-format identity), #7 (Known For sourcing), #9b (coverage data gap) | Schema + data entry |
| **Platform / Fields** | #1 (identity derivation), #2 (tagline prompt), #3 (token suppression), #4 (offering composition), #5 (SceneSense output), #7 (Known For generation) | Prompt + derivation logic |
| **Traces** | #3 (raw render), #4 (min length), #5 (scene render), #6 (Directions CTA), #8 (photos), #9a (empty state), #10 (dividers) | Component + CSS |

## Decisions (Locked)

1. **Issue 1:** `format_descriptors` array on identity signals + nullable `identityLineOverride` column on entity for manual escape hatch.
2. **Issue 5:** Sentence-assembly — voice engine display maps produce full phrases, not bare tokens.
3. **Issue 7:** Voice-engine output — new `KNOWN_FOR` generation prompt, cached in interpretation_cache. Producers removed from this section.
4. **Issue 8:** CSS brightness fix now, pipeline quality scoring scoped separately for later.
