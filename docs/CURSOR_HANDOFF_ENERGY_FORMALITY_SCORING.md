# Cursor Handoff — Energy + Formality Scoring (Locked)

**Goal:** Implement pipeline-generated, auditable scoring for Energy (0–100 INT) + confidence (0–1) and Formality (0–100 INT) + confidence (0–1). Per locked specs: `docs/ENERGY_SCORE_SPEC.md`, `docs/FORMALITY_SCORE_SPEC.md`. No mocks. No hand scoring. Post-run we only tune weights/lexicons, not dimensions.

---

## 1) Schema Changes (Prisma)

**Location:** `golden_records` (canonical place surface; Place Page can read from here when display is added).

**Fields added:**

| Field | Type | Notes |
|-------|------|--------|
| energy_score | Int? | 0–100 |
| energy_confidence | Float? | 0–1 |
| energy_version | String? | e.g. `"energy_v1_locked"` |
| energy_computed_at | DateTime? | For staleness/recompute |
| formality_score | Int? | 0–100 |
| formality_confidence | Float? | 0–1 |
| formality_version | String? | e.g. `"formality_v1_locked"` |
| formality_computed_at | DateTime? | For staleness/recompute |

**Migration:** `prisma/migrations/20260217100000_add_energy_formality_scoring/migration.sql` (backward-compatible; nullable columns only). Apply with `npx prisma migrate deploy` (or `migrate dev` in dev).

---

## 2) Where Scoring Runs

- **Trigger:** After data enrichment updates (Google attributes, coverage/about, identity fields).
- **Implementation:** `lib/scoring/` (pure functions) + `scripts/compute-place-scores.ts` (CLI backfill + report). Start with manual CLI for backfill and distribution review.

---

## 3) Inputs (per place, from golden_records)

**Energy:** popular-times (optional; if missing, reweight), coverage/about text, Google flags (liveMusic, goodForGroups), bar-forward proxy, compression + sensory terms from text.

**Formality:** service_model, price_tier, reservable, coverage/about text (reservation + dress/ritual + material language).

---

## 4) Scoring Functions

- **`lib/scoring/energy.ts`** — `computeEnergyScore(inputs)` → `{ score, confidence, version, debug }`. Implements all components; missing popular-times triggers reweight (no 0 penalty).
- **`lib/scoring/formality.ts`** — `computeFormalityScore(inputs)` → `{ score, confidence, version, debug }`. Implements service model, price tier, reservation, language, materials; clamp 0–100.
- **`lib/scoring/lexicons.ts`** — All term arrays and weight configs (tunable; dimensions locked).

---

## 5) Backfill Script + Report

- **Script:** `scripts/compute-place-scores.ts`
- **Usage:**
  - `npx tsx scripts/compute-place-scores.ts [--dry-run]` — score all ACTIVE golden_records.
  - `npx tsx scripts/compute-place-scores.ts --place-slugs=dunsmoor,buvons,dan-tanas,covell [--dry-run]` — resolve via **places** table (places.slug → google_place_id → golden_records), then score.
  - `npx tsx scripts/compute-place-scores.ts --golden-slugs=slug1,slug2 [--dry-run]` — filter by **golden_records.slug** directly.
- **Report (console):** "Requested slugs: X", "Resolved to golden_records: Y", "Missing slugs: …" (if any); histograms; validationDebug for the four validation slugs when present.
- **Report (JSON):** `./tmp/place_scores_report_<date>.json` includes `requestedSlugs`, `resolvedToGoldenRecords`, `missingSlugs`, histograms, and `validationDebug`.
- **Validation set:** When using `--place-slugs=dunsmoor,buvons,dan-tanas,covell`, all 4 resolved rows get validationDebug keyed by place slug (so "dunsmoor", etc.). Same four slugs are included in validationDebug when they appear in the processed set (e.g. when running full dataset).

---

## 5b) Linkage (place slug → golden_records)

- **Doctor:** `npx tsx scripts/score-linkage-doctor.ts [--slugs=dunsmoor,buvons,dan-tanas,covell]` — prints per slug: place exists?, googlePlaceId, golden_record exists?, golden_record id.
- **Fix linkage:** `npx tsx scripts/ensure-validation-linkage.ts [--dry-run]` — ensures the 4 validation slugs have a place and, when `data/validation-place-ids.json` has Google Place IDs, creates/updates golden_records and completes the graph. See `docs/SCORE_LINKAGE_README.md`.

---

## 6) Guardrails

- If confidence < 0.5: store score, do not display (display logic later).
- Never throw on missing optional signals; degrade confidence.
- Clamp all sub-scores within their ranges before summing.

---

## 7) Deliverables for Clement (Single Gate)

After script runs on full dataset, provide:

1. **Report JSON** — `./tmp/place_scores_report_<date>.json`
2. **Screenshot/printout** of distributions (histograms + displayable %)
3. **Four-place debug dump** — signals fired + component scores for dunsmoor, buvons, dan-tanas, covell

Then Clement can sign: **Product Freeze: Place Profile Scoring Approved**

---

## PR Acceptance Criteria (do not ship without)

- [ ] Migration applied (or applied in same PR); no breaking changes.
- [ ] `npx tsx scripts/compute-place-scores.ts --dry-run` runs and prints histograms.
- [ ] Report JSON is written to `./tmp/place_scores_report_<date>.json` with `energy` and `formality` histograms, displayable counts, and `validationDebug` for the four slugs.
- [ ] Four-place debug dump (validation set) is present in report and/or console for QA.
- [ ] No UI changes, no new API routes, no new features — schema + data layer + script only.
