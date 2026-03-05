-- Add description enrichment metadata columns to entities
ALTER TABLE "entities" ADD COLUMN "description_source" TEXT;
ALTER TABLE "entities" ADD COLUMN "description_confidence" DOUBLE PRECISION;
ALTER TABLE "entities" ADD COLUMN "description_reviewed" BOOLEAN NOT NULL DEFAULT false;
