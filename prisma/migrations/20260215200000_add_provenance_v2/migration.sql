-- Add provenance_v2 JSON field to golden_records
ALTER TABLE "golden_records" ADD COLUMN "provenance_v2" JSONB;
