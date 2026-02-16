-- Add provenance_v2 JSON field to golden_records (skip if exists)
DO $$ BEGIN
  ALTER TABLE "golden_records" ADD COLUMN "provenance_v2" JSONB;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

