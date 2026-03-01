-- CreateEnum
CREATE TYPE "PlaceAppearanceStatus" AS ENUM ('ACTIVE', 'ENDED', 'ANNOUNCED');

-- CreateTable
CREATE TABLE "place_appearances" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "subject_place_id" TEXT NOT NULL,
    "host_place_id" TEXT,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "address_text" TEXT,
    "schedule_text" TEXT NOT NULL,
    "status" "PlaceAppearanceStatus" NOT NULL DEFAULT 'ACTIVE',
    "sources" JSONB,
    "confidence" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "place_appearances_pkey" PRIMARY KEY ("id")
);

-- Add constraint: either host_place_id IS NOT NULL OR (latitude AND longitude AND address_text) all present
ALTER TABLE "place_appearances" ADD CONSTRAINT "place_appearances_location_check" CHECK (
    ("host_place_id" IS NOT NULL)
    OR
    ("latitude" IS NOT NULL AND "longitude" IS NOT NULL AND "address_text" IS NOT NULL)
);

-- CreateIndex
CREATE INDEX "place_appearances_subject_place_id_status_idx" ON "place_appearances"("subject_place_id", "status");

-- CreateIndex
CREATE INDEX "place_appearances_host_place_id_status_idx" ON "place_appearances"("host_place_id", "status");

-- AddForeignKey
ALTER TABLE "place_appearances" ADD CONSTRAINT "place_appearances_subject_place_id_fkey" FOREIGN KEY ("subject_place_id") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_appearances" ADD CONSTRAINT "place_appearances_host_place_id_fkey" FOREIGN KEY ("host_place_id") REFERENCES "places"("id") ON DELETE SET NULL ON UPDATE CASCADE;
