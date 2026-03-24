---
doc_id: ARCH-DATA-INTERPRETATION-GAP-AUDIT-V1
doc_type: audit
status: ACTIVE
owner: Bobby Ciccaglione
created: 2026-03-23
last_updated: 2026-03-23
layer: Fields / Traces boundary
depends_on:
  - ARCH-ENTITY-PAGE-CONTENT-SYSTEM-V0
  - TRACE-ENTITY-PAGE-STRUCTURAL-FIXES-V1
---

# Data-to-Interpretation Gap Audit v1

> **Question from Bobby:** "We spent so much time building those. We spent so much time collecting data, and there just seems to be a huge gap between the data that we have, the data that we downloaded, and the data that's available to the interpretation layer."

This audit traces the full pipeline from raw data collection through to the interpretation layer outputs that the entity page consumes. The goal is to identify where data exists but isn't reaching the features we built.

**Validated against repo state:** 2026-03-23 (working tree)

---

## The Short Answer

The raw data collection is solid. The interpretation engines (offering programs, SceneSense, taglines, voice descriptors) are built. The largest remaining gaps are now **operational orchestration + cache materialization consistency**, not complete absence of transformation scripts.

Specifically:

1. **Identity extraction is no longer menu-only** — merchant about text and coverage presence are now accepted inputs
2. **SceneSense is still computed inline in place API** — cache row (`SCENESENSE_PRL`) is not read/written in this route
3. **Offering programs are now broadly wired to rendering** — prior "8 of 15 missing" claim is stale
4. **Coverage-to-identity synthesis is still incomplete** — coverage hints are not yet explicitly merged into canonical `derived_signals.identity_signals`
5. **Pipeline orchestration is partial** — enrichment orchestration exists, but interpretation-transform sequencing remains fragmented

---

## Pipeline Map

```
RAW DATA (collection — working)
├─ merchant_surfaces (discovery → fetch → parse → artifacts)
├─ menu_fetches (PDF + HTML extraction → raw_text)
├─ entities (Google Places: photos, hours, address, attributes)
├─ instagram_accounts + instagram_media (account + media items)
└─ coverage_sources → coverage_source_extractions (articles → pull quotes + identity hints)

        ↓ TRANSFORMATION (this is where the gaps are) ↓

DERIVED SIGNALS (interpretation inputs)
├─ menu_identity (cuisine posture, service model, wine intent) ← from menu_fetches
├─ menu_structure (food signals, wine signals, cocktail signals) ← from menu_fetches
├─ identity_signals (personality, dishes, producers, language signals) ← from menu_fetches ONLY
├─ offering_programs (food, wine, beer, cocktail, taco, pizza, etc.) ← from menu_identity + menu_structure
└─ [MISSING] merged identity signals from coverage source extractions

        ↓ INTERPRETATION (engines built, but starved of inputs) ↓

INTERPRETATION CACHE (what the page reads)
├─ TAGLINE ← needs identity_signals (may not exist)
├─ VOICE_DESCRIPTOR ← pipeline exists but unclear when it runs
├─ PULL_QUOTE ← from coverage_source_extractions (working)
├─ SCENESENSE_PRL ← computed inline, NEVER cached
└─ [MISSING] OFFERING_PROGRAMS cache entry
```

---

## Gap 1: Identity Signals Are Not Menu-Only Anymore (Stale Claim)

**The script:** `extract-identity-signals.ts`

**What it reads now:** `merchant_surface_artifacts` text bridge (`menu_text`, `about_text`) with min length gate, and entities with current coverage extractions can be included even without usable menu text.

**What it produces:** `derived_signals` with key `identity_signals` — this is the canonical source for:
- `cuisine_posture` (drives offering food line)
- `service_model` (drives offering service line)
- `wine_program_intent` (drives offering wine line)
- `place_personality` (drives SceneSense scene tags)
- `signature_dishes` (drives Known For section)
- `key_producers` (drives Known For section)
- `language_signals` (drives SceneSense atmosphere/energy)
- `origin_story_type` (was rendering as data leak)

**Correction:** The strict "menu required" bottleneck was relaxed. Entities can qualify via about text or coverage presence. The remaining risk is quality/coverage variance, not hard exclusion.

**Still true:** Coverage source extractions (`coverage_source_extractions`) contain identity hints — personality, signature dishes, key producers — but explicit synthesis into canonical `derived_signals.identity_signals` remains incomplete.

Similarly, `merchant_surface_artifacts` contain parsed structured data from restaurant websites (about pages, menu pages, event pages) that could serve as an alternative source for identity signals. But no script reads from them for this purpose.

**Impact (updated):** Entities without strong menu/about text can still be weakly represented; the issue is signal quality and synthesis completeness, not total invisibility.

---

## Gap 2: SceneSense Is Computed But Never Cached

**The engine:** `lib/scenesense/assembly.ts` + `lib/scenesense/prl-materialize.ts`

**What it does:** Computes PRL (1-4), generates atmosphere/energy/scene copy via Voice Engine

**The gap:** SceneSense is computed **inline on every page request** by the place API route. The route does not currently read/write `interpretation_cache` for `SCENESENSE_PRL`. This means:
- No persistent record of SceneSense decisions
- No way to audit why an entity got PRL 2 vs PRL 3
- Every page load recomputes PRL and potentially calls the Voice Engine
- If the computation fails silently (e.g., missing identity signals), the sidebar just shows nothing — with no error trail

