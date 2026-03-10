---
doc_id: SAIKO-FIELDS-V2-CUTOVER-SPEC
doc_type: spec
status: active
owner: Bobby Ciccaglione
created: '2026-03-10'
last_updated: '2026-03-10'
project_id: SAIKO
systems:
  - database
summary: ''
---
# Fields v2 — Cutover Spec

**Status:** Ready to execute Phase 0–2. Phases 3–5 gated on verification.

---

## Knowledge Model

```
Observed Claims  →  Canonical Entity State  →  Derived Signals  →  Interpretation  →  Product
```

---

## Phase 0 — Exports (before any destructive work)

Run all six exports. Do not proceed until every file is confirmed non-empty and spot-checked.

| File | Source query | Purpose |
|---|---|---|
| `exports/seed-places.csv` | `SELECT id, slug, name, website, google_place_id, instagram, neighborhood FROM entities WHERE status='OPEN'` | Reseed list |
| `exports/seed-human-decisions.csv` | See query below | Highest-trust signals — preserve as human-reviewed claims |
| `exports/human-operator-links.csv` | `SELECT * FROM PlaceActorRelationship` | Manually linked operators |
| `exports/human-coverage-sources.csv` | `SELECT * FROM coverage_sources` | Editorial links |
| `exports/human-gpid-decisions.csv` | `SELECT * FROM gpid_resolution_queue WHERE human_status IS NOT NULL` | Confirmed GPIDs |
| `exports/trusted-sources.csv` | `SELECT * FROM sources` | Trust tier registry |

**Human decisions query:**
```sql
SELECT
  e.slug,
  e.name,
  'category_override'     AS decision_type,
  e.category              AS value,
  'entities.category'     AS source_field
FROM entities e
WHERE e.description_reviewed = true   -- manually reviewed descriptions
UNION ALL
SELECT e.slug, e.name, 'gpid_confirmed', q.candidate_gpid, 'gpid_resolution_queue'
FROM gpid_resolution_queue q
JOIN entities e ON e.id = q."entityId"
WHERE q.human_status = 'APPROVED'
UNION ALL
SELECT e.slug, e.name, 'operator_link', a.name, 'PlaceActorRelationship'
FROM "PlaceActorRelationship" par
JOIN entities e ON e.id = par."entityId"
JOIN "Actor" a ON a.id = par."actorId";
```

These re-enter the system as `observed_claims` with `source_id = 'human_review'`, `extraction_method = 'HUMAN'`, and are auto-sanctioned via `SanctionMethod.HUMAN_APPROVED`.

---

## Phase 1 — Safety Snapshot

```bash
pg_dump $DATABASE_URL -Fc -f saiko-fields-v1-snapshot-$(date +%Y%m%d).dump
```

Store off-cluster. Verify file size. Record Neon branch/project name and timestamp.

---

## Phase 2 — Seed Registries + Populate Canonical State

```bash
# 1. Seed source_registry and attribute_registry (idempotent)
npx ts-node scripts/seed-fields-v2-registries.ts

# 2. Dry run first — verify entity count
npx ts-node scripts/populate-canonical-state.ts --dry-run

# 3. Populate all entities
npx ts-node scripts/populate-canonical-state.ts
```

Expected output: `~247 entities created, 0 errors`.

---

## Phase 2b — Sanctioning Spot-Check Gate ⚠️

**Do not proceed to Phase 3 until this passes.**

Manually verify 10–15 entities covering: a chain restaurant, a solo operator, a wine bar, a coffee shop, a place with manual GPID override.

For each spot-check entity, confirm:

```sql
-- 1. canonical_entity_state is populated
SELECT name, google_place_id, address, hours_json IS NOT NULL
FROM canonical_entity_state WHERE entity_id = '<id>';

-- 2. At least one canonical_sanction per identity-critical field
SELECT attribute_key, sanction_method, is_current
FROM canonical_sanctions
WHERE entity_id = '<id>' AND is_current = true
ORDER BY attribute_key;

-- 3. No open sanction_conflicts for identity-critical fields
SELECT * FROM sanction_conflicts
WHERE entity_id = '<id>' AND status = 'OPEN';

-- 4. Place page still renders correctly (visual check)
-- GET /api/places/<slug>
```

