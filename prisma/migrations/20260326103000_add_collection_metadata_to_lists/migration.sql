-- Add collection discovery metadata to lists.
-- Additive only: no destructive changes.

ALTER TABLE "lists"
  ADD COLUMN IF NOT EXISTS "collection_scope" TEXT,
  ADD COLUMN IF NOT EXISTS "collection_region_key" TEXT,
  ADD COLUMN IF NOT EXISTS "collection_neighborhood" TEXT,
  ADD COLUMN IF NOT EXISTS "collection_vertical_key" TEXT,
  ADD COLUMN IF NOT EXISTS "collection_city" TEXT,
  ADD COLUMN IF NOT EXISTS "source_neighborhoods" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "is_editorial_collection" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "sort_rank" INTEGER,
  ADD COLUMN IF NOT EXISTS "max_entities" INTEGER;

CREATE INDEX IF NOT EXISTS "lists_collection_scope_idx" ON "lists"("collection_scope");
CREATE INDEX IF NOT EXISTS "lists_collection_vertical_key_idx" ON "lists"("collection_vertical_key");
CREATE INDEX IF NOT EXISTS "lists_collection_region_key_idx" ON "lists"("collection_region_key");
CREATE INDEX IF NOT EXISTS "lists_collection_neighborhood_idx" ON "lists"("collection_neighborhood");
CREATE INDEX IF NOT EXISTS "lists_collection_city_idx" ON "lists"("collection_city");
CREATE INDEX IF NOT EXISTS "lists_is_editorial_collection_idx" ON "lists"("is_editorial_collection");
CREATE INDEX IF NOT EXISTS "lists_sort_rank_idx" ON "lists"("sort_rank");
