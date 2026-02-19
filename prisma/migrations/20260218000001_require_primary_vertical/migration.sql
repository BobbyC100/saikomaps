-- Run this migration AFTER backfilling primary_vertical (scripts/backfill-primary-vertical.sql)
-- and confirming no unmapped rows (scripts/audit-unmapped-primary-vertical.sql).

-- AlterTable
ALTER TABLE "places" ALTER COLUMN "primary_vertical" SET NOT NULL;
