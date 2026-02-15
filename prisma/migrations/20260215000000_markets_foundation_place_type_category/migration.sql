-- CreateEnum
CREATE TYPE "PlaceType" AS ENUM ('venue', 'activity', 'public');

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "places" ADD COLUMN     "place_type" "PlaceType" NOT NULL DEFAULT 'venue',
ADD COLUMN     "category_id" TEXT,
ADD COLUMN     "parent_id" TEXT,
ADD COLUMN     "market_schedule" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "places_category_id_idx" ON "places"("category_id");

-- CreateIndex
CREATE INDEX "places_parent_id_idx" ON "places"("parent_id");

-- AddForeignKey
ALTER TABLE "places" ADD CONSTRAINT "places_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "places" ADD CONSTRAINT "places_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "places"("id") ON DELETE SET NULL ON UPDATE CASCADE;
