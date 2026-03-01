-- 1) sources table: trust tiers + domain (registry for winner_sources and merge quality)
CREATE TABLE IF NOT EXISTS "sources" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "domain" TEXT,
  "trust_tier" INTEGER NOT NULL DEFAULT 2,
  "source_type" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "sources_slug_key" ON "sources"("slug");
CREATE INDEX IF NOT EXISTS "sources_trust_tier_idx" ON "sources"("trust_tier");
CREATE INDEX IF NOT EXISTS "sources_domain_idx" ON "sources"("domain");

-- 2) golden_records: match_confidence + merge_quality (lightweight)
DO $$ BEGIN
  ALTER TABLE "golden_records" ADD COLUMN "match_confidence" DOUBLE PRECISION;
EXCEPTION WHEN duplicate_column THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "golden_records" ADD COLUMN "merge_quality" DOUBLE PRECISION;
EXCEPTION WHEN duplicate_column THEN null; END $$;

-- 3) Field confidences for critical fields only (single JSONB)
DO $$ BEGIN
  ALTER TABLE "golden_records" ADD COLUMN "field_confidences" JSONB;
EXCEPTION WHEN duplicate_column THEN null; END $$;

-- 4) Winner source per field (string) + optional conflict flag
DO $$ BEGIN
  ALTER TABLE "golden_records" ADD COLUMN "winner_sources" JSONB;
EXCEPTION WHEN duplicate_column THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "golden_records" ADD COLUMN "field_conflicts" JSONB;
EXCEPTION WHEN duplicate_column THEN null; END $$;

COMMENT ON COLUMN "golden_records"."match_confidence" IS '0-1, resolution/match confidence';
COMMENT ON COLUMN "golden_records"."merge_quality" IS '0-1, overall merge quality score';
COMMENT ON COLUMN "golden_records"."field_confidences" IS 'Critical fields only: name, address, lat, lng, phone, website, hours, category, instagram, etc. Map field -> 0-1';
COMMENT ON COLUMN "golden_records"."winner_sources" IS 'Field -> source slug (references sources.slug)';
COMMENT ON COLUMN "golden_records"."field_conflicts" IS 'Array of field names that had conflicts during merge';
