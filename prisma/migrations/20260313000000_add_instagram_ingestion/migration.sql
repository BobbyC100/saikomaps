-- Migration: add_instagram_ingestion
-- Three tables for Instagram data ingestion v1:
--   instagram_accounts       — one per connected IG account (mutable, overwrite on fetch)
--   instagram_media          — one per post/media object (upsert by IG media ID)
--   instagram_insight_snapshots — append-only metric observations

-- ============================================================================
-- instagram_accounts
-- ============================================================================

CREATE TABLE "instagram_accounts" (
  "id"                       TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "entity_id"                TEXT        NOT NULL,
  "instagram_user_id"        TEXT        NOT NULL,
  "username"                 TEXT        NOT NULL,
  "account_type"             TEXT,
  "media_count"              INTEGER,
  "canonical_instagram_url"  TEXT,
  "last_fetched_at"          TIMESTAMPTZ,
  "last_successful_fetch_at" TIMESTAMPTZ,
  "source_status"            TEXT        NOT NULL DEFAULT 'active',
  "raw_payload"              JSONB,
  "created_at"               TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"               TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "instagram_accounts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "instagram_accounts_instagram_user_id_key" UNIQUE ("instagram_user_id"),
  CONSTRAINT "instagram_accounts_entity_id_fkey"
    FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "instagram_accounts_entity_id_idx"
  ON "instagram_accounts" ("entity_id");

CREATE INDEX "instagram_accounts_username_idx"
  ON "instagram_accounts" ("username");

-- ============================================================================
-- instagram_media
-- ============================================================================

CREATE TABLE "instagram_media" (
  "id"                 TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "instagram_media_id" TEXT        NOT NULL,
  "instagram_user_id"  TEXT        NOT NULL,
  "media_type"         TEXT        NOT NULL,
  "media_url"          TEXT,
  "thumbnail_url"      TEXT,
  "permalink"          TEXT        NOT NULL,
  "caption"            TEXT,
  "timestamp"          TIMESTAMPTZ NOT NULL,
  "fetched_at"         TIMESTAMPTZ NOT NULL DEFAULT now(),
  "raw_payload"        JSONB,

  CONSTRAINT "instagram_media_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "instagram_media_instagram_media_id_key" UNIQUE ("instagram_media_id"),
  CONSTRAINT "instagram_media_instagram_user_id_fkey"
    FOREIGN KEY ("instagram_user_id") REFERENCES "instagram_accounts"("instagram_user_id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "instagram_media_instagram_user_id_idx"
  ON "instagram_media" ("instagram_user_id");

CREATE INDEX "instagram_media_timestamp_idx"
  ON "instagram_media" ("timestamp");

CREATE INDEX "instagram_media_user_id_timestamp_idx"
  ON "instagram_media" ("instagram_user_id", "timestamp");

-- ============================================================================
-- instagram_insight_snapshots
-- ============================================================================

CREATE TABLE "instagram_insight_snapshots" (
  "id"           TEXT           NOT NULL DEFAULT gen_random_uuid()::text,
  "subject_type" TEXT           NOT NULL,
  "subject_id"   TEXT           NOT NULL,
  "metric_name"  TEXT           NOT NULL,
  "metric_value" DECIMAL(12,2)  NOT NULL,
  "observed_at"  TIMESTAMPTZ    NOT NULL DEFAULT now(),
  "window_label" TEXT,
  "raw_payload"  JSONB,

  CONSTRAINT "instagram_insight_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "instagram_insight_snapshots_subject_idx"
  ON "instagram_insight_snapshots" ("subject_type", "subject_id");

CREATE INDEX "instagram_insight_snapshots_timeseries_idx"
  ON "instagram_insight_snapshots" ("subject_id", "metric_name", "observed_at");

CREATE INDEX "instagram_insight_snapshots_observed_at_idx"
  ON "instagram_insight_snapshots" ("observed_at");
