-- TimeFOLD v1 — Minimal Consumer Expression
-- WO: S.K.A.I./WO-TIMEFOLD-001 v1.1
--
-- Adds temporal classification and editorial publication state to entities.
-- Phrase text is NOT stored in the database (hardcoded at application layer).
-- No public rendering unless timefold_status = 'APPROVED'.

ALTER TABLE "entities"
  ADD COLUMN "timefold_class"          TEXT CHECK ("timefold_class" IN ('STABILITY', 'NEWNESS')),
  ADD COLUMN "timefold_status"         TEXT CHECK ("timefold_status" IN ('PROPOSED', 'APPROVED', 'SUPPRESSED')),
  ADD COLUMN "timefold_proposed_at"    TIMESTAMP(3),
  ADD COLUMN "timefold_proposed_by"    TEXT,
  ADD COLUMN "timefold_approved_at"    TIMESTAMP(3),
  ADD COLUMN "timefold_approved_by"    TEXT,
  ADD COLUMN "timefold_suppressed_at"  TIMESTAMP(3),
  ADD COLUMN "timefold_suppressed_by"  TEXT;

-- Index on status for efficient render-gate queries
CREATE INDEX "entities_timefold_status_idx" ON "entities"("timefold_status");
