# Next Step: Clement Signoff — Validation Linkage & Scoring

**Objective:** Verify validation linkage works for four test places, then compute Energy + Formality scores and generate the validation report.

---

## Pre-requisite

Add the four Google Place IDs to **`data/validation-place-ids.json`**:

- dunsmoor  
- buvons  
- dan-tanas  
- covell  

**These must match the exact `google_place_id` values used in `golden_records.google_place_id`.**  
(Use Places API place_id, e.g. `ChIJ...` — not a CID or other Google Maps ID, or linkage will fail.)

---

## Execution Steps

### 1. Ensure Validation Linkage

```bash
npx tsx scripts/ensure-validation-linkage.ts
```

Creates or confirms:

- places rows  
- googlePlaceId linkage  
- golden_records row with matching `google_place_id`  

---

### 2. Run Linkage Doctor

```bash
npx tsx scripts/score-linkage-doctor.ts
```

**Expected for all four:** place Y, googlePlaceId set, golden_record Y.

---

### 3. Compute Scores (no dry-run)

```bash
npx tsx scripts/compute-place-scores.ts --place-slugs=dunsmoor,buvons,dan-tanas,covell
```

---

## Deliverables

1. **JSON report**  
   `tmp/place_scores_report_<date>.json`  
   Must include: `requestedSlugs`, `resolvedToGoldenRecords`, `missingSlugs`, `validationDebug` for all 4 places.

2. **Quick verification**

   ```bash
   jq '.validationDebug | keys' tmp/place_scores_report_<date>.json
   ```

   **Expected:**  
   `["buvons","covell","dan-tanas","dunsmoor"]`  
   (order may vary; confirms all four made it into the report.)

3. **Console output**  
   Requested / Resolved / Missing summary and full validation debug logs for each place.

---

## Guarantees

- Scoring logic unchanged  
- Additive-only schema  
- Deterministic validation output  
- No UI impact  

---

## Once the report lands

1. **Skim the 4 `validationDebug` blocks** — Confirm signal firing looks sane (language hits, flags, service_model/price_tier, etc.).
2. **Check distributions aren’t pathological** — e.g. energy not all clustering 45–55, formality not all clustering 40–50; scores should reflect real variation across the four places.
3. **Then Clement can write the freeze line** with a straight face.

---

*Signoff-ready. Execution discipline — systems validation before freeze.*
