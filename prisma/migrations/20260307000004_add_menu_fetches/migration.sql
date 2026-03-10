-- Migration: add menu_fetches
-- Append-only table for menu page fetch records.
-- raw_text stored in Postgres. HTML receipt stored in R2 via raw_html_pointer.
-- Current state = latest successful fetch (http_status < 400) per entity_id.

CREATE TABLE "menu_fetches" (
    "id"                     TEXT          NOT NULL,
    "entity_id"              TEXT          NOT NULL,
    "source_url"             TEXT          NOT NULL,
    "final_url"              TEXT,
    "menu_format"            TEXT          NOT NULL DEFAULT 'html',
    "http_status"            INTEGER,
    "fetch_duration_ms"      INTEGER,
    "fetched_at"             TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "raw_text"               TEXT,
    "content_hash"           TEXT,
    "raw_html_pointer"       TEXT,
    "text_extraction_method" TEXT,
    "created_at"             TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "menu_fetches_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "menu_fetches_entity_id_idx"   ON "menu_fetches"("entity_id");
CREATE INDEX "menu_fetches_fetched_at_idx"  ON "menu_fetches"("fetched_at");
CREATE INDEX "menu_fetches_content_hash_idx" ON "menu_fetches"("content_hash");

ALTER TABLE "menu_fetches"
    ADD CONSTRAINT "menu_fetches_entity_id_fkey"
    FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