If any spot-check entity has wrong canonical winners, fix `populate-canonical-state.ts` and re-run before continuing.

---

## Phase 3 — Rewire API + Verify

The API route (`app/api/places/[slug]/route.ts`) is already updated with dual-read: `canonical_entity_state` primary, `entities` columns fallback. No further code change needed.

Verify in production:
- [ ] 5+ place pages load with correct data
- [ ] `prl`, `scenesense`, `offeringSignals` all populated
- [ ] `tagline` and `pullQuote` populated from `interpretation_cache`
- [ ] No 500 errors in logs

---

## Phase 4 — Slim Entities

Run only after Phase 3 is verified green.

```bash
psql $DATABASE_URL -f prisma/migrations/20260306200000_slim_entities_fields_v2/migration.sql
```

This drops all data-carrying columns from `entities`, leaving only the routing shell:  
`id`, `slug`, `business_status`, `primary_vertical`, `created_at`, `updated_at`.

After applying: re-run spot-check verification from Phase 2b.

---

## Phase 5 — Drop Legacy Tables

Run only after Phase 4 is verified green. Requires a fresh snapshot immediately before.

```bash
pg_dump $DATABASE_URL -Fc -f saiko-fields-v2-pre-drop-$(date +%Y%m%d).dump
psql $DATABASE_URL -f prisma/migrations/20260306300000_drop_legacy_tables_fields_v2/migration.sql
```

Pre-flight checks before running:
```sql
SELECT COUNT(*) FROM canonical_entity_state;  -- must equal entities count
SELECT COUNT(*) FROM canonical_sanctions;     -- must be non-zero
SELECT COUNT(*) FROM derived_signals;         -- must be non-zero
SELECT COUNT(*) FROM interpretation_cache;    -- must be non-zero
```

---

## System Classification: Analytics, Cache, Dashboard, Reporting

### Rewire to Fields v2 (keep the system, change the input source)

| System | Current dependency | New input | Priority |
|---|---|---|---|
| `energy_scores` / `place_tag_scores` | reads from `entities` + `golden_records` | read from `canonical_entity_state` + `derived_signals` | Before Phase 5 |
| Admin energy dashboard (`/admin/energy`) | reads `energy_scores` directly | no change — table preserved | Low |
| SceneSense assembly (`lib/scenesense/`) | reads `golden_records.identity_signals` | read from `derived_signals` (signal_key='identity_signals') | Before Phase 5 |
| Voice Engine v2 (`lib/voice-engine-v2/`) | reads `golden_records.tagline_signals` | read from `derived_signals` | Before Phase 5 |
| Search route (`/api/search`) | reads `golden_records` for identity signals + menu/winelist | read from `canonical_entity_state` + `derived_signals` | Before Phase 5 |
| `TraceSignalsCache` | FKs to `golden_records.canonical_id` | rewire FK to `entities.id` (after golden_records drop) | Before Phase 5 |

### Discard (treat as disposable — regenerate from clean state)

| System | Table(s) | Reason |
|---|---|---|
| MDM resolver pipeline | `raw_records`, `entity_links`, `resolution_links` | Replaced by `observed_claims` + `canonical_sanctions` |
| Legacy review queue | `review_queue`, `review_audit_log` | Replaced by `sanction_conflicts` |
| Merchant signals | `merchant_signals`, `merchant_enrichment_runs` | Replaced by `observed_claims` write path |
| Legacy confidence scoring | `entities.confidence`, `entities.field_confidences` | Replaced by `canonical_sanctions.sanction_method` + `canonical_sanctions.confidence` |
| Mixed provenance JSONB | `golden_records.provenance_v2`, `golden_records.source_attribution` | Replaced by `canonical_sanctions` audit trail |
| `coverage_runs` | `coverage_runs` | Run metadata only — disposable |
| Tagline generation cache on golden | `golden_records.tagline`, `golden_records.tagline_candidates` | Replaced by `interpretation_cache` |
| Signal cache on golden | `golden_records.identity_signals`, `golden_records.cuisine_posture`, etc. | Replaced by `derived_signals` |

