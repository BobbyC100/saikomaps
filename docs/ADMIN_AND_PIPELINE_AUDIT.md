# Admin & Data Pipeline Audit — Factual Inventory

**Date:** 2026-02-26  
**Scope:** Admin UI, identity layer, enrichment, dedupe, place record state, gaps.  
**No changes made.** Read-only inventory.

---

## 1. Admin UI Surface

### Admin Routes / Pages

| Route | Purpose |
|-------|---------|
| `/admin/review` | Review queue: pending raw-records conflicts (low_confidence_match, attribute_mismatch, potential_duplicate, new_entity) |
| `/admin/coverage` | Coverage audit: total places, LA/OC counts, neighborhood × primary_vertical breakdown; same content as `/coverage` |
| `/admin/energy` | Energy engine dashboard: coverage %, avg confidence, histogram, last compute timestamp |
| `/admin/energy/inspect` | Inspect energy by place (query param: place slug) |
| `/admin/photo-eval` | Photo evaluation: queue of places with Google photos; assign HERO/GALLERY/REJECT per photo |
| `/admin/instagram` | Instagram backfill: list places missing Instagram; update handle or mark "no Instagram" |

### Admin API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/admin/review-queue` | GET | List pending review items (status, conflict_type, limit, offset) |
| `/api/admin/review-queue/[id]/resolve` | POST | Resolve item (merged / kept_separate / new_canonical / dismissed / flagged) → **DB write** |
| `/api/admin/review-queue/[id]/skip` | POST | Skip/defer item → **DB write** |
| `/api/admin/import` | POST | Import editorial CSV into `raw_records` → **DB write** |
| `/api/admin/places/[id]/close` | POST | Mark place closed (lifecycle_status → CLOSED_PERMANENTLY / ARCHIVED) → **DB write** (golden_records) |
| `/api/admin/photo-eval` | POST | Persist photo tier/type (upsert place_photo_eval) → **DB write** |
| `/api/admin/photo-eval/queue` | GET | Fetch places needing photo eval |
| `/api/admin/photo-eval/[placeId]` | GET | Fetch place photos for eval |
| `/api/admin/instagram` | GET | List places missing Instagram; POST → **DB write** (golden_records.instagram_handle) |
| `/api/admin/stats` | GET | Stats endpoint |
| `/api/admin/prl-census` | GET | PRL census |

### Actions: Writes vs Simulate

- **Review resolve/skip:** DB writes (review_queue status, entity_links, raw_records, golden via survivorship).
- **Import CSV:** DB writes (raw_records).
- **Close place:** DB writes (golden_records lifecycle_status).
- **Photo eval:** DB writes (place_photo_eval).
- **Instagram update:** DB writes (golden_records.instagram_handle).
- **Coverage / Energy / Stats / PRL census:** Read-only, no DB writes.

### Data Visible in Admin

- Review queue: raw records, conflict type, match_confidence, distance.
- Coverage: golden_records counts, places neighborhood × primary_vertical.
- Energy: energy_scores histogram, coverage %, last compute.
- Photo eval: place photos, tier/type.
- Instagram: golden_records missing instagram_handle.

### Data NOT Visible in Admin (exists in DB)

- `places` confidence JSONB, overall_confidence, confidence_updated_at
- `places` last_enriched_at, enrichment_stage, needs_human_review, category_enrich_attempted_at
- `merchant_enrichment_runs`, `merchant_signals`
- `review_audit_log`
- GPID resolution status (MATCH/AMBIGUOUS/NO_MATCH/ERROR) — CSV only, not in DB

---

## 2. Identity Layer

### Where Resolver Status Is Stored

- **GPID resolution (places):** NOT in DB. `scripts/gpid-resolution-dryrun.py` outputs to CSV only (`data/logs/gpid_resolution_dryrun.csv`). Status/reason (MATCH, AMBIGUOUS, NO_MATCH, ERROR) live in CSV. With `--apply`, only `places.google_place_id` is written; status/reason are not persisted.
- **Entity resolution (raw → golden):** `review_queue` has conflict_type, match_confidence, status. Resolution outcomes (merged, kept_separate, etc.) update `review_queue` and `entity_links`. No explicit MATCH/AMBIGUOUS/NO_MATCH enum; conflict_type values: low_confidence_match, attribute_mismatch, potential_duplicate, new_entity.

### MATCH / AMBIGUOUS / NO_MATCH / ERROR

- **Not persisted** for GPID resolution. They exist only in the CSV.
- `identity:audit` reads the CSV and aggregates status/reason; no DB column for GPID resolution outcome.

### Visible in Admin

- Review queue shows conflict_type and match_confidence.
- GPID resolution outcome: not in admin; surfaced via `npm run identity:audit` (reads CSV).

### Fields That Determine Identity State

- **places:** `google_place_id` (unique when non-empty)
- **golden_records:** `google_place_id`, `slug`, `lifecycle_status`
- **entity_links:** raw_id → canonical_id
- **review_queue:** conflict_type, match_confidence, status (pending / resolved / deferred / flagged)

---

## 3. Enrichment Layer

### Enrichment Jobs

