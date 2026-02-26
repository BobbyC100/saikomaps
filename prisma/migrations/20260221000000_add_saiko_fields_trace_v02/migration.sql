-- CreateEnum (idempotent: skip if already exists)
DO $$ BEGIN
  CREATE TYPE "ActorKind" AS ENUM ('organization', 'brand', 'person');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum (idempotent: skip if already exists)
DO $$ BEGIN
  CREATE TYPE "ActorRole" AS ENUM ('operator', 'owner', 'parent', 'founder');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable (idempotent)
CREATE TABLE IF NOT EXISTS "Actor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "ActorKind" NOT NULL DEFAULT 'organization',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Actor_pkey" PRIMARY KEY ("id")
);

-- CreateTable (idempotent)
CREATE TABLE IF NOT EXISTS "EntityActorRelationship" (
    "id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "role" "ActorRole" NOT NULL,
    "confidence" DOUBLE PRECISION,
    "source" TEXT,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EntityActorRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable (idempotent)
CREATE TABLE IF NOT EXISTS "FieldsMembership" (
    "id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "included_at" TIMESTAMP(3) NOT NULL,
    "removed_at" TIMESTAMP(3),
    "curator_id" TEXT,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FieldsMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable (idempotent)
CREATE TABLE IF NOT EXISTS "TraceSignalsCache" (
    "id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "computed_at" TIMESTAMP(3) NOT NULL,
    "signals" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TraceSignalsCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (idempotent)
CREATE INDEX IF NOT EXISTS "Actor_name_idx" ON "Actor"("name");
CREATE INDEX IF NOT EXISTS "EntityActorRelationship_entity_id_idx" ON "EntityActorRelationship"("entity_id");
CREATE INDEX IF NOT EXISTS "EntityActorRelationship_actor_id_idx" ON "EntityActorRelationship"("actor_id");
CREATE INDEX IF NOT EXISTS "FieldsMembership_entity_id_idx" ON "FieldsMembership"("entity_id");
CREATE UNIQUE INDEX IF NOT EXISTS "TraceSignalsCache_entity_id_key" ON "TraceSignalsCache"("entity_id");
CREATE INDEX IF NOT EXISTS "TraceSignalsCache_entity_id_idx" ON "TraceSignalsCache"("entity_id");

-- AddForeignKey (idempotent)
DO $$ BEGIN
  ALTER TABLE "EntityActorRelationship" ADD CONSTRAINT "EntityActorRelationship_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "golden_records"("canonical_id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "EntityActorRelationship" ADD CONSTRAINT "EntityActorRelationship_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "Actor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "FieldsMembership" ADD CONSTRAINT "FieldsMembership_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "golden_records"("canonical_id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "TraceSignalsCache" ADD CONSTRAINT "TraceSignalsCache_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "golden_records"("canonical_id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
