-- CreateEnum
CREATE TYPE "OperatorPlaceCandidateStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'STALE');

-- CreateTable
CREATE TABLE "operator_place_candidates" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "place_id" TEXT,
    "candidate_name" TEXT NOT NULL,
    "candidate_url" TEXT,
    "candidate_address" TEXT,
    "source_url" TEXT NOT NULL,
    "match_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "match_reason" TEXT,
    "status" "OperatorPlaceCandidateStatus" NOT NULL DEFAULT 'PENDING',
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operator_place_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "operator_place_candidates_actor_id_status_idx" ON "operator_place_candidates"("actor_id", "status");

-- CreateIndex
CREATE INDEX "operator_place_candidates_place_id_idx" ON "operator_place_candidates"("place_id");

-- CreateIndex (best-effort: unique when candidate_url is set)
CREATE UNIQUE INDEX "operator_place_candidates_actor_url_unique" ON "operator_place_candidates"("actor_id", "candidate_url") WHERE "candidate_url" IS NOT NULL;

-- AddForeignKey
ALTER TABLE "operator_place_candidates" ADD CONSTRAINT "operator_place_candidates_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "Actor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operator_place_candidates" ADD CONSTRAINT "operator_place_candidates_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE SET NULL ON UPDATE CASCADE;
