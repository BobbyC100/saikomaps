-- Migration: add_merchant_surface_artifacts
-- Stage 4 of the merchant ingestion pipeline: parse pass artifacts.
--
-- Creates merchant_surface_artifacts to store structured parse outputs
-- separately from the immutable merchant_surfaces evidence rows.
--
-- Also relaxes the merchant_surfaces immutability trigger so that the
-- two pipeline lifecycle fields (parse_status, extraction_status) can be
-- updated while all evidence fields (raw_html, raw_text, fetch_status, …)
-- remain permanently frozen.

-- ============================================================================
-- Table: merchant_surface_artifacts
-- ============================================================================

CREATE TABLE "merchant_surface_artifacts" (
  "id"                   TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "merchant_surface_id"  TEXT        NOT NULL,
  "artifact_type"        TEXT        NOT NULL,   -- e.g. 'parse_v1'
  "artifact_version"     TEXT        NOT NULL,   -- e.g. '1'
  "artifact_json"        JSONB       NOT NULL,
  "created_at"           TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "merchant_surface_artifacts_pkey"
    PRIMARY KEY ("id"),

  CONSTRAINT "merchant_surface_artifacts_surface_id_fkey"
    FOREIGN KEY ("merchant_surface_id")
    REFERENCES "merchant_surfaces"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Primary lookup: all artifacts for a given surface row
CREATE INDEX "merchant_surface_artifacts_surface_id_idx"
  ON "merchant_surface_artifacts" ("merchant_surface_id");

-- Deduplication: one artifact per (surface, type, version)
-- Same input HTML must produce identical parse output → skip re-write.
CREATE UNIQUE INDEX "merchant_surface_artifacts_dedupe_idx"
  ON "merchant_surface_artifacts" ("merchant_surface_id", "artifact_type", "artifact_version");

-- Batch queries: find all artifacts of a given type/version
CREATE INDEX "merchant_surface_artifacts_type_version_idx"
  ON "merchant_surface_artifacts" ("artifact_type", "artifact_version");

CREATE INDEX "merchant_surface_artifacts_created_at_idx"
  ON "merchant_surface_artifacts" ("created_at");

-- ============================================================================
-- Update merchant_surfaces immutability trigger
--
-- The original trigger blocked ALL updates.  We relax it to allow updates
-- only to the two pipeline lifecycle columns (parse_status, extraction_status).
-- All evidence columns remain immutable and will still raise an exception.
-- ============================================================================

CREATE OR REPLACE FUNCTION merchant_surfaces_prevent_update()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  -- Block any attempt to modify the immutable evidence columns.
  -- parse_status and extraction_status are lifecycle fields and may be updated
  -- by downstream pipeline stages (parse pass, extraction pass).
  IF (
    NEW.entity_id        IS DISTINCT FROM OLD.entity_id        OR
    NEW.surface_type     IS DISTINCT FROM OLD.surface_type     OR
    NEW.source_url       IS DISTINCT FROM OLD.source_url       OR
    NEW.content_type     IS DISTINCT FROM OLD.content_type     OR
    NEW.fetch_status     IS DISTINCT FROM OLD.fetch_status     OR
    NEW.content_hash     IS DISTINCT FROM OLD.content_hash     OR
    NEW.raw_text         IS DISTINCT FROM OLD.raw_text         OR
    NEW.raw_html         IS DISTINCT FROM OLD.raw_html         OR
    NEW.fetched_at       IS DISTINCT FROM OLD.fetched_at       OR
    NEW.discovered_at    IS DISTINCT FROM OLD.discovered_at    OR
    NEW.metadata_json    IS DISTINCT FROM OLD.metadata_json
  ) THEN
    RAISE EXCEPTION
      'merchant_surfaces evidence fields are immutable (id=%). '
      'Only parse_status and extraction_status may be updated. '
      'New fetches must create new rows.',
      OLD.id;
  END IF;

  RETURN NEW;
END;
$$;
