-- CreateEnum
CREATE TYPE "OrganizingLogic" AS ENUM ('TIME_BASED', 'NEIGHBORHOOD_BASED', 'ROUTE_BASED', 'PURPOSE_BASED', 'LAYERED');

-- CreateEnum
CREATE TYPE "MapStatus" AS ENUM ('DRAFT', 'READY', 'PUBLISHED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "activity_spots" ALTER COLUMN "tags" DROP DEFAULT;

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password_hash" TEXT,
    "avatar_url" TEXT,
    "subscription_tier" TEXT NOT NULL DEFAULT 'free',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lists" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT,
    "description_source" TEXT,
    "slug" TEXT NOT NULL,
    "intro_text" TEXT,
    "function_type" TEXT,
    "function_context" TEXT,
    "scope_geography" TEXT,
    "scope_place_types" TEXT[],
    "scope_exclusions" TEXT[],
    "organizing_logic" "OrganizingLogic",
    "organizing_logic_note" TEXT,
    "notes" TEXT,
    "status" "MapStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMP(3),
    "template_type" TEXT NOT NULL DEFAULT 'city_guide',
    "cover_image_url" TEXT,
    "primary_color" TEXT NOT NULL DEFAULT '#5BA7A7',
    "secondary_color" TEXT NOT NULL DEFAULT '#7FA5A5',
    "access_level" TEXT NOT NULL DEFAULT 'public',
    "password_hash" TEXT,
    "allowed_emails" TEXT[],
    "published" BOOLEAN NOT NULL DEFAULT false,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "list_id" TEXT NOT NULL,
    "google_place_id" TEXT,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "phone" TEXT,
    "website" TEXT,
    "instagram" TEXT,
    "hours" JSONB,
    "description" TEXT,
    "google_types" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "price_level" INTEGER,
    "neighborhood" TEXT,
    "google_photos" JSONB,
    "user_photos" TEXT[],
    "user_note" TEXT,
    "category" TEXT,
    "descriptor" TEXT,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "places_data_cached_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "places" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "google_place_id" TEXT,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "phone" TEXT,
    "website" TEXT,
    "instagram" TEXT,
    "hours" JSONB,
    "description" TEXT,
    "google_photos" JSONB,
    "google_types" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "price_level" INTEGER,
    "neighborhood" TEXT,
    "category" TEXT,
    "places_data_cached_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "places_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "map_places" (
    "id" TEXT NOT NULL,
    "map_id" TEXT NOT NULL,
    "place_id" TEXT NOT NULL,
    "descriptor" VARCHAR(120),
    "user_note" TEXT,
    "user_photos" TEXT[],
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "map_places_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "viewer_bookmarks" (
    "id" TEXT NOT NULL,
    "viewer_user_id" TEXT,
    "place_id" TEXT NOT NULL,
    "visited" BOOLEAN NOT NULL DEFAULT false,
    "personal_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "viewer_bookmarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_jobs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "list_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "total_locations" INTEGER,
    "processed_locations" INTEGER NOT NULL DEFAULT 0,
    "failed_locations" INTEGER NOT NULL DEFAULT 0,
    "error_log" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "lists_slug_key" ON "lists"("slug");

-- CreateIndex
CREATE INDEX "lists_user_id_idx" ON "lists"("user_id");

-- CreateIndex
CREATE INDEX "lists_slug_idx" ON "lists"("slug");

-- CreateIndex
CREATE INDEX "lists_published_idx" ON "lists"("published");

-- CreateIndex
CREATE INDEX "lists_status_idx" ON "lists"("status");

-- CreateIndex
CREATE INDEX "locations_list_id_idx" ON "locations"("list_id");

-- CreateIndex
CREATE INDEX "locations_google_place_id_idx" ON "locations"("google_place_id");

-- CreateIndex
CREATE INDEX "locations_list_id_order_index_idx" ON "locations"("list_id", "order_index");

-- CreateIndex
CREATE INDEX "locations_list_id_category_idx" ON "locations"("list_id", "category");

-- CreateIndex
CREATE UNIQUE INDEX "places_slug_key" ON "places"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "places_google_place_id_key" ON "places"("google_place_id");

-- CreateIndex
CREATE INDEX "places_google_place_id_idx" ON "places"("google_place_id");

-- CreateIndex
CREATE INDEX "places_category_idx" ON "places"("category");

-- CreateIndex
CREATE INDEX "places_neighborhood_idx" ON "places"("neighborhood");

-- CreateIndex
CREATE INDEX "map_places_map_id_idx" ON "map_places"("map_id");

-- CreateIndex
CREATE INDEX "map_places_place_id_idx" ON "map_places"("place_id");

-- CreateIndex
CREATE INDEX "map_places_map_id_order_index_idx" ON "map_places"("map_id", "order_index");

-- CreateIndex
CREATE UNIQUE INDEX "map_places_map_id_place_id_key" ON "map_places"("map_id", "place_id");

-- CreateIndex
CREATE INDEX "viewer_bookmarks_viewer_user_id_idx" ON "viewer_bookmarks"("viewer_user_id");

-- CreateIndex
CREATE INDEX "viewer_bookmarks_place_id_idx" ON "viewer_bookmarks"("place_id");

-- CreateIndex
CREATE UNIQUE INDEX "viewer_bookmarks_viewer_user_id_place_id_key" ON "viewer_bookmarks"("viewer_user_id", "place_id");

-- CreateIndex
CREATE INDEX "import_jobs_user_id_idx" ON "import_jobs"("user_id");

-- CreateIndex
CREATE INDEX "import_jobs_status_idx" ON "import_jobs"("status");

-- AddForeignKey
ALTER TABLE "lists" ADD CONSTRAINT "lists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "map_places" ADD CONSTRAINT "map_places_map_id_fkey" FOREIGN KEY ("map_id") REFERENCES "lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "map_places" ADD CONSTRAINT "map_places_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viewer_bookmarks" ADD CONSTRAINT "viewer_bookmarks_viewer_user_id_fkey" FOREIGN KEY ("viewer_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viewer_bookmarks" ADD CONSTRAINT "viewer_bookmarks_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "lists"("id") ON DELETE SET NULL ON UPDATE CASCADE;
