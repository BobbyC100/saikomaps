-- WO-FIELDS-WEBSITE-ABOUT-EXTRACTION-001
-- Adds three new staging fields to golden_records for website "About / Our Story" extraction.
-- These fields are intentionally separate from `about_copy` / `description` so we can
-- land web-extracted content without touching human-authored fields until quality is confirmed.

ALTER TABLE "golden_records" ADD COLUMN "website_about_url" TEXT;
ALTER TABLE "golden_records" ADD COLUMN "website_about_raw" TEXT;
ALTER TABLE "golden_records" ADD COLUMN "website_about_extracted_at" TIMESTAMP(3);
