# Deferred Migration Gates

**Status:** Reference / Enforced  
**Purpose:** Make deferred migrations legible, intentional, and safe to apply  
**Owner:** Bobby  
**Last Updated:** 2026-03-09

---

## Why This Document Exists

Two migrations are intentionally deferred and represent the architectural path toward Fields v2:

- `prisma/migrations/20260306200000_slim_entities_fields_v2/migration.sql`
- `prisma/migrations/20260306300000_drop_legacy_tables_fields_v2/migration.sql`

These are **architectural gates**, not abandoned migrations. They are marked DEFERRED at the top of their SQL files and must not be applied by `prisma migrate deploy`. They will be applied manually, once, when all prerequisites below are met and verified.

If prerequisites are missing, applying these migrations will break production.

---

## Gate 1 — `20260306200000_slim_entities_fields_v2`

### Intent

Strip `entities` down to its routing shell. After this migration runs, `entities` will contain only:

```
id, slug, primary_vertical, status, businessStatus, entity_type, created_at, updated_at
```

All data-carrying columns will be dropped. There is no rollback short of restoring from backup.

### Prerequisites

All of the following must be true before this migration is applied:

**1. canonical_entity_state is fully populated**

```sql
-- These two counts must be equal
SELECT COUNT(*) FROM entities;
SELECT COUNT(*) FROM canonical_entity_state;
```

Every entity must have a row in `canonical_entity_state` with its name, address, coordinates, and other canonical facts. Run `scripts/populate-canonical-state.ts` if coverage is incomplete.

**2. Product/API surfaces no longer rely on removed entities fields**

The following API routes must have been audited and confirmed to read exclusively from `canonical_entity_state` (no legacy entity column fallbacks):

- `app/api/places/[slug]/route.ts` — currently uses dual-read; fallback must be removed
- `app/api/admin/places/search/route.ts` — must read from canonical_entity_state
- Any other route querying `entities` for data-carrying fields (name, address, etc.)

Verify by searching for legacy field reads in API routes:
```
rg "entity\.name|entity\.address|entity\.latitude|entity\.website" app/api/
```

**3. interpretation_cache is ready for editorial fields**

Check that taglines and pull quotes have been populated:
```sql
SELECT COUNT(*) FROM interpretation_cache WHERE output_type = 'TAGLINE' AND is_current = true;
SELECT COUNT(*) FROM interpretation_cache WHERE output_type = 'PULL_QUOTE' AND is_current = true;
```

These counts do not need to match entity count — not every entity has a tagline. But the API routes must be reading from `interpretation_cache` as primary, with no hard dependency on the legacy `entities.tagline` or `entities.pull_quote` columns.

**4. Operational workflow state is available outside entities**

The following fields must have been migrated to `place_coverage_status` (or a successor operational table), and the pipeline scripts updated:

| entities field | Migration target |
|---|---|
| `last_enriched_at` | `place_coverage_status.last_success_at` |
| `needs_human_review` | `place_coverage_status.needs_human_review` |
| `category_enrich_attempted_at` | `place_coverage_status.last_attempt_at` |

Pipeline scripts to update:
- `lib/website-enrichment/write-rules.ts`
- `scripts/run-website-enrichment.ts`
- `scripts/seco-derived-reset.ts`

**5. Views have been dropped or rebuilt**

Both of the following views must be dropped before this migration runs (they select columns that will be removed):

- `v_places_la_bbox` — selects ~35 entities columns
- `v_entity_launch_readiness_v0` — already likely broken; must be formally dropped

```sql
DROP VIEW IF EXISTS v_entity_launch_readiness_v0;
DROP VIEW IF EXISTS v_places_la_bbox;
```

After migration, rebuild `v_places_la_bbox` to read from `canonical_entity_state`.

**6. migrate-actor-relationships-to-entities.ts has been run and validated**

The script `scripts/migrate-actor-relationships-to-entities.ts` must be run with `--apply` and produce a clean audit output (zero orphans, constraint rewired).

**7. A pre-migration sanity snapshot has been captured**

