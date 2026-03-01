-- CreateEnum
CREATE TYPE "ConfidenceBucket" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- AlterTable
ALTER TABLE "operator_place_candidates" ADD COLUMN "reviewed_at" TIMESTAMP(3),
ADD COLUMN "approved_by" TEXT,
ADD COLUMN "confidence_bucket" "ConfidenceBucket";

-- CreateTable
CREATE TABLE "place_job_log" (
    "id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "job_type" TEXT NOT NULL,
    "pages_fetched" INTEGER NOT NULL DEFAULT 0,
    "ai_calls" INTEGER NOT NULL DEFAULT 0,
    "duration_ms" INTEGER,
    "estimated_cost" DECIMAL(10,6),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "place_job_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "place_job_log_entity_id_idx" ON "place_job_log"("entity_id");

-- CreateIndex
CREATE INDEX "place_job_log_job_type_idx" ON "place_job_log"("job_type");

-- CreateIndex
CREATE INDEX "place_job_log_created_at_idx" ON "place_job_log"("created_at");
