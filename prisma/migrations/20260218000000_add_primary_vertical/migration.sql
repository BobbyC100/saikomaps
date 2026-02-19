-- CreateEnum
CREATE TYPE "PrimaryVertical" AS ENUM ('EAT', 'COFFEE', 'WINE', 'DRINKS', 'SHOP', 'CULTURE', 'NATURE', 'STAY', 'WELLNESS', 'BAKERY', 'PURVEYORS', 'ACTIVITY');

-- AlterTable
ALTER TABLE "places" ADD COLUMN "primary_vertical" "PrimaryVertical";

-- CreateIndex
CREATE INDEX "places_primary_vertical_idx" ON "places"("primary_vertical");
