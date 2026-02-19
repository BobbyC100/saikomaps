# Energy + Weighted Tag Engine v1 — Implementation Summary

CTO Implementation Spec — Production Engineering. Baseline-only, script-based evaluation.

## What Was Implemented

### 1. Schema (Prisma + Migration)

- **`energy_versions`** — Version metadata (weights, lexicon_hash)
- **`tag_versions`** — Tag version metadata, `depends_on_energy_version` FK
- **`energy_scores`** — Per-place baseline energy with component breakdown:
  - `energy_score` (0–100), `energy_confidence` (0–1)
  - `popularity_component`, `language_component`, `flags_component`, `sensory_component`
  - `has_popularity`, `has_language`, `has_flags`, `has_sensory`
  - Unique `(place_id, version)`
- **`place_tag_scores`** — Per-place tag scores (0–1):
  - `cozy_score`, `date_night_score`, `late_night_score`, `after_work_score`, `scene_score`
  - `confidence`, `version`, `depends_on_energy_version`
  - Unique `(place_id, version)`

**Migration:** `prisma/migrations/20260219000000_add_energy_tag_engine_v1/`

### 2. Energy Engine (`lib/energy-tag-engine/`)

- **`energy-v1.ts`** — `computeEnergy(inputs, timeBucket?)` — v1 baseline only
- Components: popularity (0–50), language (-25..+25), flags (0–15), sensory (-5..+10)
- Confidence: weighted by presence (popularity 0.40, language 0.30, flags 0.10, sensory 0.10)
- If popularity missing: normalize proportionally (no default to 0)

### 3. Tag Scoring Engine (`lib/energy-tag-engine/`)

- **`tag-v1.ts`** — `computeTagScores(inputs)` — deterministic, no external API
- Tags: cozy, date_night, late_night, after_work, scene
- Uses energy_score + language signals + flags

### 4. Backfill Script (`scripts/backfill-energy-tag-engine.ts`)

```bash
npm run backfill:energy-tag [-- --dry-run]
npm run backfill:energy-tag [-- --energy-only]
npm run backfill:energy-tag [-- --tags-only]
npm run backfill:energy-tag [-- --place-slugs=a,b,c]
```

Reads from `golden_records`, writes to `energy_scores` and `place_tag_scores` keyed by `places.id`.

### 5. Evaluation Harness (`scripts/eval-tag-scores.ts`)

```bash
npm run eval:tag-scores -- --gold=data/gold-tag-scores.json [--tag-version=tags_v1] [--threshold=0.5]
```

**Gold set format (JSON):**

```json
[
  { "place_slug": "uovo-pasadena-pasadena", "tag": "cozy", "label": 1, "bucket": "strong_yes" },
  { "place_id": "uuid", "tag": "date_night", "label": 0, "bucket": "strong_no" }
]
```

**Outputs:** Precision, recall, F1, coverage, confidence distribution; coverage gating stats.

### 6. Admin UI

- **`/admin/energy`** — Histogram of energy_score, coverage %, avg confidence, last compute
- **`/admin/energy/inspect`** — Lookup by place slug or ID; shows energy components and tag scores

## Deployment Sequence (CTO Spec §12)

1. Migrate schema — `npx prisma migrate deploy`
2. Backfill energy_scores — `npm run backfill:energy-tag -- --energy-only`
3. Backfill tag_scores — `npm run backfill:energy-tag -- --tags-only` (or run full backfill)
4. Create gold test set — `data/gold-tag-scores.json` (see `data/gold-tag-scores.example.json`)
5. Run evaluation — `npm run eval:tag-scores -- --gold=data/gold-tag-scores.json`
6. Tune weights (in `lib/scoring/lexicons.ts` and tag logic)
7. Lock v1
8. Integrate into Saiko LA tag interpretation logic

## Acceptance Criteria Checklist (Spec §10)

- [ ] Energy scores computed for ≥80% of places
- [ ] Tag scores computed for ≥60% of places
- [ ] Evaluation harness runs successfully
- [ ] ≥3 tags meet precision ≥0.75 on strong_yes/strong_no buckets
- [ ] <15% of places shift >0.25 between minor versions (stability)
- [ ] Overnight recompute succeeds without failure

## Non-Goals (v1)

- No consumer-facing time-aware UI
- No tag-strength phrasing ("Very Cozy")
- No persisted time-bucket scores
- No in-browser model tuning lab
- No live lexicon editing UI
