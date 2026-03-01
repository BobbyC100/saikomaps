-- Allow NULL lat/lng on golden_records (curated import without coords)
ALTER TABLE "golden_records" ALTER COLUMN "lat" DROP NOT NULL;
ALTER TABLE "golden_records" ALTER COLUMN "lng" DROP NOT NULL;
