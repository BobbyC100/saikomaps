-- CreateEnum
CREATE TYPE "GpidResolverStatus" AS ENUM ('MATCH', 'AMBIGUOUS', 'NO_MATCH', 'ERROR');

-- CreateEnum
CREATE TYPE "GpidHumanStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'NEEDS_MORE_INFO');

-- CreateEnum
CREATE TYPE "GpidHumanDecision" AS ENUM ('APPLY_GPID', 'MARK_NO_MATCH', 'MARK_AMBIGUOUS');

-- CreateTable
CREATE TABLE "gpid_resolution_queue" (
    "id" TEXT NOT NULL,
    "place_id" TEXT NOT NULL,
    "candidate_gpid" TEXT,
    "resolver_status" "GpidResolverStatus" NOT NULL,
    "reason_code" TEXT,
    "similarity_score" DOUBLE PRECISION,
    "candidates_json" JSONB,
    "source_run_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "human_status" "GpidHumanStatus" NOT NULL DEFAULT 'PENDING',
    "human_decision" "GpidHumanDecision",
    "human_note" TEXT,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),

    CONSTRAINT "gpid_resolution_queue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gpid_resolution_queue_human_status_idx" ON "gpid_resolution_queue"("human_status");

-- CreateIndex
CREATE INDEX "gpid_resolution_queue_resolver_status_idx" ON "gpid_resolution_queue"("resolver_status");

-- CreateIndex
CREATE INDEX "gpid_resolution_queue_place_id_idx" ON "gpid_resolution_queue"("place_id");

-- CreateIndex
CREATE INDEX "gpid_resolution_queue_reason_code_idx" ON "gpid_resolution_queue"("reason_code");

-- AddForeignKey
ALTER TABLE "gpid_resolution_queue" ADD CONSTRAINT "gpid_resolution_queue_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;
