-- Add winelist_url to merchant_signals
-- Allows entity-side (non-golden) wine list URL capture, priority 1 in route over golden_records
ALTER TABLE "merchant_signals" ADD COLUMN "winelist_url" TEXT;
