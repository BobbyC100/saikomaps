-- Rewire FieldsMembership.entity_id to reference entities.id instead of golden_records.canonical_id.
--
-- WHY this is safe with no data migration:
--   entities.id === golden_records.canonical_id (same UUID values, set during initial sync).
--   FieldsMembership.entity_id already holds these UUIDs.
--   The only change is which table/column the FK constraint points to.
--
-- This removes the last schema-level dependency preventing prl-materialize.ts from dropping
-- all golden_records reads in the FieldsMembership path.

-- 1. Drop old FK from FieldsMembership → golden_records.canonical_id
ALTER TABLE "FieldsMembership"
  DROP CONSTRAINT IF EXISTS "FieldsMembership_entity_id_fkey";

-- 2. Add new FK from FieldsMembership → entities.id
ALTER TABLE "FieldsMembership"
  ADD CONSTRAINT "FieldsMembership_entity_id_fkey"
  FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
