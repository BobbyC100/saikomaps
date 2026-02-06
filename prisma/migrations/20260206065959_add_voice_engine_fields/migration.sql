-- AlterTable
ALTER TABLE "places" ADD COLUMN     "ad_unit_override" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ad_unit_type" TEXT,
ADD COLUMN     "pull_quote" TEXT,
ADD COLUMN     "pull_quote_author" TEXT,
ADD COLUMN     "pull_quote_source" TEXT,
ADD COLUMN     "pull_quote_type" TEXT,
ADD COLUMN     "pull_quote_url" TEXT,
ADD COLUMN     "tagline" TEXT,
ADD COLUMN     "tagline_candidates" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "tagline_generated" TIMESTAMP(3),
ADD COLUMN     "tagline_pattern" TEXT,
ADD COLUMN     "tagline_signals" JSONB;
