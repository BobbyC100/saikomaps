-- CreateEnum
CREATE TYPE "PlaceStatus" AS ENUM ('OPEN', 'CLOSED', 'PERMANENTLY_CLOSED');

-- AlterTable
ALTER TABLE "places" ADD COLUMN     "status" "PlaceStatus" NOT NULL DEFAULT 'OPEN';

-- CreateIndex
CREATE INDEX "places_status_idx" ON "places"("status");
