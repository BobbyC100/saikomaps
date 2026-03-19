---
doc_id: SKAI-DOC-TRACES-WO-ABOUT-001
doc_type: work-order
status: draft
owner: Bobby Ciccaglione
created: 2026-03-16
last_updated: 2026-03-16
project_id: PLACE-PAGE
spec: SKAI-DOC-TRACES-ABOUT-DESCRIPTION-001
systems:
  - enrichment-pipeline
  - voice-engine
  - place-page
related_docs:
  - docs/traces/about-description-spec-v1.md
  - docs/traces/place-page-design-v1.md
  - lib/fields-v2/write-claim.ts
  - lib/voice-engine-v2/signal-extraction.ts
  - scripts/generate-taglines-v2.ts
summary: Execution work order for the VOICE_DESCRIPTOR generation pipeline — 3 checkpoints covering Tier 1 extraction, Tier 2/3 generation, and API read path + rendering.
---

# WO-ABOUT-001 — VOICE_DESCRIPTOR Generation Pipeline

**Spec**: [About Description Spec v1](about-description-spec-v1.md)
**Pattern**: Follows `generate-taglines-v2.ts` + `writeInterpretationCache` established path
**Blast radius**: Additive only. No schema changes. No existing behavior altered until Checkpoint 3 wires the read path.

---

## Checkpoint 1 — Tier 1 Extraction (verbatim merchant copy)

**Goal**: Extract usable About text from `merchant_surface_artifacts` and write it to `entities.description` for qualifying entities.

### Scope

1. **New script**: `scripts/generate-descriptions-v1.ts`
   - CLI pattern matches `generate-taglines-v2.ts` (--dry-run, --limit, --verbose, --place, --reprocess)
   - Queries `merchant_surface_artifacts` for each entity where `surface_type IN ('about', 'homepage')` and `artifact_type = 'parse_v1'`
   - Parses `text_blocks` JSON array from the artifact

2. **Tier 1 logic** (verbatim extraction):
   - Find the longest coherent text block from about/homepage surfaces
   - **Coherence filter**: length ≥30 words and ≤150 words, not a nav dump (no excessive link-like fragments), not a list of hours, describes the place
   - Light cleanup only: trim whitespace, strip leading/trailing boilerplate fragments
   - No AI call — this is string extraction

