-- CreateTable
CREATE TABLE "coverage_runs" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "db_host" TEXT NOT NULL,
    "db_name" TEXT NOT NULL,
    "git_sha" TEXT,
    "limit_val" INTEGER,
    "la_only" BOOLEAN NOT NULL DEFAULT true,
    "ttl_days" INTEGER,

    CONSTRAINT "coverage_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "place_coverage_status" (
    "id" TEXT NOT NULL,
    "place_id" TEXT NOT NULL,
    "dedupe_key" TEXT NOT NULL,
    "last_success_at" TIMESTAMP(3),
    "last_attempt_at" TIMESTAMP(3),
    "last_attempt_status" TEXT,
    "last_error_code" TEXT,
    "last_error_message" TEXT,
    "last_missing_groups" JSONB,
    "source" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "place_coverage_status_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "place_coverage_status_dedupe_key_key" ON "place_coverage_status"("dedupe_key");

-- CreateIndex
CREATE INDEX "place_coverage_status_place_id_idx" ON "place_coverage_status"("place_id");

-- CreateIndex
CREATE INDEX "place_coverage_status_last_attempt_status_idx" ON "place_coverage_status"("last_attempt_status");

-- AddForeignKey
ALTER TABLE "place_coverage_status" ADD CONSTRAINT "place_coverage_status_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;
