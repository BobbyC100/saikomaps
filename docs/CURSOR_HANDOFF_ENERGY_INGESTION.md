# Cursor Handoff — Energy/Tag Ingestion & No-Popularity v1

**Date:** Feb 19, 2026  
**Context:** Saiko Maps Energy + Tag Engine. Unblocking coverage by fixing upstream data and shipping Energy v1 without popular_times.

---

## Project Context

- **Energy engine:** Scores places 0–100 on environmental stimulation (calm ↔ buzzing).
- **Tag engine:** Scores vibe tags (cozy, date_night, late_night, etc.) per place.
- **Blocker:** `golden_records.google_places_attributes` was ~0.4% populated; `popular_times` 0%.
- **Decision:** `popular_times` is NOT available from Google Places API. Energy v1 ships without it (Option A).

---

## Completed Work

1. **Backfill script** `scripts/backfill-google-places-attrs.ts`
   - Populates `golden_records.google_places_attributes` for linked places.
   - Eligibility: places with `googlePlaceId` and matching `golden_record`.
   - Run: `npm run backfill:google-attrs -- --all` (or `--limit N`, `--dry-run`, `--force`).
   - Requires `GOOGLE_PLACES_API_KEY`.

2. **Energy v1 no-popularity**
   - Formula: language + flags + sensory (popularity dropped).
   - Confidence weights: language 0.50, flags 0.30, sensory 0.20.
   - Migration: `prisma/migrations/20260219010000_energy_v1_no_popularity/`.

3. **`--only-missing-popular-times` warning**
   - Prints: "popular_times is NOT available; this will effectively process all eligible."

4. **Docs**
   - `docs/POPULAR_TIMES_AVAILABILITY.md` — why popular_times is unavailable.
   - `docs/ENERGY_SCORE_SPEC.md` — implementation note for v1 no-popularity.

---

## Current State (Last Known)

- **places_with_matching_golden_record:** 629
- **golden_records_with_attrs_present:** 0 (backfill not run — API key needed)
- **golden_records_with_description_or_about_copy:** 257
- **Target:** attrs present ≥60% of linked set (629).

---

## Next Steps (In Order)

1. **Run backfill** (requires `GOOGLE_PLACES_API_KEY` in `.env` / `.env.local`):
   ```bash
   npm run backfill:google-attrs -- --all
   npm run coverage:census
   ```
   Paste census output to confirm attrs present ≥60%.

2. **Apply migrations and recompute:**
   ```bash
   npx prisma migrate deploy
   npm run compute:energy -- --all
   npm run compute:tag-scores -- --all --version tags_v1 --depends energy_v1
   npm run coverage:census
   ```

3. **Build gold set** (gating item): 90 rows minimum (15 yes + 15 no per tag) for cozy, date_night, late_night in `data/gold_sets/vibe_tags_v1.csv`. Do this after attrs/energy/tag signals are populated.

---

## Key Files

| File | Purpose |
|------|---------|
| `scripts/backfill-google-places-attrs.ts` | Backfill Google attrs for golden_records |
| `lib/google-places.ts` | `getPlaceAttributes()`, `areAttributesPresent()`, `isPopularTimesPresent()` |
| `lib/energy-tag-engine/energy-v1.ts` | Energy formula (no popularity) |
| `lib/scoring/lexicons.ts` | `ENERGY_WEIGHTS_NO_POPULARITY` |
| `scripts/coverage-census.ts` | Coverage metrics; run via `npm run coverage:census` |
| `scripts/compute-energy.ts` | Compute energy scores |
| `scripts/compute-tag-scores.ts` | Compute tag scores |
| `data/logs/backfill-google-places-attrs_failures.json` | Backfill failure log |

---

## Constraints (Non-Goals)

- No energy/tag scoring logic changes beyond no-popularity.
- No eval harness changes.
- No time-bucket persistence.
- No admin tuning UI.
- No refactor of golden/places linkage.

---

## Open Questions

- None blocked. CTO confirmed Option A (popularity-free v1). If linkage or text coverage remains low after backfill, investigate before recompute.
