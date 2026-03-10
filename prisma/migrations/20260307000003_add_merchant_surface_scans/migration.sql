-- Migration: add merchant_surface_scans
-- Append-only table for surface presence scan snapshots.
-- Current state is derived by querying the latest row per entity_id.

CREATE TABLE "merchant_surface_scans" (
    "id"                       TEXT          NOT NULL,
    "entity_id"                TEXT          NOT NULL,
    "fetched_at"               TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source_url"               TEXT          NOT NULL,
    "final_url"                TEXT,
    "http_status"              INTEGER,

    "website_platform"         TEXT,

    "menu_present"             BOOLEAN       NOT NULL DEFAULT FALSE,
    "menu_format"              TEXT,
    "menu_url"                 TEXT,
    "menu_read_state"          TEXT,

    "reservation_platform"     TEXT,
    "reservation_url"          TEXT,

    "ordering_platform"        TEXT,
    "ordering_url"             TEXT,

    "instagram_present"        BOOLEAN       NOT NULL DEFAULT FALSE,
    "instagram_url"            TEXT,

    "newsletter_present"       BOOLEAN       NOT NULL DEFAULT FALSE,
    "newsletter_platform"      TEXT,

    "gift_cards_present"       BOOLEAN       NOT NULL DEFAULT FALSE,
    "careers_present"          BOOLEAN       NOT NULL DEFAULT FALSE,
    "private_dining_present"   BOOLEAN       NOT NULL DEFAULT FALSE,

    "sibling_entities_present" BOOLEAN       NOT NULL DEFAULT FALSE,
    "sibling_entity_urls"      JSONB,
    "sibling_entity_labels"    JSONB,

    CONSTRAINT "merchant_surface_scans_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "merchant_surface_scans_entity_id_idx"  ON "merchant_surface_scans"("entity_id");
CREATE INDEX "merchant_surface_scans_fetched_at_idx" ON "merchant_surface_scans"("fetched_at");

ALTER TABLE "merchant_surface_scans"
    ADD CONSTRAINT "merchant_surface_scans_entity_id_fkey"
    FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
