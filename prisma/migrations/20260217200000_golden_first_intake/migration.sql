-- Golden-first intake (Ken spec): raw_records additions
ALTER TABLE "raw_records" ADD COLUMN IF NOT EXISTS "intake_batch_id" TEXT;
ALTER TABLE "raw_records" ADD COLUMN IF NOT EXISTS "source_type" TEXT;
ALTER TABLE "raw_records" ADD COLUMN IF NOT EXISTS "imported_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "raw_records_intake_batch_id_idx" ON "raw_records"("intake_batch_id");

-- Golden-first: golden_records promotion gating
ALTER TABLE "golden_records" ADD COLUMN IF NOT EXISTS "confidence" DOUBLE PRECISION;
ALTER TABLE "golden_records" ADD COLUMN IF NOT EXISTS "promotion_status" "PromotionStatus" NOT NULL DEFAULT 'PENDING';

CREATE INDEX IF NOT EXISTS "golden_records_promotion_status_idx" ON "golden_records"("promotion_status");

-- CreateEnum for PromotionStatus, ResolutionType, MatchMethod (idempotent: only if not exists)
DO $$ BEGIN
  CREATE TYPE "PromotionStatus" AS ENUM ('PENDING', 'VERIFIED', 'PUBLISHED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE TYPE "ResolutionType" AS ENUM ('matched', 'created', 'ambiguous');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE TYPE "MatchMethod" AS ENUM ('exact', 'normalized', 'fuzzy');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- resolution_links table
CREATE TABLE IF NOT EXISTS "resolution_links" (
    "id" TEXT NOT NULL,
    "raw_record_id" TEXT NOT NULL,
    "golden_record_id" TEXT,
    "resolution_type" "ResolutionType" NOT NULL,
    "confidence" DOUBLE PRECISION,
    "match_method" "MatchMethod" NOT NULL,
    "resolver_version" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resolution_links_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "resolution_links_raw_record_id_idx" ON "resolution_links"("raw_record_id");
CREATE INDEX IF NOT EXISTS "resolution_links_golden_record_id_idx" ON "resolution_links"("golden_record_id");
CREATE INDEX IF NOT EXISTS "resolution_links_resolution_type_idx" ON "resolution_links"("resolution_type");

ALTER TABLE "resolution_links" DROP CONSTRAINT IF EXISTS "resolution_links_raw_record_id_fkey";
ALTER TABLE "resolution_links" ADD CONSTRAINT "resolution_links_raw_record_id_fkey" FOREIGN KEY ("raw_record_id") REFERENCES "raw_records"("raw_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "resolution_links" DROP CONSTRAINT IF EXISTS "resolution_links_golden_record_id_fkey";
ALTER TABLE "resolution_links" ADD CONSTRAINT "resolution_links_golden_record_id_fkey" FOREIGN KEY ("golden_record_id") REFERENCES "golden_records"("canonical_id") ON DELETE RESTRICT ON UPDATE CASCADE;
