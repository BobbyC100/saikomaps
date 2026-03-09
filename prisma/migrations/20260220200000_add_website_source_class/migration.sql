-- DB-only migration — restored locally 2026-03-09.
-- Originally applied directly to the DB without a local file.
-- Confirmed live on golden_records: website_source_class (text).
--
-- DO NOT re-apply. Register with:
--   npx prisma migrate resolve --applied 20260220200000_add_website_source_class

DO $$ BEGIN
  ALTER TABLE "golden_records" ADD COLUMN "website_source_class" TEXT;
EXCEPTION WHEN duplicate_column THEN null; END $$;
