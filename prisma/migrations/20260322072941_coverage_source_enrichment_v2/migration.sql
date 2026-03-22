/*
  Warnings:

  - You are about to drop the column `excerpt` on the `coverage_sources` table. All the data in the column will be lost.
  - You are about to drop the column `source_name` on the `coverage_sources` table. All the data in the column will be lost.
  - You are about to drop the column `canonical_id` on the `review_queue` table. All the data in the column will be lost.
  - Added the required column `publication_name` to the `coverage_sources` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CoverageSourceType" AS ENUM ('ARTICLE', 'REVIEW', 'LIST', 'VIDEO', 'SOCIAL_POST', 'GUIDE');

-- CreateEnum
CREATE TYPE "CoverageEnrichmentStage" AS ENUM ('INGESTED', 'FETCHED', 'EXTRACTED', 'FAILED');

-- DropIndex
DROP INDEX "public"."review_queue_canonical_id_idx";

-- AlterTable
ALTER TABLE "coverage_sources" DROP COLUMN "excerpt",
DROP COLUMN "source_name",
ADD COLUMN     "article_title" TEXT,
ADD COLUMN     "author" TEXT,
ADD COLUMN     "content_hash" TEXT,
ADD COLUMN     "enrichment_stage" "CoverageEnrichmentStage" NOT NULL DEFAULT 'INGESTED',
ADD COLUMN     "extracted_at" TIMESTAMP(3),
ADD COLUMN     "extraction_version" TEXT,
ADD COLUMN     "fetched_at" TIMESTAMP(3),
ADD COLUMN     "fetched_content" TEXT,
ADD COLUMN     "http_status" INTEGER,
ADD COLUMN     "is_alive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "last_checked_at" TIMESTAMP(3),
ADD COLUMN     "publication_name" TEXT NOT NULL,
ADD COLUMN     "source_type" "CoverageSourceType" NOT NULL DEFAULT 'ARTICLE',
ADD COLUMN     "word_count" INTEGER;

-- AlterTable
ALTER TABLE "review_queue" DROP COLUMN "canonical_id",
ADD COLUMN     "canonicalId" TEXT,
ALTER COLUMN "conflict_type" SET DEFAULT 'new_entity_review';

-- CreateTable
CREATE TABLE "coverage_source_extractions" (
    "id" TEXT NOT NULL,
    "coverage_source_id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "extraction_version" TEXT NOT NULL,
    "extracted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "people" JSONB,
    "cuisine_signals" JSONB,
    "atmosphere_signals" JSONB,
    "offering_signals" JSONB,
    "origin_story" JSONB,
    "accolades" JSONB,
    "pull_quotes" JSONB,
    "sentiment" TEXT,
    "article_type" TEXT,
    "relevance_score" DOUBLE PRECISION,

    CONSTRAINT "coverage_source_extractions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "coverage_source_extractions_entity_id_idx" ON "coverage_source_extractions"("entity_id");

-- CreateIndex
CREATE INDEX "coverage_source_extractions_entity_id_is_current_idx" ON "coverage_source_extractions"("entity_id", "is_current");

-- CreateIndex
CREATE INDEX "coverage_source_extractions_coverage_source_id_idx" ON "coverage_source_extractions"("coverage_source_id");

-- CreateIndex
CREATE INDEX "coverage_sources_enrichment_stage_idx" ON "coverage_sources"("enrichment_stage");

-- CreateIndex
CREATE INDEX "coverage_sources_is_alive_idx" ON "coverage_sources"("is_alive");

-- CreateIndex
CREATE INDEX "coverage_sources_entity_id_source_type_idx" ON "coverage_sources"("entity_id", "source_type");

-- CreateIndex
CREATE INDEX "review_queue_canonicalId_idx" ON "review_queue"("canonicalId");

-- AddForeignKey
ALTER TABLE "coverage_source_extractions" ADD CONSTRAINT "coverage_source_extractions_coverage_source_id_fkey" FOREIGN KEY ("coverage_source_id") REFERENCES "coverage_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coverage_source_extractions" ADD CONSTRAINT "coverage_source_extractions_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