### Discard and rebuild (materialized views)

| View | Current definition | Fields v2 replacement |
|---|---|---|
| `v_places_la_bbox` | `SELECT * FROM places WHERE lat/lng IN bbox` | `SELECT ces.* FROM canonical_entity_state ces JOIN entities e ON e.id = ces.entity_id WHERE ces.latitude BETWEEN 33.70 AND 34.85 AND ces.longitude BETWEEN -118.95 AND -117.60` |
| `v_places_la_bbox_golden` | joins `places` + `golden_records` by `google_place_id` | Drop. Use `canonical_entity_state` directly — the join is now internal. |

Both views depend on `places` (old table name) and `golden_records`. Drop and recreate against `canonical_entity_state` before Phase 5.

`app/api/admin/photo-eval/queue/route.ts` uses `v_places_la_bbox` — update this query to join `canonical_entity_state` directly before Phase 5.

### Rewire admin dashboard stats (`/api/admin/stats`)

Currently reads: `review_queue`, `golden_records`, `entity_links`, `raw_records`.

Replace with:

| Old stat | New query |
|---|---|
| `review_queue.count` | `sanction_conflicts.count WHERE status='OPEN'` |
| `golden_records.count` | `canonical_entity_state.count` |
| `entity_links.count` | `canonical_sanctions.count WHERE is_current=true` |
| `raw_records.count` | `observed_claims.count` |

---

## Slug Continuity

`slug` is registered in `attribute_registry` with:  
`identity_critical: true`, `sanction_threshold: 0.95`, `decay_policy: NONE`.

The `slug` column on `entities` is never dropped — it is the external routing key for all URLs and must survive every migration phase. The `canonical_entity_state` does not need its own `slug` column because the FK from `canonical_entity_state.entity_id → entities.id` gives you `entities.slug` in one join.

---

## Freeze List (scripts to not run against prod until v2 is stable)

Stop all direct writes to `golden_records`, `raw_records`, `merchant_signals` before Phase 3:

```
scripts/extract-identity-signals.ts   → OK (writes derived_signals in v2 path)
scripts/generate-taglines-v2.ts       → OK (writes interpretation_cache in v2 path)
scripts/resolver-pipeline.ts          → FREEZE until MDM rewrite
scripts/resolve-golden-first.ts       → FREEZE
scripts/promote-golden-to-places.ts   → FREEZE
scripts/sync-golden-to-places.ts      → FREEZE
scripts/backfill-google-places.ts     → FREEZE (reads ok, writes target golden)
scripts/enrich-google-places.ts       → FREEZE
```

Enrichment scripts that write via `lib/fields-v2/write-claim.ts` (`writeClaimAndSanction`) are safe to run at any phase.

---

## Rollback

If anything in Phase 3 or later breaks:

1. Restore from snapshot: `pg_restore -d $DATABASE_URL saiko-fields-v1-snapshot-YYYYMMDD.dump`
2. The `canonical_entity_state`, `observed_claims`, and `canonical_sanctions` tables can be truncated and repopulated — they contain no data that doesn't exist in `entities` or `golden_records`.
3. The API route fallback path (reading from legacy `entities` columns when `canonical_state` is null) remains active until the slim-entities migration runs.

---

## Open Decisions (Bobby must confirm before Phase 3)

1. **`description` auto-sanction**: Can `description` from a tier-1 editorial source (Eater, LA Times) be auto-sanctioned `AUTO_HIGH_CONFIDENCE`, or does it always require `HUMAN_APPROVED`?

2. **Entity creation policy**: For a new place arriving from a tier-1 source that doesn't match any existing entity: create the `entities` row immediately, or route to `sanction_conflicts` for human review? Proposed: create directly for tier 1–2, conflict queue for tier 3+.

3. **`google_places_attributes` granularity**: Store as one claim per API call (blob as `raw_value`), or decompose into individual claims per serving flag? Proposed: one blob claim.

4. **SceneSense PRL caching**: Is the PRL computation a pure weighted sum from `derived_signals` (render-time), or LLM-backed (cache in `interpretation_cache`)? Determines whether `SCENESENSE_PRL` cache entries are needed.
