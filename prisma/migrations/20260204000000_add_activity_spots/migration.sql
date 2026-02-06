-- CreateEnum
CREATE TYPE "LayerType" AS ENUM ('SKATE', 'SURF');

-- CreateEnum
CREATE TYPE "SpotSource" AS ENUM ('OSM', 'CITY_DATA', 'EDITORIAL', 'COMMUNITY');

-- CreateTable
CREATE TABLE "activity_spots" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "layer_type" "LayerType" NOT NULL,
    "city" TEXT,
    "region" TEXT,
    "country" TEXT NOT NULL DEFAULT 'US',
    "spot_type" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "surface" TEXT,
    "skill_level" TEXT,
    "exposure" TEXT,
    "description" TEXT,
    "seasonality" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "source" "SpotSource" NOT NULL,
    "source_id" TEXT,
    "source_url" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activity_spots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "activity_spots_slug_key" ON "activity_spots"("slug");

-- CreateIndex
CREATE INDEX "activity_spots_layer_type_city_idx" ON "activity_spots"("layer_type", "city");

-- CreateIndex
CREATE INDEX "activity_spots_layer_type_latitude_longitude_idx" ON "activity_spots"("layer_type", "latitude", "longitude");

-- CreateIndex
CREATE INDEX "activity_spots_source_source_id_idx" ON "activity_spots"("source", "source_id");
