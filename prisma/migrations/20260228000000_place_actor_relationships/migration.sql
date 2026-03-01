-- Add new ActorKind values (operator, collective)
ALTER TYPE "ActorKind" ADD VALUE IF NOT EXISTS 'operator';
ALTER TYPE "ActorKind" ADD VALUE IF NOT EXISTS 'collective';

-- Add new ActorRole values (brand, collective)
ALTER TYPE "ActorRole" ADD VALUE IF NOT EXISTS 'brand';
ALTER TYPE "ActorRole" ADD VALUE IF NOT EXISTS 'collective';

-- Expand Actor: slug, website, description, visibility, sources, confidence (restaurant_groups migration)
ALTER TABLE "Actor" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "Actor" ADD COLUMN IF NOT EXISTS "website" TEXT;
ALTER TABLE "Actor" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Actor" ADD COLUMN IF NOT EXISTS "visibility" "Visibility";
ALTER TABLE "Actor" ADD COLUMN IF NOT EXISTS "sources" JSONB;
ALTER TABLE "Actor" ADD COLUMN IF NOT EXISTS "confidence" DOUBLE PRECISION;
-- SET DEFAULT moved to next migration (PG: new enum values must be committed before use)

CREATE UNIQUE INDEX IF NOT EXISTS "Actor_slug_key" ON "Actor"("slug") WHERE "slug" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "Actor_slug_idx" ON "Actor"("slug");

-- Create place_actor_relationships table
CREATE TABLE IF NOT EXISTS "place_actor_relationships" (
    "id" TEXT NOT NULL,
    "place_id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "role" "ActorRole" NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "sources" JSONB,
    "confidence" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "place_actor_relationships_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "place_actor_relationships_place_id_actor_id_role_key" ON "place_actor_relationships"("place_id", "actor_id", "role");
CREATE INDEX IF NOT EXISTS "place_actor_relationships_place_id_idx" ON "place_actor_relationships"("place_id");
CREATE INDEX IF NOT EXISTS "place_actor_relationships_actor_id_idx" ON "place_actor_relationships"("actor_id");

DO $$ BEGIN
  ALTER TABLE "place_actor_relationships" ADD CONSTRAINT "place_actor_relationships_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "place_actor_relationships" ADD CONSTRAINT "place_actor_relationships_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "Actor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
