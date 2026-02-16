-- CreateEnum
CREATE TYPE "signal_status" AS ENUM ('ok', 'partial', 'failed');

-- CreateTable
CREATE TABLE "menu_signals" (
    "id" TEXT NOT NULL,
    "golden_record_id" TEXT NOT NULL,
    "schema_version" INTEGER NOT NULL DEFAULT 1,
    "model_version" TEXT,
    "source_scraped_at" TIMESTAMP(3),
    "analyzed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "signal_status" NOT NULL DEFAULT 'ok',
    "error" TEXT,
    "payload" JSONB,
    "evidence" JSONB,
    "confidence" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menu_signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "winelist_signals" (
    "id" TEXT NOT NULL,
    "golden_record_id" TEXT NOT NULL,
    "schema_version" INTEGER NOT NULL DEFAULT 1,
    "model_version" TEXT,
    "source_scraped_at" TIMESTAMP(3),
    "analyzed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "signal_status" NOT NULL DEFAULT 'ok',
    "error" TEXT,
    "payload" JSONB,
    "evidence" JSONB,
    "confidence" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "winelist_signals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "menu_signals_golden_record_id_key" ON "menu_signals"("golden_record_id");

-- CreateIndex
CREATE INDEX "menu_signals_analyzed_at_idx" ON "menu_signals"("analyzed_at");

-- CreateIndex
CREATE INDEX "menu_signals_status_idx" ON "menu_signals"("status");

-- CreateIndex
CREATE UNIQUE INDEX "winelist_signals_golden_record_id_key" ON "winelist_signals"("golden_record_id");

-- CreateIndex
CREATE INDEX "winelist_signals_analyzed_at_idx" ON "winelist_signals"("analyzed_at");

-- CreateIndex
CREATE INDEX "winelist_signals_status_idx" ON "winelist_signals"("status");

-- AddForeignKey
ALTER TABLE "menu_signals" ADD CONSTRAINT "menu_signals_golden_record_id_fkey" FOREIGN KEY ("golden_record_id") REFERENCES "golden_records"("canonical_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "winelist_signals" ADD CONSTRAINT "winelist_signals_golden_record_id_fkey" FOREIGN KEY ("golden_record_id") REFERENCES "golden_records"("canonical_id") ON DELETE CASCADE ON UPDATE CASCADE;
