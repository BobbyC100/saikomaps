-- Hotfix: add google_places_attributes to entities.
-- This column exists in the Prisma schema (model entities) and is referenced by
-- the v_places_la_bbox view (drop_entities_vibe_tags migration) but was never
-- added to places/entities via a migration — only added to golden_records.
-- Adding it here as nullable JSONB to close the schema drift gap.

ALTER TABLE "entities"
  ADD COLUMN IF NOT EXISTS "google_places_attributes" JSONB;

ALTER TABLE "entities"
  ADD COLUMN IF NOT EXISTS "google_places_attributes_fetched_at" TIMESTAMP(3);
