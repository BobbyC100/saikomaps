-- CreateEnum for TRACES (Temporal Record & Change Events System)
CREATE TYPE "TraceSource" AS ENUM ('ingest', 'resolver', 'enrichment', 'human', 'admin');
CREATE TYPE "TraceEventType" AS ENUM (
  'ENTITY_CREATED',
  'STATUS_CHANGED',
  'FIELD_UPDATED',
  'IDENTITY_ATTACHED',
  'IDENTITY_REMOVED',
  'ENRICHMENT_APPLIED',
  'HUMAN_OVERRIDE',
  'INGEST_SEEN',
  'RESOLVER_DECISION'
);

-- CreateTable: traces
CREATE TABLE "traces" (
    "id" TEXT NOT NULL,
    "entity_id" TEXT,
    "raw_id" TEXT,
    "source" "TraceSource" NOT NULL,
    "event_type" "TraceEventType" NOT NULL,
    "field_name" TEXT,
    "old_value" JSONB,
    "new_value" JSONB,
    "confidence" DOUBLE PRECISION,
    "observed_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "traces_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "traces_entity_id_idx" ON "traces"("entity_id");
CREATE INDEX "traces_raw_id_idx" ON "traces"("raw_id");
CREATE INDEX "traces_event_type_idx" ON "traces"("event_type");
CREATE INDEX "traces_observed_at_idx" ON "traces"("observed_at");
CREATE INDEX "traces_created_at_idx" ON "traces"("created_at");

-- AddForeignKey (optional - allows orphan traces when golden deleted)
ALTER TABLE "traces" ADD CONSTRAINT "traces_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "golden_records"("canonical_id") ON DELETE SET NULL ON UPDATE CASCADE;
