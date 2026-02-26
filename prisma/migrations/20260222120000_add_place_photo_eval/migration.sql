-- CreateEnum
CREATE TYPE "PlacePhotoEvalTier" AS ENUM ('HERO', 'GALLERY', 'REJECT');

-- CreateEnum
CREATE TYPE "PlacePhotoEvalType" AS ENUM ('EXTERIOR', 'INTERIOR', 'CONTEXT', 'FOOD');

-- CreateTable
CREATE TABLE "place_photo_eval" (
    "id" TEXT NOT NULL,
    "place_id" TEXT NOT NULL,
    "google_place_id" TEXT NOT NULL,
    "photo_ref" TEXT NOT NULL,
    "width_px" INTEGER NOT NULL,
    "height_px" INTEGER NOT NULL,
    "requested_max_width_px" INTEGER NOT NULL DEFAULT 1600,
    "tier" "PlacePhotoEvalTier" NOT NULL,
    "type" "PlacePhotoEvalType",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "place_photo_eval_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "place_photo_eval_place_id_photo_ref_key" ON "place_photo_eval"("place_id", "photo_ref");

-- CreateIndex
CREATE INDEX "place_photo_eval_place_id_idx" ON "place_photo_eval"("place_id");

-- AddForeignKey
ALTER TABLE "place_photo_eval" ADD CONSTRAINT "place_photo_eval_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;
