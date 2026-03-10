-- Migration: add_identity_enrichment
-- Adds pre-review machine enrichment gate for new_entity_review cases.
-- (1) Lightweight routing columns on review_queue
-- (2) Append-only identity_enrichment_runs table

-- review_queue: add machine enrichment routing state
ALTER TABLE "review_queue"
  ADD COLUMN IF NOT EXISTS "identity_enrichment_status"  TEXT,
  ADD COLUMN IF NOT EXISTS "identity_anchor_count"        INTEGER,
  ADD COLUMN IF NOT EXISTS "latest_identity_confidence"   DECIMAL(4,3),
  ADD COLUMN IF NOT EXISTS "latest_identity_run_id"       TEXT;

CREATE INDEX IF NOT EXISTS "review_queue_identity_enrichment_status_idx"
  ON "review_queue" ("identity_enrichment_status");

-- identity_enrichment_runs: append-only lookup attempt history
CREATE TABLE IF NOT EXISTS "identity_enrichment_runs" (
  "id"                   TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "raw_id"               TEXT         NOT NULL,
  "review_queue_id"      TEXT,
  "source_name"          TEXT         NOT NULL,
  "searched_name"        TEXT,
  "searched_city"        TEXT,
  "result_json"          JSONB        NOT NULL DEFAULT '{}',
  "identity_confidence"  DECIMAL(4,3),
  "anchor_count"         INTEGER      NOT NULL DEFAULT 0,
  "decision_status"      TEXT         NOT NULL,
  "created_at"           TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT "identity_enrichment_runs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "identity_enrichment_runs_raw_id_fkey"
    FOREIGN KEY ("raw_id") REFERENCES "raw_records" ("raw_id") ON DELETE CASCADE,
  CONSTRAINT "identity_enrichment_runs_review_queue_id_fkey"
    FOREIGN KEY ("review_queue_id") REFERENCES "review_queue" ("queue_id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "identity_enrichment_runs_raw_id_idx"
  ON "identity_enrichment_runs" ("raw_id");

CREATE INDEX IF NOT EXISTS "identity_enrichment_runs_review_queue_id_idx"
  ON "identity_enrichment_runs" ("review_queue_id");

CREATE INDEX IF NOT EXISTS "identity_enrichment_runs_decision_status_idx"
  ON "identity_enrichment_runs" ("decision_status");

CREATE INDEX IF NOT EXISTS "identity_enrichment_runs_created_at_idx"
  ON "identity_enrichment_runs" ("created_at");
