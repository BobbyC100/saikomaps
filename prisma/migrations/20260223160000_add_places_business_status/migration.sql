-- Add business_status to places (from Google Place Details; used to exclude CLOSED_PERMANENTLY from coverage)
ALTER TABLE "places" ADD COLUMN IF NOT EXISTS "business_status" TEXT;
CREATE INDEX IF NOT EXISTS "places_business_status_idx" ON "places"("business_status");
