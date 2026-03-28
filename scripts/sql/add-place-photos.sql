-- Additive Layer 1 migration: canonical place_photos registry.
-- Safe to run on drifted databases because it avoids migrate history checks.

DO $$
BEGIN
  CREATE TYPE "PhotoSource" AS ENUM ('GOOGLE', 'INSTAGRAM', 'WEBSITE', 'MANUAL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS "place_photos" (
  "id" TEXT NOT NULL,
  "entity_id" TEXT NOT NULL,
  "source" "PhotoSource" NOT NULL,
  "source_ref" TEXT NOT NULL,
  "source_url" TEXT,
  "width_px" INTEGER,
  "height_px" INTEGER,
  "aspect_ratio" DOUBLE PRECISION,
  "eligible" BOOLEAN NOT NULL DEFAULT false,
  "ineligible_reason" TEXT,
  "source_rank" INTEGER NOT NULL,
  "ingested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "place_photos_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "place_photos_entity_id_source_source_ref_key"
  ON "place_photos" ("entity_id", "source", "source_ref");

CREATE INDEX IF NOT EXISTS "place_photos_entity_id_idx"
  ON "place_photos" ("entity_id");

CREATE INDEX IF NOT EXISTS "place_photos_entity_id_eligible_idx"
  ON "place_photos" ("entity_id", "eligible");

CREATE INDEX IF NOT EXISTS "place_photos_source_idx"
  ON "place_photos" ("source");

CREATE INDEX IF NOT EXISTS "place_photos_entity_id_eligible_source_rank_ingested_at_idx"
  ON "place_photos" ("entity_id", "eligible", "source_rank", "ingested_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'place_photos_entity_id_fkey'
  ) THEN
    ALTER TABLE "place_photos"
      ADD CONSTRAINT "place_photos_entity_id_fkey"
      FOREIGN KEY ("entity_id") REFERENCES "entities"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