3. **Write path**:
   - Write to `entities.description` via `writeClaimAndSanction` (attributeKey: `description`)
   - Set `entities.description_source = 'website'`
   - Only overwrite if current `description_source` is null or not `'website'` (don't downgrade hand-written editorial)

4. **Minimum data gate**:
   - Skip entities with NO merchant surfaces AND NO identity_signals AND NO (category + neighborhood)
   - Log skipped entities with reason

### Files to create/modify

| File | Action |
|------|--------|
| `scripts/generate-descriptions-v1.ts` | **Create** — main pipeline script |
| `lib/voice-engine-v2/description-extraction.ts` | **Create** — Tier 1 extraction logic (text block parsing, coherence filter) |

### Verification

- `--dry-run --verbose --limit=10`: inspect output for 10 entities, confirm extracted text is coherent merchant copy
- Confirm no entity with `description_source = 'editorial'` is overwritten
- Confirm entities with no merchant surfaces are skipped with logged reason
- Typecheck passes (`npx tsc --noEmit` on changed files)

### Rollback

- `entities.description` is overwritten only when source was null/weaker — revert by clearing `description` and `description_source` for entities where `description_source = 'website'`
- No interpretation_cache writes in this checkpoint

---

## Checkpoint 2 — Tier 2 + Tier 3 Generation (AI synthesis and composition)

**Goal**: Generate VOICE_DESCRIPTOR entries for entities that didn't qualify for Tier 1, using AI synthesis (Tier 2) or composition (Tier 3).

### Scope

1. **Extend** `scripts/generate-descriptions-v1.ts` with Tier 2 and Tier 3 branches (tier selection runs in order per spec Section 4)

2. **Tier 2 — Synthesize from merchant copy**:
   - Input: richest `text_blocks` from merchant surfaces (about > homepage > menu priority) + `identity_signals` for structural context
   - New prompt: `about-synth-v1` in `lib/voice-engine-v2/description-prompts.ts`
   - Constraints: 40–80 words, merchant's vocabulary, no editorial voice, no superlatives, no invented facts
   - AI call: Claude Haiku (same pattern as tagline generation)
   - Write: `writeInterpretationCache` with `outputType: 'VOICE_DESCRIPTOR'`, `promptVersion: 'about-synth-v1'`

3. **Tier 3 — Compose from signals**:
   - Input: `identity_signals` (place_personality, cuisine_posture, service_model, origin_story_type, signature_dishes, language_signals) + entity metadata (name, category, neighborhood) + coverage_sources for factual grounding
   - New prompt: `about-compose-v1` in `lib/voice-engine-v2/description-prompts.ts`
   - Voice: grounded descriptive — warm, observational, specific. No first-person. No impersonation. No marketing.
   - Constraints: 40–80 words, only reference facts from input, no invention
   - Write: `writeInterpretationCache` with `outputType: 'VOICE_DESCRIPTOR'`, `promptVersion: 'about-compose-v1'`

4. **Description quality metadata** (all tiers):
   - Every write includes `description_quality` in the content JSON:
     ```json
     {
       "text": "...",
       "description_quality": {
         "source_tier": 1 | 2 | 3,
         "source_coverage_score": 0.0-1.0,
         "signal_density": "low" | "medium" | "high"
       }
     }
     ```
   - Tier 1: always `source_coverage_score: 1.0`, `signal_density: "high"`
   - Tier 2/3: computed from available inputs (see spec Section 5)

### Files to create/modify

| File | Action |
|------|--------|
| `lib/voice-engine-v2/description-prompts.ts` | **Create** — `about-synth-v1` and `about-compose-v1` system/user prompts |
| `lib/voice-engine-v2/description-generator.ts` | **Create** — AI generation logic for Tiers 2 and 3 (mirrors `generator.ts` pattern) |
| `lib/voice-engine-v2/description-extraction.ts` | **Modify** — add quality metadata computation, export tier selection function |
| `scripts/generate-descriptions-v1.ts` | **Modify** — add Tier 2/3 branches, stats tracking by tier |
| `lib/voice-engine-v2/index.ts` | **Modify** — export new description modules |

### Verification

- `--dry-run --verbose --limit=20`: inspect Tier 2 and Tier 3 outputs
- Confirm Tier 2 outputs use merchant vocabulary (spot-check against source text_blocks)
- Confirm Tier 3 outputs have no first-person, no impersonation, no invented details
- Confirm word count within 40–80 range
- Confirm `writeInterpretationCache` called with correct `outputType` and `promptVersion`
- Confirm quality metadata is populated on every output
- Typecheck passes

### Rollback

- `interpretation_cache` entries with `output_type = 'VOICE_DESCRIPTOR'` and `prompt_version IN ('about-synth-v1', 'about-compose-v1')` can be deleted
- No entities.description changes in this checkpoint (only Tier 1 writes there, and that's Checkpoint 1)

---

## Checkpoint 3 — API Read Path + Rendering

**Goal**: Wire VOICE_DESCRIPTOR into the place page API and update appendix attribution. No visual changes needed — existing rendering handles it.

### Scope

1. **API route** (`app/api/places/[slug]/route.ts`):
   - After existing tagline read path, add VOICE_DESCRIPTOR lookup:
     ```
     1. Query interpretation_cache for (entity_id, output_type='VOICE_DESCRIPTOR', is_current=true)
     2. If found → use content.text as description, set descriptionSource from prompt_version
     3. If not found → fall back to entities.description (existing behavior, unchanged)
     ```
   - This mirrors the existing tagline pattern (interpretation_cache → entities.tagline fallback) already in the route

2. **descriptionSource mapping**:
   - `about-synth-v1` → returned as `descriptionSource: 'about-synth-v1'`
   - `about-compose-v1` → returned as `descriptionSource: 'about-compose-v1'`
   - Existing values (`website`, `editorial`, `google_editorial`) unchanged

3. **Appendix attribution** (References section in page.tsx):
   - Map new `descriptionSource` values to labels:
     - `about-synth-v1` → "Synthesized from merchant website"
     - `about-compose-v1` → "Composed from identity signals"
   - Existing labels unchanged

### Files to modify

| File | Action |
|------|--------|
| `app/api/places/[slug]/route.ts` | **Modify** — add VOICE_DESCRIPTOR read from interpretation_cache before entities.description fallback |
| `app/(viewer)/place/[slug]/page.tsx` | **Modify** — add descriptionSource label mapping for new values in References section |
| `lib/contracts/place-page.ts` | **Modify** — add new descriptionSource values to type if typed |

### Verification

- Load Camphor place page on localhost — confirm description renders (may require running Checkpoint 1/2 for Camphor first)
- Confirm API response includes `descriptionSource` with correct value
- Confirm References section shows correct attribution label
- Confirm fallback still works: entity with no VOICE_DESCRIPTOR still shows entities.description
- Confirm entity with no description at all still collapses the About section (no placeholders)
- Typecheck passes

### Rollback

- Revert the three files to prior commit
- VOICE_DESCRIPTOR rows remain in interpretation_cache but are simply not read — no user-facing impact

---

## Execution Notes

**Order**: Checkpoints 1 and 2 can be built and verified independently (they only write data). Checkpoint 3 depends on 1+2 having run for at least one entity to verify the read path.

**Prompt iteration**: The spec (Section 11, Open Question 2) notes that the Tier 3 prompt will need 2–3 iterations. Checkpoint 2 is designed so the prompts live in their own file (`description-prompts.ts`) and the prompt_version tracks which version produced each output. Iteration means updating the prompt and reprocessing.

**No schema migration required**: `entities.description` and `entities.description_source` already exist. `interpretation_cache` already supports `VOICE_DESCRIPTOR` as an `output_type`. `writeInterpretationCache` already accepts it.

**Cost**: Same as tagline generation — Claude Haiku calls for Tiers 2 and 3 only. Tier 1 is pure extraction (no AI cost). Estimate ~$0.002–0.004 per entity for Tiers 2/3.
