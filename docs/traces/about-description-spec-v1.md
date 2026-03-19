---
doc_id: SKAI-DOC-TRACES-ABOUT-DESCRIPTION-001
doc_type: traces
status: draft
owner: Bobby Ciccaglione
created: 2026-03-16
last_updated: 2026-03-16
project_id: PLACE-PAGE
systems:
  - place-page
  - enrichment-pipeline
  - voice-engine
related_docs:
  - SKAI-DOC-TRACES-PLACE-PAGE-DESIGN-001
  - ENRICH-STRATEGY-V1
summary: Spec for the About description on the place page — 3-tier sourcing hierarchy, VOICE_DESCRIPTOR generation, and rendering rules.
---

# About Description Spec v1

## 1. Problem

The About section is the most important text block on the place page. Today it renders `entities.description` as a single paragraph — but most entities have either no description, a hand-seeded one-liner, or raw website copy that wasn't written for this context. The enrichment pipeline extracts rich identity signals (cuisine posture, personality, signature dishes, language signals, origin story) but none of that feeds back into a coherent About paragraph.

The place page reads thin because the highest-value content block has no reliable generation path.

## 2. Principle

**Use the entity's own words wherever possible.**

The About section is the Merchant Voice (per Place Page Design v1, Section 3.1). It should sound like the place talking about itself — not Saiko describing the place, and not a reviewer evaluating it.

## 3. Description Source Hierarchy

Three tiers, evaluated in order. The first tier that produces usable content wins.

### Tier 1 — Entity's Own Words (verbatim)

**Source**: Merchant-authored text from the entity's own website about page, homepage intro, Instagram bio, or pinned captions.

**Storage**: `merchant_surface_artifacts` (surface_type = 'about' or 'homepage', artifact_type = 'parse_v1'). The parsed `text_blocks` JSON array contains the entity's actual copy.

**Criteria for use**:
- The about surface exists and was successfully parsed
- The text is coherent (not a navigation dump, not boilerplate, not a list of hours)
- Length is between ~30 and ~150 words
- The text describes the place (not just a menu, not just a reservation prompt)

**Processing**: Minimal. Light cleanup only — trim whitespace, remove boilerplate fragments if obvious. Do NOT rewrite. The whole point is that this is their voice.

**Output**: Write directly to `entities.description` with `description_source = 'website'`.

**When this works**: Places with a well-written about page or homepage intro. Restaurants that have invested in telling their own story.

### Tier 2 — Synthesized From Their Copy

**Source**: The entity has website content (menu text, about fragments, homepage copy) but no single coherent paragraph. The raw material exists in `merchant_surface_artifacts` but needs assembly.

**Input to AI**: Relevant `text_blocks` from the entity's surfaces (about, homepage, menu), plus identity signals from `derived_signals` (identity_signals) for structural context.

**Prompt strategy**: Write a 2-3 sentence description *in the merchant's voice* by drawing from their own language. Use their vocabulary, their framing, their tone. Do not add editorial opinion. Do not evaluate. Describe what the place is, not why it's good.

**Constraints**:
- 40-80 words (compact identity paragraph)
- Must use language and details from the entity's own content
- Must not introduce facts not present in source material
- Must not use Saiko editorial voice (that's the tagline's job)
- Must not use superlatives, marketing language, or evaluative framing

**Output**: Write to `interpretation_cache` with `output_type = 'VOICE_DESCRIPTOR'`, `prompt_version = 'about-synth-v1'`. On the place page, `VOICE_DESCRIPTOR` takes precedence over `entities.description` when present.

**When this works**: Places with a website that has content scattered across pages but no single About paragraph.

### Tier 3 — Saiko-Written

**Source**: The entity has minimal or no website content. Saiko writes the description from available signals.

**Input to AI**: Identity signals (`place_personality`, `cuisine_posture`, `service_model`, `origin_story_type`, `signature_dishes`, `language_signals`), plus any available metadata (category, neighborhood, coverage sources).

**Prompt strategy**: Write a 2-3 sentence grounded description that feels close to merchant language but does not impersonate it. Warm, observational, specific. If identity signals reference a chef, a signature dish, a neighborhood story, or an origin — use those as anchors. Coverage sources may be referenced for factual grounding (chef names, recognitions, neighborhood context).

