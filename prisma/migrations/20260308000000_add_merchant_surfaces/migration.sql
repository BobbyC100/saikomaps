-- Migration: add_merchant_surfaces
-- Immutable evidence layer for merchant surface content.
-- Each row represents one capture event. Rows are never updated.
-- Immutability is enforced at the database level via a BEFORE UPDATE trigger.

-- ============================================================================
-- Table
-- ============================================================================

CREATE TABLE "merchant_surfaces" (
  "id"                TEXT          NOT NULL DEFAULT gen_random_uuid()::text,
  "entity_id"         TEXT          NOT NULL,

  "surface_type"      TEXT          NOT NULL,
  "source_url"        TEXT          NOT NULL,

  "content_type"      TEXT,

  "fetch_status"      TEXT          NOT NULL,
  "parse_status"      TEXT,
  "extraction_status" TEXT          NOT NULL DEFAULT 'not_attempted',

  "content_hash"      TEXT,
  "raw_text"          TEXT,
  "raw_html"          TEXT,

  "fetched_at"        TIMESTAMPTZ,
  "discovered_at"     TIMESTAMPTZ   NOT NULL DEFAULT now(),

  "metadata_json"     JSONB,

  CONSTRAINT "merchant_surfaces_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "merchant_surfaces_entity_id_fkey"
    FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX "merchant_surfaces_entity_id_idx"
  ON "merchant_surfaces" ("entity_id");

CREATE INDEX "merchant_surfaces_entity_id_surface_type_idx"
  ON "merchant_surfaces" ("entity_id", "surface_type");

-- Primary replay index: target by type + fetch state
CREATE INDEX "merchant_surfaces_surface_type_fetch_status_idx"
  ON "merchant_surfaces" ("surface_type", "fetch_status");

-- Secondary replay index: target by fetch + parse state
CREATE INDEX "merchant_surfaces_fetch_parse_status_idx"
  ON "merchant_surfaces" ("fetch_status", "parse_status");

-- Extraction targeting: find surfaces not yet extracted per type
CREATE INDEX "merchant_surfaces_surface_type_extraction_idx"
  ON "merchant_surfaces" ("surface_type", "extraction_status");

-- Deduplication: find surfaces with identical content
CREATE INDEX "merchant_surfaces_content_hash_idx"
  ON "merchant_surfaces" ("content_hash");

CREATE INDEX "merchant_surfaces_discovered_at_idx"
  ON "merchant_surfaces" ("discovered_at");

-- ============================================================================
-- Immutability trigger
-- Enforces that no row may ever be updated in place.
-- New fetches or re-fetches must create new rows.
-- ============================================================================

CREATE OR REPLACE FUNCTION merchant_surfaces_prevent_update()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION
    'merchant_surfaces rows are immutable (id=%). '
    'New fetches must create new rows rather than updating existing ones.',
    OLD.id;
  RETURN NULL;
END;
$$;

CREATE TRIGGER merchant_surfaces_no_update
  BEFORE UPDATE ON "merchant_surfaces"
  FOR EACH ROW
  EXECUTE FUNCTION merchant_surfaces_prevent_update();
