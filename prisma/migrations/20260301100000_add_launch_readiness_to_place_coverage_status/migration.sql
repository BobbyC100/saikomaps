-- Add launch readiness columns to place_coverage_status (v0)
-- Used by coverage-launch-readiness-v0.ts --write-status --execute

ALTER TABLE "place_coverage_status" ADD COLUMN IF NOT EXISTS "launch_readiness_score" INTEGER;
ALTER TABLE "place_coverage_status" ADD COLUMN IF NOT EXISTS "launch_readiness_status" TEXT;
ALTER TABLE "place_coverage_status" ADD COLUMN IF NOT EXISTS "launch_readiness_computed_at" TIMESTAMP(3);
ALTER TABLE "place_coverage_status" ADD COLUMN IF NOT EXISTS "launch_readiness_missing" JSONB;