**Constraints**:
- 40-80 words
- Must only reference facts derivable from the input signals and coverage sources
- Must not invent details not present in source material
- Must not evaluate or recommend from an external perspective
- No first-person ("we", "our") — this is not the merchant speaking
- No marketing tone — warm but observational, not selling
- Tone: neutral descriptive voice that feels close to merchant language. "A seasonal pasta spot centered on…" not "We serve seasonal pasta inspired by…". NOT Saiko editorial, NOT guidebook, NOT review.

**Output**: Write to `interpretation_cache` with `output_type = 'VOICE_DESCRIPTOR'`, `prompt_version = 'about-compose-v1'`. Different prompt_version from Tier 2 so we can track which tier produced the output.

**When this works**: New entities, entities without websites, taco trucks/carts with minimal web presence.

## 4. Tier Selection Logic

```
# Gate: minimum data requirement
if entity has NO merchant surfaces AND NO identity_signals AND NO (category + neighborhood):
    → skip — not enough data to generate anything meaningful
    → section collapses per existing rules

# Tier selection
if entity has merchant_surface (about or homepage) with coherent text (≥30 words, not boilerplate):
    → Tier 1: extract and clean verbatim copy
    → write to entities.description, description_source = 'website'

elif entity has any merchant_surface_artifacts with usable text_blocks:
    → Tier 2: synthesize from their copy (prefer richest surface: about > homepage > menu)
    → write to interpretation_cache (VOICE_DESCRIPTOR, about-synth-v1)

elif entity has identity_signals or (category + neighborhood):
    → Tier 3: compose grounded description from signals + coverage sources
    → write to interpretation_cache (VOICE_DESCRIPTOR, about-compose-v1)

else:
    → no description generated (section collapses per existing rules)
```

## 5. Storage and Read Path

### Write targets

| Tier | Table | Key/Type | prompt_version |
|------|-------|----------|----------------|
| 1 | entities.description | — | N/A (verbatim) |
| 2 | interpretation_cache | VOICE_DESCRIPTOR | about-synth-v1 |
| 3 | interpretation_cache | VOICE_DESCRIPTOR | about-compose-v1 |

### Read path (API route)

The `/api/places/[slug]` route already reads `entities.description`. The read path needs to add:

```
1. Check interpretation_cache for VOICE_DESCRIPTOR (is_current = true)
2. If found → use as description, set descriptionSource accordingly
3. If not found → fall back to entities.description (existing behavior)
```

This mirrors the existing tagline read path (interpretation_cache → entities.tagline fallback).

### descriptionSource values

| Value | Meaning |
|-------|---------|
| `website` | Tier 1: verbatim merchant copy |
| `about-synth-v1` | Tier 2: synthesized from merchant surfaces |
| `about-compose-v1` | Tier 3: composed from signals |
| `editorial` | Legacy: hand-written by Saiko team |
| `google_editorial` | Legacy: Google Places editorial |

### Description quality metadata

Every generated description (Tiers 1-3) includes quality metadata stored alongside the content in `interpretation_cache.content` (JSON). This is not visible in the UI yet — it's infrastructure for future ranking, regeneration prioritization, and debugging.

```json
{
  "text": "A seasonal pasta spot centered on...",
  "description_quality": {
    "source_tier": 1 | 2 | 3,
    "source_coverage_score": 0.0-1.0,
    "signal_density": "low" | "medium" | "high"
  }
}
```

| Field | Definition |
|-------|-----------|
| `source_tier` | Which tier produced this description (1 = verbatim, 2 = synthesized, 3 = composed) |
| `source_coverage_score` | 0-1 score reflecting how much source material was available. 1.0 = rich about page + identity signals. 0.2 = category + neighborhood only. |
| `signal_density` | `high` = 3+ identity signals + surfaces. `medium` = 1-2 signals or surfaces. `low` = category/neighborhood only. |

**Why this matters**: Later, this unlocks ranking (better About → higher confidence), UI decisions (expand vs truncate), regeneration prioritization (re-run low-coverage entities first when new data arrives), and debugging weak entities.

For Tier 1 (verbatim), `source_coverage_score` is always 1.0 and `signal_density` is always "high" — the merchant wrote it themselves, that's the strongest signal.

## 6. Pipeline Integration

This becomes a new step in the enrichment pipeline, running after Stage 5 (Identity Signal Extraction) and after Stage 7 (Tagline Generation). It consumes:

- `merchant_surface_artifacts` (text_blocks from about/homepage surfaces)
- `derived_signals` (identity_signals)
- `entities` metadata (name, neighborhood, category)

It produces:
- `entities.description` update (Tier 1 only)
- `interpretation_cache` VOICE_DESCRIPTOR entry (Tiers 2 and 3)

### Idempotency