| Job | Script | Trigger | Writes |
|-----|--------|---------|--------|
| Website enrichment | `run-website-enrichment.ts` | Manual CLI (`npm run enrich:website`) | places (category, merchant_signals, last_enriched_at, etc.), merchant_enrichment_runs |
| Website category-only | Same script, `--mode=categoryOnly` | Manual CLI | places.category, category_enrich_attempted_at |
| Backfill websites | `backfill-websites-from-google.ts` | Manual CLI | places.website |
| Google Places enrich | `enrich-google-places.ts` | Manual CLI | places (from Google API) |
| Backfill Google attrs | `backfill-google-places-attrs.ts` | Manual CLI | places.google_places_attributes |
| Backfill confidence | `backfill-confidence.ts` | Manual CLI | places confidence, golden_records |
| Energy compute | `compute-energy.ts` | Manual CLI | energy_scores |
| Tag scores | `compute-tag-scores.ts` | Manual CLI | place_tag_scores |

### Triggering

- **Manual / CLI only.** No cron, no Vercel cron, no scheduled jobs in package.json or config.

### Tables for Enrichment Results

- **places:** last_enriched_at, enrichment_stage, needs_human_review, category_enrich_attempted_at, confidence, overall_confidence, google_places_attributes
- **merchant_enrichment_runs:** append-only audit per fetch
- **merchant_signals:** current best per place (upsert)
- **energy_scores:** energy_score, energy_confidence, version
- **place_tag_scores:** tag scores per place

### Per-Place Enrichment History

- `merchant_enrichment_runs` stores runs per place_id; no single “summary” view in admin.
- `places.last_enriched_at`, `enrichment_stage` indicate last full enrichment.
- No admin UI showing enrichment history.

### Admin Surface

- Energy dashboard shows aggregate energy coverage and histogram.
- No admin UI for website enrichment, merchant_signals, or merchant_enrichment_runs.

---

## 4. Dedupe / Manual Review

### Dedupe Functionality

| Script | Purpose | Persists? | Tables Modified |
|--------|---------|-----------|-----------------|
| `find-duplicate-places.ts` | Find duplicate google_place_id | No (read-only) | — |
| `find-potential-duplicates.ts` | Find duplicate GPIDs, slugs, near-duplicates | No (read-only) | — |
| `cleanup-duplicate-places.ts` | Delete duplicate places (keep one), migrate map_places | Yes with `--execute` | places, map_places |
| `merge-duplicate-places.ts` | Merge predefined slug pairs | Yes with `--execute` | places, map_places, viewer_bookmarks |
| Review queue resolve | Manual merge/kept_separate/etc. | Yes | review_queue, entity_links, raw_records, golden_records (via survivorship) |

### Audit Logs

- **review_audit_log:** Created on each resolve (queue_id, resolved_by, resolution, decision_time_ms). No log for skip.
- **cleanup-duplicate-places / merge-duplicate-places:** No audit log; only console output.

---

## 5. Place Record State

### places Model (Key Fields)

| Field | Required? | Notes |
|-------|-----------|-------|
| id | Yes | PK |
| slug | Yes | Unique |
| name | Yes | |
| google_place_id | No | Unique when non-empty |
| address | No | |
| latitude, longitude | No | Decimal? |
| phone, website, instagram | No | |
| hours | No | Json? |
| description | No | |
| neighborhood, category | No | |
| primary_vertical | Yes | EAT/STAY/etc., default EAT |
| status | Yes | PlaceStatus, default OPEN |
| confidence, overall_confidence | No | Confidence v1 |
| last_enriched_at, enrichment_stage, needs_human_review | No | Website enrichment |
| business_status | No | From Google |

### Minimum Viable Place (Today)

- **Required:** id, slug, name, primary_vertical, status.
- **Strongly expected for display/coverage:** lat/lng or address, category.
- **Identity:** google_place_id preferred for dedupe and Google integration; many places can have null GPID until resolved.

---

## 6. Gaps & Unknowns

### Prisma Model Name Mismatch

- **Schema:** Model is `places` (plural).
- **Scripts:** Several use `prisma.place` (singular): cleanup-duplicate-places, merge-duplicate-places, find-duplicate-places, find-potential-duplicates, backfill-google-places, backfillCategories, migrate-locations-to-places, seed-field-notes-map, seed-database, diagnose-missing-photos, enrich-place-with-bento-data, backfill-intent-profiles, investigate-backfill-failures, update-phone.js, update-instagram.js, audit-data.js, etc.
- **Effect:** `prisma.place` does not exist if the client follows the schema; these scripts may throw at runtime unless there is a custom mapping.

### Actions That Do Not Persist

- `find-duplicate-places`, `find-potential-duplicates`: Read-only.
- `gpid-resolution-dryrun.py` (default): Dry run; no DB writes.
- `identity:audit`: Read-only.
- Coverage / Energy / Stats APIs: Read-only.

### Partially Implemented / Disconnected

- **Close place API:** Updates `golden_records` by `canonical_id`; Instagram admin passes `canonical_id`. Places table is not updated for closure; sync-golden-to-places propagates golden → places.
- **GPID resolution:** Resolution status (MATCH/AMBIGUOUS/etc.) only in CSV; no DB column. Admin has no GPID resolution UI; only `identity:audit` CLI.
- **needs_human_review:** Set by website enrichment; no admin queue or UI to triage.
- **Scheduled jobs:** No cron or scheduler; all enrichment/backfill is manual CLI.

### Coverage Page Auth

- `/admin/coverage` bypasses admin check in middleware (“Allow /admin/coverage to pass through”). Same content as `/coverage`; coverage is effectively public.
