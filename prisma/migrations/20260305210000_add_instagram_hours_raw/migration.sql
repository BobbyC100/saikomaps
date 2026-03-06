-- Migration: add instagram_hours_raw to golden_records
-- Raw hours text captured from Instagram profile / bio.
-- Parser output (if valid) is written to hours_json.
-- Source is tracked in source_attribution.hours = "instagram".

ALTER TABLE "golden_records"
  ADD COLUMN IF NOT EXISTS "instagram_hours_raw" TEXT;
