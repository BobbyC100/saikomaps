-- Rewire TraceSignalsCache.entity_id to reference entities.id instead of golden_records.canonical_id.
--
-- WHY this is safe with no data migration:
--   entities.id === golden_records.canonical_id (same UUID values, set during initial sync).
--   TraceSignalsCache.entity_id already holds these UUIDs.
--   The only change is which table/column the FK constraint points to.
--
-- Mirrors the FieldsMembership rewire applied in migration 20260307000000.

-- 1. Drop old FK from TraceSignalsCache → golden_records.canonical_id
ALTER TABLE "TraceSignalsCache"
  DROP CONSTRAINT IF EXISTS "TraceSignalsCache_entity_id_fkey";

-- 2. Add new FK from TraceSignalsCache → entities.id
ALTER TABLE "TraceSignalsCache"
  ADD CONSTRAINT "TraceSignalsCache_entity_id_fkey"
  FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
