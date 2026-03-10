-- WO-002B: Extend menu_fetches to support PDF acquisition rows.
-- Adds three new nullable columns and one covering index.
-- Append-only: no existing rows are affected.

ALTER TABLE "menu_fetches"
  ADD COLUMN IF NOT EXISTS "content_type"       TEXT,
  ADD COLUMN IF NOT EXISTS "pdf_type"           TEXT,
  ADD COLUMN IF NOT EXISTS "extraction_quality" TEXT;

-- Index to drive OCR prioritisation queries later
-- (SELECT * FROM menu_fetches WHERE extraction_quality = 'empty' AND pdf_type = 'image_based')
CREATE INDEX IF NOT EXISTS "menu_fetches_extraction_quality_idx"
  ON "menu_fetches"("extraction_quality");