Run the pre-flight check query block below and save output to `data/migrations/pre_slim_entities_snapshot_<YYYYMMDD>.txt`:

```sql
-- Row counts
SELECT 'entities' AS tbl, COUNT(*) AS ct FROM entities
UNION ALL SELECT 'canonical_entity_state', COUNT(*) FROM canonical_entity_state
UNION ALL SELECT 'interpretation_cache', COUNT(*) FROM interpretation_cache
UNION ALL SELECT 'canonical_sanctions', COUNT(*) FROM canonical_sanctions
UNION ALL SELECT 'derived_signals', COUNT(*) FROM derived_signals;

-- Confirm canonical coverage: entities with NO canonical_state row
SELECT COUNT(*) AS entities_without_canonical_state
FROM entities e
LEFT JOIN canonical_entity_state ces ON ces.entity_id = e.id
WHERE ces.entity_id IS NULL;

-- Confirm view state
SELECT viewname, definition FROM pg_views
WHERE viewname IN ('v_places_la_bbox', 'v_entity_launch_readiness_v0');
```

### Gate Check Questions

Before applying, answer YES to all:

- [ ] `SELECT COUNT(*) FROM entities` equals `SELECT COUNT(*) FROM canonical_entity_state`?
- [ ] Place pages render correctly reading from `canonical_entity_state` only (test 5 places manually)?
- [ ] `v_places_la_bbox` and `v_entity_launch_readiness_v0` have been dropped?
- [ ] `migrate-actor-relationships-to-entities.ts --apply` completed with zero orphans?
- [ ] Pipeline scripts have been updated to read/write `place_coverage_status`?
- [ ] Backup taken within the last 24 hours?

### Apply Command

```bash
psql $DATABASE_URL -f prisma/migrations/20260306200000_slim_entities_fields_v2/migration.sql
```

### Post-Apply Verification

```sql
-- Confirm routing shell only
\d entities

-- Confirm no legacy column reads fail
SELECT id, slug, primary_vertical, status, entity_type FROM entities LIMIT 5;

-- Confirm canonical state still readable
SELECT entity_id, name, address FROM canonical_entity_state LIMIT 5;
```

---

## Gate 2 — `20260306300000_drop_legacy_tables_fields_v2`

### Intent

Drop legacy MDM tables and `golden_records` that are no longer part of the v2 architecture. After this migration runs, the following tables will not exist:

- `golden_records`
- `raw_records`
- `entity_links`
- `resolution_links`
- `review_queue`
- `review_audit_log`
- `merchant_signals`
- `merchant_enrichment_runs`

There is no rollback short of restoring from backup.

### Prerequisites

All Gate 1 prerequisites must be complete, plus:

**1. All reads/writes have been migrated off legacy tables**

Verify no active code references these tables:

```bash
rg "golden_records|raw_records|entity_links|resolution_links|review_queue|review_audit_log|merchant_signals|merchant_enrichment_runs" app/ lib/ scripts/ --type ts
```

Expected result: only comments or explicitly marked fallback paths. Any active use blocks Gate 2.

**2. The API route fallback golden_records read has been removed**

`app/api/places/[slug]/route.ts` currently contains a fallback read from `golden_records`:
```typescript
// TODO: remove after populate-canonical-state.ts has run and slim-entities migration applied
!cs && place.googlePlaceId
  ? db.golden_records.findFirst(...)
  : Promise.resolve(null)
```

This must be removed and the downstream references to `goldenRecord` cleaned up.

**3. migrate-actor-relationships-to-entities.ts has been applied (Gate 1 prerequisite)**

The `EntityActorRelationship` FK must already point to `entities.id` before this migration drops `golden_records`.

**4. EntityActorRelationship FK has been re-added to entities**

After `migrate-actor-relationships-to-entities.ts` runs, the `EntityActorRelationship_entity_id_fkey` constraint must point to `entities.id`. Verify:

