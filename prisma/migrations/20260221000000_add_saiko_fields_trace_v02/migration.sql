-- CreateEnum
CREATE TYPE "ActorKind" AS ENUM ('organization', 'brand', 'person');

-- CreateEnum
CREATE TYPE "ActorRole" AS ENUM ('operator', 'owner', 'parent', 'founder');

-- CreateTable
CREATE TABLE "Actor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "ActorKind" NOT NULL DEFAULT 'organization',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Actor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntityActorRelationship" (
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

-- CreateTable
CREATE TABLE "FieldsMembership" (
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

-- CreateTable
CREATE TABLE "TraceSignalsCache" (
    "id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "computed_at" TIMESTAMP(3) NOT NULL,
    "signals" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TraceSignalsCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Actor_name_idx" ON "Actor"("name");

-- CreateIndex
CREATE INDEX "EntityActorRelationship_entity_id_idx" ON "EntityActorRelationship"("entity_id");

-- CreateIndex
CREATE INDEX "EntityActorRelationship_actor_id_idx" ON "EntityActorRelationship"("actor_id");

-- CreateIndex
CREATE INDEX "FieldsMembership_entity_id_idx" ON "FieldsMembership"("entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "TraceSignalsCache_entity_id_key" ON "TraceSignalsCache"("entity_id");

-- CreateIndex
CREATE INDEX "TraceSignalsCache_entity_id_idx" ON "TraceSignalsCache"("entity_id");

-- AddForeignKey
ALTER TABLE "EntityActorRelationship" ADD CONSTRAINT "EntityActorRelationship_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "golden_records"("canonical_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityActorRelationship" ADD CONSTRAINT "EntityActorRelationship_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "Actor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldsMembership" ADD CONSTRAINT "FieldsMembership_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "golden_records"("canonical_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraceSignalsCache" ADD CONSTRAINT "TraceSignalsCache_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "golden_records"("canonical_id") ON DELETE CASCADE ON UPDATE CASCADE;
