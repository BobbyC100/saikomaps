-- DB-only migration — restored locally 2026-03-09.
-- Originally applied directly to the DB without a local file.
-- Neutralizes the deprecated restaurant_group_id FK on entities.
-- The column is retained; only the FK constraint is removed.
--
-- Original constraint was created as "places_restaurant_group_id_fkey" and survived the places -> entities rename.
--
-- DO NOT re-apply. Register with:
--   npx prisma migrate resolve --applied 20260303200000_neutralize_restaurant_group_id

ALTER TABLE "entities"
  DROP CONSTRAINT IF EXISTS "places_restaurant_group_id_fkey";
