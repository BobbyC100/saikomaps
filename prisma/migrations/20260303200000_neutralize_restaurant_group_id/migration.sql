-- WO-2: Neutralize entities.restaurant_group_id
--
-- Step A: NULL out any remaining non-null values (safety net for prod;
--         already 0 rows in dev but idempotent via the WHERE clause).
UPDATE "entities"
SET "restaurant_group_id" = NULL
WHERE "restaurant_group_id" IS NOT NULL;

-- Step B: Add CHECK constraint that permanently blocks future writes.
--         Any INSERT/UPDATE that sets restaurant_group_id to a non-null
--         value will now fail at the DB level.
ALTER TABLE "entities"
  ADD CONSTRAINT "entities_restaurant_group_id_must_be_null"
  CHECK ("restaurant_group_id" IS NULL);