**What should happen:** After PRL computation, write the result to `interpretation_cache` with `outputType = 'SCENESENSE_PRL'`. The API route reads from cache. Cache is refreshed on enrichment changes.

---

## Gap 3: Offering Programs Rendering Claim Is Stale

**The assembly script:** `assemble-offering-programs.ts`

**What it produces in derived_signals:** 15 program types including specialty programs (taco, pizza, dumpling, sushi/raw fish, ramen/noodle) and hospitality programs (private dining, group dining, catering).

**The API route:** Fetches all 15 and sends them to the page.

**Current reality:** The page wiring now includes specialty programs (taco, pizza, dumpling, sushi/raw fish, ramen/noodle) and hospitality programs (private/group/catering) in addition to core programs.

**Updated conclusion:** This specific rendering gap is largely closed; any remaining issue is sentence quality/polish, not missing program keys.

---

## Gap 4: Coverage Extractions Don't Feed Back Into Identity Signals

**The extraction script:** `extract-coverage-sources.ts` (v2)

**What it produces:** `coverage_source_extractions` with:
- Pull quotes and accolades (these DO get used — pull quotes render on the page)
- **Identity hints**: personality, signature dishes, key producers, origin story type

**The gap:** Those identity hints sit in `coverage_source_extractions` and are never synthesized into `derived_signals.identity_signals`. The identity signals pipeline only reads from `menu_fetches`. So an entity could have 5 LA Times articles mentioning its signature dish, but if it has no scraped menu, that signal never reaches the page.

**What's needed:** A `synthesize-identity-from-coverage.ts` script that:
1. Reads `coverage_source_extractions` (isCurrent=true) for each entity
2. Extracts identity hints (personality, dishes, producers, origin story)
3. Merges them into `derived_signals.identity_signals` with appropriate confidence weighting (coverage-sourced signals should have different provenance than menu-sourced ones)

---

## Gap 5: Voice Descriptor Pipeline Is Disconnected

**The script:** `generate-descriptions-v1.ts`

**What it should do:** Generate the "About" section text using identity signals, merchant surfaces, and coverage context.

**Updated gap framing:** The script and API wiring exist (`generate-descriptions-v1.ts` writes `VOICE_DESCRIPTOR`; place API reads it before `entities.description` fallback). The remaining gap is operational cadence/coverage: when it is run, at what scope, and how freshness is tracked.

**Impact:** Coverage can still be uneven if generation runs are sporadic, but this is now an execution/scheduling problem rather than a missing pipeline.

---

## Gap 6: No Pipeline Orchestration

**Current state (updated):** Orchestration exists for enrichment flows (e.g., phased smart-enrich), but there is still no single authoritative interpretation-transform orchestrator that:
- Identifies which entities need enrichment
- Checks which signals are missing per entity
- Runs pipeline steps in the correct dependency order
- Tracks progress or reports gaps

**Impact:** Gaps still compound at the transformation/cache layer, especially across identity synthesis, SceneSense cache materialization, and description refresh cadence.

---

## Why Buvons Looks the Way It Does

Putting it together for the reference entity:

| Signal | Data exists? | In derived_signals? | In interpretation_cache? | Rendered on page? |
|--------|-------------|--------------------|-----------------------|-------------------|
| Menu text | Yes (menu_fetches) | — | — | — |
| Menu identity (posture, service, wine intent) | — | Likely yes | — | Yes (but terse — "Broadly composed menu") |
| Menu structure signals | — | Likely yes | — | Partially (only 7 of 15 programs rendered) |
| Identity signals | — | Depends on menu text | — | Partially (producers in Known For, origin story leaked) |
| Offering programs | — | Yes (assembled) | Not cached | Yes (but incomplete rendering) |
| Coverage sources | Yes (fetched + extracted) | Identity hints NOT merged | — | Pull quote renders; identity hints lost |
| SceneSense | — | Needs identity signals | NOT cached | Not rendering (no atmosphere/energy) |
| Tagline | — | — | Yes (TAGLINE) | Yes (but includes neighborhood — Fix 1) |
| Voice descriptor | — | — | Unknown | Falls back to entities.description |

The page is showing stubs and fallbacks because the transformation layer between raw data and interpretation outputs has holes. The data is there. The engines are built. The connective tissue is incomplete.

---

## Recommended Fix Order (Updated)

| Priority | Fix | What it unblocks |
|----------|-----|-----------------|
| P0 | **synthesize-identity-from-coverage.ts** — merge coverage identity hints into derived_signals | Raises identity quality where menu/about text is weak |
| P0 | **cache-scenesense-outputs** (route read/write or batch materializer) | Makes SceneSense debuggable, auditable, and faster to serve |
| P1 | **Instrument voice descriptor cadence + freshness** | Improves About coverage consistency across entities |
| P1 | **Add transform-layer status audit** (identity/offering/scenesense/voice) | Makes missing-step diagnosis explicit |
| P2 | **Unify interpretation orchestration** | Prevents transform/cache holes from compounding |
| P2 | **Decouple page API from direct derived_signals reads** | Layer discipline: page reads interpretation_cache, not raw signals |

---

*Saiko Fields · Data-to-Interpretation Gap Audit v1 · 2026-03-23*
