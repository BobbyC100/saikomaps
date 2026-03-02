# SKAI-WO-ENT-TIER2-INGEST-001 — Tier 2 Contextual & Editorial Ingestion Scale Run

**Completed:** 2026-03-02

## Pre-Run KPI (Baseline)

| Metric | Value |
|--------|-------|
| Total entities | 241 |
| Tier 1 entities (with Google Place ID) | 215 |
| % with description/about | 31.5% |
| % with ≥1 editorial_source | 0.0% |
| % with vibe_tags | 0.0% |
| % with pull_quote or chef_recs | 0.0% |
| Flagged needs_human_review | 71 |
| % with hours | 91.7% |
| % with google_photos | 63.1% |
| % with google_places_attributes | 59.3% |

## Post-Run KPI

| Metric | Pre | Post | Delta |
|--------|-----|------|------|
| Total entities | 241 | 247 | +6 (LA Times imports) |
| Tier 1 entities | 215 | 221 | +6 |
| % with description | 31.5% | 34.8% (Tier 1) | +3.3pp |
| % with editorial_sources | 0.0% | 2.7% (Tier 1) | +2.7pp |
| % with vibe_tags | 0.0% | 0.0% | — |
| % with chef_recs | 0.0% | 5.0% (Tier 1) | +5.0pp |
| % with pull_quote | 0.0% | 0.0% | — |
| Flagged needs_human_review | 71 | 71 | — |
| % with hours | 91.7% | 92.3% (Tier 1) | +0.6pp |
| % with google_photos | 63.1% | 80.5% (Tier 1) | +17.4pp |
| % with google_places_attributes | 59.3% | 66.1% (Tier 1) | +6.8pp |
| energy_scores rows | — | 89 | — |
| entity_tag_scores rows | — | 89 | — |

## Pipelines Executed

### 1. Google Places Deep Attributes (Secondary Pass)

- **coverage-apply.ts** — `--apply --limit=200`
  - Processed: 21 entities
  - Succeeded: 21, Failed: 0
  - NEED_GOOGLE_PHOTOS: 20 filled, NEED_HOURS: 17 filled, NEED_GOOGLE_ATTRS: 3 filled
- **backfill-google-places-attrs.ts** — `--all`
  - Fetched: 24 golden_records (8 new + 16 from prior run)
  - Schema fix: `places` → `entities` (table rename)

### 2. Editorial Source Ingestion

- **import-latimes-missing-places.ts**
  - Created: 5 new places (Baja Subs, Great White, Night + Market Weho, Burritos La Palma, Oc & Lau)
  - Already existed: 3 (Bridgetown Roti, Ototo, Jar)
  - Schema fixes: `id`, `updatedAt`, `editorialSources`, `primary_vertical`, `map_places.upsert`
- **batch-add-latimes-chef-recs.ts**
  - Added: 20 chef recs
  - Skipped: 2 (Tsubaki not in DB)

### 3. Website-Based Enrichment

- **enrich-google-places-v2.ts** — Broken (uses stale `goldenRecord` Prisma model)
- **run-website-enrichment.ts** — 0 candidates (all entities with websites already have categories)
- **probe-google-places-field-coverage.ts** — Ran successfully; schema fix: `places` → `entities`

### 4. Derived Qualitative Layers

- **coverage-apply-description.ts** — 2 descriptions filled from Google editorial_summary
- **coverage-apply-tags.ts** — 0 candidates (TTL exclusion after coverage-apply)
- **backfill-energy-tag-engine.ts** — 89 energy + 89 tag scores computed (energy_scores, entity_tag_scores)
- **vibe_tags** — Not populated on entities; tag scores live in `entity_tag_scores` only

## What Filled Easily

- **Google photos** — +17.4pp on Tier 1 (80.5% coverage)
- **Chef recs** — 20 new recs attached; 5.0% of Tier 1 entities now have chef_recs
- **Editorial sources** — 2.7% via LA Times import (new places + map_places linkage)
- **Descriptions** — +3.3pp from Google editorial_summary
- **Google attrs** — +6.8pp on Tier 1 (66.1%)
- **Energy + tag scores** — 89 entities now have computed scores in `energy_scores` and `entity_tag_scores`

## What Failed Systematically

- **Website enrichment** — 0 candidates; selection logic requires `website + empty category + never enriched`. All entities with websites already have categories.
- **vibe_tags on entities** — Pipeline writes to `entity_tag_scores` only; no sync to `entities.vibe_tags`.
- **enrich-google-places-v2.ts** — Uses deprecated `goldenRecord` model; needs migration to `golden_records` + `entities`.

## What Clearly Requires Humans (Tier 3)

- **pull_quote / pull_quote_source** — 0% coverage; no automated source.
- **vibe_tags** — Needs human curation or a sync step from `entity_tag_scores` → `entities.vibe_tags`.
- **Tsubaki** — Place not in DB; chef recs from article cannot be attached.
- **needs_human_review** — 71 entities flagged; no automation to clear.

## Schema Fixes Applied

1. **backfill-google-places-attrs.ts** — `places` → `entities` in raw SQL JOIN
2. **probe-google-places-field-coverage.ts** — `places` → `entities` in raw SQL JOIN
3. **import-latimes-missing-places.ts** — Added `id`, `updatedAt`, `editorialSources`, `primary_vertical`, `map_places.upsert`, real `userId`

## Success Criteria Assessment

| Criterion | Status |
|-----------|--------|
| Tier 2 signals on majority (>60–70%) of Tier 1 entities | Partial — hours (92%), photos (80%), attrs (66%); description (35%), chef_recs (5%), editorial_sources (3%) |
| Clear visibility into automation vs human gaps | Yes — documented above |
| No schema regressions | Yes — fixes applied |
| System stress-tested at scale | Yes — 247 entities, 89 energy/tag scores |

## Recommendations

1. Add sync step: `entity_tag_scores` → `entities.vibe_tags` (or `thematic_tags`) for display.
2. Fix `enrich-google-places-v2.ts` to use `golden_records` + `entities`.
3. Add Tsubaki to DB and re-run chef recs batch.
4. Consider relaxing website enrichment selection (e.g. `--refresh` for stale) to increase candidate pool.