```sql
SELECT conname, confrelid::regclass AS referenced_table
FROM pg_constraint
WHERE conname = 'EntityActorRelationship_entity_id_fkey';
-- Expected: referenced_table = 'entities'
```

**5. Prisma schema updated to remove golden_records model**

After Gate 2 migration, `prisma/schema.prisma` must be updated to:
- Remove `model golden_records`
- Remove `model raw_records`, `model entity_links`, `model resolution_links`, `model review_queue`, `model review_audit_log`
- Update `EntityActorRelationship.entity` relation to point to `entities` (not `golden_records`)
- Remove `PromotionStatus`, `LifecycleStatus`, `ArchiveReason`, `ResolutionType`, `MatchMethod` enums

Then run `prisma generate` and verify no TypeScript errors.

**6. A pre-migration sanity snapshot has been captured**

```sql
-- Legacy table row counts (should be confirmed with Bobby before dropping)
SELECT 'golden_records' AS tbl, COUNT(*) AS ct FROM golden_records
UNION ALL SELECT 'raw_records', COUNT(*) FROM raw_records
UNION ALL SELECT 'entity_links', COUNT(*) FROM entity_links
UNION ALL SELECT 'resolution_links', COUNT(*) FROM resolution_links
UNION ALL SELECT 'review_queue', COUNT(*) FROM review_queue
UNION ALL SELECT 'merchant_signals', COUNT(*) FROM merchant_signals
UNION ALL SELECT 'merchant_enrichment_runs', COUNT(*) FROM merchant_enrichment_runs;

-- EntityActorRelationship FK target
SELECT conname, confrelid::regclass AS referenced_table
FROM pg_constraint
WHERE conname = 'EntityActorRelationship_entity_id_fkey';
-- Must show 'entities', not 'golden_records'
```

Save output to `data/migrations/pre_drop_legacy_tables_snapshot_<YYYYMMDD>.txt`.

### Gate Check Questions

Before applying, answer YES to all:

- [ ] Gate 1 has been applied and verified?
- [ ] `rg "golden_records" app/ lib/ scripts/` returns zero active references?
- [ ] `migrate-actor-relationships-to-entities.ts --apply` has been run (Gate 1)?
- [ ] `EntityActorRelationship_entity_id_fkey` references `entities`, not `golden_records`?
- [ ] Prisma schema has been updated to remove `model golden_records`?
- [ ] Row counts of all tables to be dropped have been captured in the snapshot?
- [ ] Backup taken within the last 24 hours?

### Apply Command

```bash
psql $DATABASE_URL -f prisma/migrations/20260306300000_drop_legacy_tables_fields_v2/migration.sql
```

### Post-Apply Verification

```sql
-- Confirm tables are gone
\d golden_records   -- should fail
\d raw_records      -- should fail

-- Confirm entities still works
SELECT COUNT(*) FROM entities;
SELECT COUNT(*) FROM canonical_entity_state;

-- Confirm EntityActorRelationship FK is clean
SELECT conname, confrelid::regclass AS referenced_table
FROM pg_constraint
WHERE conname = 'EntityActorRelationship_entity_id_fkey';
```

---

## Documentation Standard for All Future Deferred Migrations

Any migration marked DEFERRED must include at the top of the SQL file:

```sql
-- ⚠️  DEFERRED MIGRATION — DO NOT APPLY until:
--   1. <prerequisite 1>
--   2. <prerequisite 2>
--   ...
--
-- Apply manually with:
--   psql $DATABASE_URL -f prisma/migrations/<name>/migration.sql
--
-- Gate conditions are documented in docs/DEFERRED_MIGRATION_GATES.md
```

And the gate conditions must be added to this document before the migration is committed.

---

## Reference

- `docs/FIELDS_V2_TARGET_ARCHITECTURE.md` — Layer model and anti-drift rules
- `docs/ENTITIES_CONTRACT_RECONCILIATION.md` — Full field audit and decision log
- `scripts/migrate-actor-relationships-to-entities.ts` — Gate 1 prerequisite script
- `scripts/populate-canonical-state.ts` — Gate 1 prerequisite script
