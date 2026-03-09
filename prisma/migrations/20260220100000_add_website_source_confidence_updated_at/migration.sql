-- DB-only migration — restored locally 2026-03-09.
-- Originally applied directly to the DB without a local file.
-- Confirmed live on golden_records: website_source (text), website_confidence (numeric), website_updated_at (timestamp).
--
-- DO NOT re-apply. Register with:
--   npx prisma migrate resolve --applied 20260220100000_add_website_source_confidence_updated_at

DO $$ BEGIN
  ALTER TABLE "golden_records" ADD COLUMN "website_source" TEXT;
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "golden_records" ADD COLUMN "website_confidence" DECIMAL(3, 2);
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "golden_records" ADD COLUMN "website_updated_at" TIMESTAMP(3);
EXCEPTION WHEN duplicate_column THEN null; END $$;
