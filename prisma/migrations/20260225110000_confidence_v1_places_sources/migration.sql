-- Confidence System v1: places confidence columns + sources schema alignment
-- Sources: trust_tier 0-1 (float), domain as array. Trust tiers editable in DB.

-- 1) Alter sources to spec: trust_tier FLOAT 0-1, domain TEXT[]
DO $$ BEGIN
  ALTER TABLE "sources" DROP CONSTRAINT IF EXISTS "sources_trust_tier_check";
EXCEPTION WHEN undefined_object THEN null; END $$;
ALTER TABLE "sources" ALTER COLUMN "trust_tier" TYPE DOUBLE PRECISION USING (
  CASE WHEN "trust_tier" = 1 THEN 0.9
       WHEN "trust_tier" = 2 THEN 0.7
       WHEN "trust_tier" = 3 THEN 0.5
       WHEN "trust_tier" = 4 THEN 0.3
       ELSE 0.5 END
);
ALTER TABLE "sources" ADD CONSTRAINT "sources_trust_tier_check" CHECK (trust_tier >= 0 AND trust_tier <= 1);

-- domain: single TEXT -> TEXT[] (nullable then set default)
DO $$ BEGIN
  ALTER TABLE "sources" ALTER COLUMN "domain" TYPE TEXT[] USING (
    CASE WHEN "domain" IS NULL OR "domain" = '' THEN '{}' ELSE ARRAY["domain"] END
  );
EXCEPTION WHEN others THEN
  -- column may already be array or not exist
  NULL;
END $$;
ALTER TABLE "sources" ALTER COLUMN "domain" SET DEFAULT '{}';

-- Drop slug if present (spec uses id as business key)
DROP INDEX IF EXISTS "sources_slug_key";
DO $$ BEGIN ALTER TABLE "sources" DROP COLUMN "slug"; EXCEPTION WHEN undefined_column THEN null; END $$;
DO $$ BEGIN ALTER TABLE "sources" DROP COLUMN "source_type"; EXCEPTION WHEN undefined_column THEN null; END $$;
DO $$ BEGIN ALTER TABLE "sources" DROP COLUMN "updated_at"; EXCEPTION WHEN undefined_column THEN null; END $$;

-- 2) Places: confidence JSONB, overall_confidence, confidence_updated_at
DO $$ BEGIN
  ALTER TABLE "places" ADD COLUMN "confidence" JSONB DEFAULT '{}'::jsonb;
EXCEPTION WHEN duplicate_column THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "places" ADD COLUMN "overall_confidence" DOUBLE PRECISION DEFAULT 0.5;
EXCEPTION WHEN duplicate_column THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "places" ADD COLUMN "confidence_updated_at" TIMESTAMP(3);
EXCEPTION WHEN duplicate_column THEN null; END $$;

-- 3) Seed sources with conservative trust tiers (idempotent upsert)
INSERT INTO "sources" ("id", "name", "trust_tier", "domain", "created_at")
VALUES
  ('google_places', 'Google Places', 0.85, '{}', NOW()),
  ('michelin', 'Michelin', 0.90, '{}', NOW()),
  ('resy', 'Resy', 0.85, '{}', NOW()),
  ('instagram_verified', 'Instagram Verified', 0.80, '{}', NOW()),
  ('instagram_scraped', 'Instagram Scraped', 0.60, '{}', NOW()),
  ('manual_bobby', 'Manual (Bobby)', 0.85, '{}', NOW())
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "trust_tier" = EXCLUDED."trust_tier",
  "domain" = EXCLUDED."domain";
