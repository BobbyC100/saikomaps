-- CreateEnum
CREATE TYPE "PersonRole" AS ENUM ('CHEF', 'OWNER', 'OPERATOR', 'FOUNDER', 'PARTNER');

-- CreateEnum
CREATE TYPE "PersonPlaceRole" AS ENUM ('EXECUTIVE_CHEF', 'OWNER', 'FOUNDER', 'FORMER_CHEF', 'PARTNER', 'OPERATOR');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('INTERNAL', 'VERIFIED');

-- AlterTable
ALTER TABLE "places" ADD COLUMN     "restaurant_group_id" TEXT;

-- CreateTable
CREATE TABLE "people" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "role" "PersonRole" NOT NULL,
    "visibility" "Visibility" NOT NULL,
    "bio" TEXT,
    "image_url" TEXT,
    "sources" JSONB NOT NULL,
    "restaurant_group_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "people_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_places" (
    "id" TEXT NOT NULL,
    "person_id" TEXT NOT NULL,
    "place_id" TEXT NOT NULL,
    "role" "PersonPlaceRole" NOT NULL,
    "current" BOOLEAN NOT NULL DEFAULT true,
    "start_year" INTEGER,
    "end_year" INTEGER,
    "source" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "person_places_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurant_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "visibility" "Visibility" NOT NULL,
    "description" TEXT,
    "anchor_city" TEXT,
    "website" TEXT,
    "location_count_estimate" INTEGER,
    "sources" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurant_groups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "people_slug_key" ON "people"("slug");

-- CreateIndex
CREATE INDEX "people_slug_idx" ON "people"("slug");

-- CreateIndex
CREATE INDEX "people_visibility_idx" ON "people"("visibility");

-- CreateIndex
CREATE INDEX "people_restaurant_group_id_idx" ON "people"("restaurant_group_id");

-- CreateIndex
CREATE INDEX "person_places_person_id_idx" ON "person_places"("person_id");

-- CreateIndex
CREATE INDEX "person_places_place_id_idx" ON "person_places"("place_id");

-- CreateIndex
CREATE INDEX "person_places_current_idx" ON "person_places"("current");

-- CreateIndex
CREATE UNIQUE INDEX "person_places_person_id_place_id_role_key" ON "person_places"("person_id", "place_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "restaurant_groups_slug_key" ON "restaurant_groups"("slug");

-- CreateIndex
CREATE INDEX "restaurant_groups_slug_idx" ON "restaurant_groups"("slug");

-- CreateIndex
CREATE INDEX "restaurant_groups_visibility_idx" ON "restaurant_groups"("visibility");

-- CreateIndex
CREATE INDEX "places_restaurant_group_id_idx" ON "places"("restaurant_group_id");

-- AddForeignKey
ALTER TABLE "places" ADD CONSTRAINT "places_restaurant_group_id_fkey" FOREIGN KEY ("restaurant_group_id") REFERENCES "restaurant_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "people" ADD CONSTRAINT "people_restaurant_group_id_fkey" FOREIGN KEY ("restaurant_group_id") REFERENCES "restaurant_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_places" ADD CONSTRAINT "person_places_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_places" ADD CONSTRAINT "person_places_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;