- Tier 1: Overwrite `entities.description` only if current description_source is null or weaker than 'website'
- Tiers 2/3: Use `writeInterpretationCache` with `is_current = true` (existing mechanism handles dedup)
- Reprocessing: `--reprocess` flag regenerates even if output exists

## 7. Rendering Changes

### Place page (Traces layer)

The About section currently renders `location.description`. After this change:

1. API returns the best available description (VOICE_DESCRIPTOR → entities.description fallback)
2. Page renders it identically — no visual change needed
3. `descriptionSource` is available for the TRACES appendix to attribute correctly

### Appendix attribution

The References section already maps `descriptionSource` to labels. New values should map:
- `about-synth-v1` → "Synthesized from merchant website"
- `about-compose-v1` → "Composed from identity signals"

## 8. Quality Rules

- **Never merge voices**: The About description is always Merchant Voice (Tiers 1-2: their own words or synthesized from their copy) or Grounded Descriptive Voice (Tier 3: warm, observational, no first-person). It is never Saiko editorial voice (that's the tagline) and never external media voice (that's the coverage note).
- **Omission over invention**: If a tier can't produce quality output, fall through to the next tier. If all three fail, collapse the section. No placeholder text.
- **Provenance preserved**: Every description tracks where it came from via `descriptionSource` / `prompt_version`.
- **Reversible**: VOICE_DESCRIPTOR entries are versioned and can be regenerated with new prompts without losing the original.

## 9. Scope and Non-Goals

**In scope**:
- Tier selection logic
- Tier 1 extraction (verbatim merchant copy from parsed surfaces)
- Tier 2 synthesis prompt (from merchant text + identity signals)
- Tier 3 composition prompt (from signals only)
- API read path update (VOICE_DESCRIPTOR → entities.description fallback)
- Appendix attribution for new source types

**Not in scope**:
- Visual redesign of the About section (existing rendering is fine)
- Changing the ABOUT section name or position
- Generating descriptions for non-restaurant entity types (future)
- Automated quality scoring of generated descriptions (future)

## 10. Resolved Questions

1. **Tier 1 coherence check**: Start with a minimum data requirement gate. Entities with nothing or very little (no surfaces, no identity signals, no category context) are excluded entirely — no description generated, section collapses. For Tier 1 candidates, coherence is assessed by text length and basic structure (not a nav dump, not a list of hours). No AI filter for v1 — manual review covers the initial set.

2. **Tier 2 source selection**: Use whichever surface has the richest content. Homepage is usually the best source. When multiple surfaces exist, prefer by richness (longest coherent text wins), with priority order: about > homepage > menu (for contextual framing only, not dish lists). Include the best surface in the synthesis prompt, not all of them.

3. **Tier 3 tone (REVISED x2)**: Tier 3 is a neutral descriptive voice that feels close to merchant language but does not impersonate it. Warm, observational, specific — not first-person, not marketing, not selling. The target is grounded description, not mimicry. "A seasonal pasta spot centered on…" not "We serve seasonal pasta inspired by…". Coverage sources may be used for factual grounding (chef names, awards, neighborhood context). This avoids fiction risk and keeps the trust model clean across weak-data entities.

4. **Regeneration trigger**: Yes — when merchant surfaces are re-fetched and the content relevant to description generation has substantially changed, VOICE_DESCRIPTOR should be regenerated. "Substantially changed" means new or different about/homepage text, not minor formatting changes. The `content_hash` on `merchant_surfaces` can serve as the change detection mechanism.

## 11. Open Questions

1. **Minimum data threshold**: What's the exact minimum for Tier 3? At least one of: identity_signals, category + neighborhood, or a single merchant surface? Needs calibration against actual entity coverage.
2. **Quality iteration on Tier 3 prompt**: The grounded descriptive voice will need prompt tuning. Plan for 2-3 prompt iterations before the output consistently reads right — warm and specific without crossing into impersonation or generic.

---
Revision History

| Version | Date | Changes | Author |
|---|---|---|---|
| 0.1 | 2026-03-16 | Initial draft from place page audit session | Bobby / Claude |
| 0.2 | 2026-03-16 | Resolved open questions 1-4. Tier 3 tone revised from neutral guide to merchant-voice mimicry. Minimum data gate added. | Bobby / Claude |
| 0.3 | 2026-03-16 | Tier 3 voice revised from mimicry to grounded descriptive (no first-person, no impersonation). Description quality metadata added (source_tier, source_coverage_score, signal_density). | Bobby / Claude |
