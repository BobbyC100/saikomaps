-- Energy + Formality scoring (pipeline-generated, auditable). Backward-compatible: nullable columns only.
ALTER TABLE "golden_records" ADD COLUMN IF NOT EXISTS "energy_score" INTEGER;
ALTER TABLE "golden_records" ADD COLUMN IF NOT EXISTS "energy_confidence" DOUBLE PRECISION;
ALTER TABLE "golden_records" ADD COLUMN IF NOT EXISTS "energy_version" TEXT;
ALTER TABLE "golden_records" ADD COLUMN IF NOT EXISTS "energy_computed_at" TIMESTAMP(3);
ALTER TABLE "golden_records" ADD COLUMN IF NOT EXISTS "formality_score" INTEGER;
ALTER TABLE "golden_records" ADD COLUMN IF NOT EXISTS "formality_confidence" DOUBLE PRECISION;
ALTER TABLE "golden_records" ADD COLUMN IF NOT EXISTS "formality_version" TEXT;
ALTER TABLE "golden_records" ADD COLUMN IF NOT EXISTS "formality_computed_at" TIMESTAMP(3);
