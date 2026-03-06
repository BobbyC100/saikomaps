-- Fields v2: Drop legacy tables
-- ⚠️  DEFERRED MIGRATION — DO NOT APPLY until:
--   1. canonical_entity_state is fully populated (populate-canonical-state.ts complete)
--   2. slim-entities migration (20260306200000) has been applied
--   3. /api/places/[slug]/route.ts has been updated and verified
--   4. All enrichment scripts are writing to observed_claims (not merchant_signals)
--   5. You have verified place pages render correctly with zero golden_records dependency
--   6. A full pg_dump backup has been taken immediately before running this
--
-- Pre-flight checks to run before applying:
--   SELECT COUNT(*) FROM canonical_entity_state;        -- should equal entities count
--   SELECT COUNT(*) FROM canonical_sanctions;           -- should be non-zero
--   SELECT COUNT(*) FROM derived_signals;               -- should be non-zero
--   SELECT COUNT(*) FROM interpretation_cache;          -- should be non-zero
--
-- Apply manually with:
--   psql $DATABASE_URL -f prisma/migrations/20260306300000_drop_legacy_tables_fields_v2/migration.sql

-- ---------------------------------------------------------------------------
-- Step 1: Migrate surviving FK dependencies away from golden_records
-- These tables currently FK to golden_records.canonical_id and must be updated.
-- ---------------------------------------------------------------------------

-- EntityActorRelationship: migrate FK from golden_records → entities
-- The entityId on EntityActorRelationship references golden_records.canonical_id
-- We need to re-point it to entities.id via the canonical_entity_state bridge.

-- Note: If EntityActorRelationship rows reference a golden_records.canonical_id
-- that has a matching canonical_entity_state (joined by google_place_id or
-- some other key), migrate them. Otherwise, nullify or drop orphaned rows.

-- FieldsMembership: same issue — FK to golden_records.canonical_id
-- TraceSignalsCache: same issue — FK to golden_records.canonical_id

-- Because the data migration for these 3 tables is context-dependent (Bobby
-- must confirm the canonical_id→entity_id mapping), the actual FK migration
-- is done by the companion script:
--   scripts/migrate-actor-relationships-to-entities.ts  (not yet written)
-- Run that script BEFORE running this migration.

-- ---------------------------------------------------------------------------
-- Step 2: Drop legacy MDM tables
-- ---------------------------------------------------------------------------

-- Resolution audit trail (replaced by canonical_sanctions)
DROP TABLE IF EXISTS resolution_links;

-- Raw staging records (replaced by observed_claims)
DROP TABLE IF EXISTS entity_links;
DROP TABLE IF EXISTS raw_records;

-- Review queue (replaced by sanction_conflicts)
DROP TABLE IF EXISTS review_audit_log;
DROP TABLE IF EXISTS review_queue;

-- ---------------------------------------------------------------------------
-- Step 3: Drop legacy operational tables (data now in canonical_entity_state)
-- ---------------------------------------------------------------------------

DROP TABLE IF EXISTS merchant_signals;
DROP TABLE IF EXISTS merchant_enrichment_runs;

-- ---------------------------------------------------------------------------
-- Step 4: Handle remaining FK dependencies on golden_records
-- ---------------------------------------------------------------------------

-- FieldsMembership currently FKs to golden_records.canonical_id.
-- After running migrate-actor-relationships-to-entities.ts, alter the FK:
ALTER TABLE IF EXISTS "FieldsMembership"
  DROP CONSTRAINT IF EXISTS "FieldsMembership_entity_id_fkey";

-- EntityActorRelationship currently FKs to golden_records.canonical_id.
ALTER TABLE IF EXISTS "EntityActorRelationship"
  DROP CONSTRAINT IF EXISTS "EntityActorRelationship_entity_id_fkey";

-- TraceSignalsCache currently FKs to golden_records.canonical_id.
ALTER TABLE IF EXISTS "TraceSignalsCache"
  DROP CONSTRAINT IF EXISTS "TraceSignalsCache_entity_id_fkey";

-- provenance FKs to golden_records.canonical_id.
ALTER TABLE IF EXISTS provenance
  DROP CONSTRAINT IF EXISTS provenance_place_id_fkey;

-- menu_signals / winelist_signals FK to golden_records.canonical_id.
ALTER TABLE IF EXISTS menu_signals
  DROP CONSTRAINT IF EXISTS menu_signals_golden_record_id_fkey;

ALTER TABLE IF EXISTS winelist_signals
  DROP CONSTRAINT IF EXISTS winelist_signals_golden_record_id_fkey;

-- ---------------------------------------------------------------------------
-- Step 5: Drop golden_records (the core legacy table)
-- ---------------------------------------------------------------------------

DROP TABLE IF EXISTS golden_records;

-- ---------------------------------------------------------------------------
-- Step 6: Drop legacy enumeration types no longer needed
-- ---------------------------------------------------------------------------

DROP TYPE IF EXISTS "PromotionStatus";
DROP TYPE IF EXISTS "LifecycleStatus";
DROP TYPE IF EXISTS "ArchiveReason";
DROP TYPE IF EXISTS "ResolutionType";
DROP TYPE IF EXISTS "MatchMethod";

-- ---------------------------------------------------------------------------
-- Post-drop verification
-- ---------------------------------------------------------------------------
-- Run these to confirm:
--   SELECT count(*) FROM entities;               -- should still work
--   SELECT count(*) FROM canonical_entity_state; -- should equal entities count
--   SELECT count(*) FROM observed_claims;        -- should be non-zero
--   \d golden_records                            -- should fail (table dropped)
