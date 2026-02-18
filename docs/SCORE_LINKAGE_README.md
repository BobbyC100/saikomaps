# Score linkage — validation slugs

The Energy + Formality scorer resolves places by:

**place slug → places.googlePlaceId → golden_records.google_place_id**

## Scripts

- **`scripts/score-linkage-doctor.ts`** — For each requested slug, prints: place exists?, googlePlaceId, golden_record exists?, golden_record id.  
  `npx tsx scripts/score-linkage-doctor.ts [--slugs=dunsmoor,buvons,dan-tanas,covell]`

- **`scripts/ensure-validation-linkage.ts`** — Ensures the 4 validation slugs have a place and, when possible, a golden_record linked by google_place_id. Creates missing places (with optional seed Google IDs). Creates minimal golden_records when a place has googlePlaceId.  
  `npx tsx scripts/ensure-validation-linkage.ts [--dry-run]`

## Pre-requisite: Google Place IDs

Add the four Google Place IDs to **`data/validation-place-ids.json`**:

- dunsmoor  
- buvons  
- dan-tanas  
- covell  

**These must correspond to the exact `google_place_id` values used in `golden_records.google_place_id`.**  
Use the Places API place_id (e.g. `ChIJ...`), not a CID or other Google Maps identifier — otherwise linkage will fail and you’ll be chasing ghosts.

## Execution (tightened)

1. **Ensure validation linkage**  
   `npx tsx scripts/ensure-validation-linkage.ts`  
   Creates or confirms: places rows, googlePlaceId linkage, golden_records rows with matching `google_place_id`.

2. **Run linkage doctor**  
   `npx tsx scripts/score-linkage-doctor.ts`  
   Expected for all four: place Y, googlePlaceId set, golden_record Y.

3. **Compute scores (no dry-run)**  
   `npx tsx scripts/compute-place-scores.ts --place-slugs=dunsmoor,buvons,dan-tanas,covell`

4. **Quick verification**  
   ```bash
   jq '.validationDebug | keys' tmp/place_scores_report_<date>.json
   ```  
   Expected: `["buvons","covell","dan-tanas","dunsmoor"]` (order may vary).  
   Confirms all four slugs are present in the report.

## Canonical signoff block

See **`docs/CLEMENT_SIGNOFF_SCORING.md`** for the full, signoff-ready execution block (objective, pre-req, steps, deliverables, verification, guarantees).
