-- CreateEnum
CREATE TYPE "PlaceStatus" AS ENUM ('OPEN', 'CLOSED', 'PERMANENTLY_CLOSED');

-- CreateEnum
CREATE TYPE "MapStatus" AS ENUM ('DRAFT', 'READY', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "OrganizingLogic" AS ENUM ('TIME_BASED', 'NEIGHBORHOOD_BASED', 'ROUTE_BASED', 'PURPOSE_BASED', 'LAYERED');

-- CreateEnum
CREATE TYPE "LayerType" AS ENUM ('SKATE', 'SURF');

-- CreateEnum
CREATE TYPE "SpotSource" AS ENUM ('OSM', 'CITY_DATA', 'EDITORIAL', 'COMMUNITY');

-- CreateEnum
CREATE TYPE "PersonRole" AS ENUM ('CHEF', 'OWNER', 'OPERATOR', 'FOUNDER', 'PARTNER');

-- CreateEnum
CREATE TYPE "PersonPlaceRole" AS ENUM ('EXECUTIVE_CHEF', 'OWNER', 'FOUNDER', 'FORMER_CHEF', 'PARTNER', 'OPERATOR');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('INTERNAL', 'VERIFIED');

-- CreateEnum
CREATE TYPE "LifecycleStatus" AS ENUM ('ACTIVE', 'LEGACY_FAVORITE', 'FLAG_FOR_REVIEW', 'ARCHIVED', 'CLOSED_PERMANENTLY');

-- CreateEnum
CREATE TYPE "ArchiveReason" AS ENUM ('CLOSED', 'AGED_OUT', 'QUALITY_DECLINE', 'DATA_ERROR', 'MANUAL');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'SOURCE_CONFIRMED', 'FOUNDER_VERIFIED');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('PUBLICATION', 'VIDEO_CHANNEL', 'BLOG', 'INSTAGRAM', 'OTHER');

-- CreateEnum
CREATE TYPE "SourceStatus" AS ENUM ('PENDING', 'APPROVED', 'DISABLED');

-- CreateEnum
CREATE TYPE "CoverageStatus" AS ENUM ('PENDING', 'APPROVED', 'DISABLED');

-- CreateEnum
CREATE TYPE "TagStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "ApiTrigger" AS ENUM ('MANUAL', 'JOB', 'USER_ACTION');

-- CreateEnum
CREATE TYPE "PlaceScope" AS ENUM ('active', 'future_region', 'archive', 'hidden');

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
    "coverage_sources" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "curator_note" VARCHAR(140),
    "scope_pills" TEXT[] DEFAULT ARRAY[]::TEXT[],

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
    "template_type" TEXT NOT NULL DEFAULT 'field-notes',
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
    "editorial_sources" JSONB,
    "cuisine_type" TEXT,
    "ad_unit_override" BOOLEAN NOT NULL DEFAULT false,
    "ad_unit_type" TEXT,
    "pull_quote" TEXT,
    "pull_quote_author" TEXT,
    "pull_quote_source" TEXT,
    "pull_quote_type" TEXT,
    "pull_quote_url" TEXT,
    "tagline" TEXT,
    "tagline_candidates" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tagline_generated" TIMESTAMP(3),
    "tagline_pattern" TEXT,
    "tagline_signals" JSONB,
    "tips" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "vibe_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "chef_recs" JSONB,
    "restaurant_group_id" TEXT,
    "status" "PlaceStatus" NOT NULL DEFAULT 'OPEN',
    "intent_profile" TEXT,
    "intent_profile_override" BOOLEAN NOT NULL DEFAULT false,
    "reservation_url" TEXT,
    "city" TEXT,
    "country" TEXT,
    "scope" "PlaceScope" NOT NULL DEFAULT 'active',
    "state" TEXT,
    "zip" TEXT,
    "county" TEXT,
    "region" TEXT,
    "google_places_attributes" JSONB,
    "city_id" TEXT,
    "neighborhood_id" TEXT,
    "neighborhood_override" TEXT,
    "saiko_summary" TEXT,
    "saiko_summary_coverage_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "saiko_summary_generated_at" TIMESTAMP(3),
    "saiko_summary_model_version" TEXT,
    "last_score_update" TIMESTAMP(3),
    "ranking_score" DOUBLE PRECISION DEFAULT 0,
    "cuisine_primary" TEXT,
    "cuisine_secondary" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "discovered_about_copy" TEXT,
    "discovered_about_url" TEXT,
    "discovered_fields_evidence" JSONB,
    "discovered_fields_fetched_at" TIMESTAMP(3),
    "discovered_instagram_handle" TEXT,
    "discovered_menu_url" TEXT,
    "discovered_phone" TEXT,
    "discovered_reservations_url" TEXT,
    "discovered_winelist_url" TEXT,
    "about_url" TEXT,
    "menu_url" TEXT,
    "winelist_url" TEXT,

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

-- CreateTable
CREATE TABLE "saved_maps" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "list_id" TEXT NOT NULL,
    "saved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_maps_pkey" PRIMARY KEY ("id")
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
    "tags" TEXT[],
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

-- CreateTable
CREATE TABLE "raw_records" (
    "raw_id" TEXT NOT NULL,
    "source_name" TEXT NOT NULL,
    "external_id" TEXT,
    "source_url" TEXT,
    "placekey" TEXT,
    "h3_index_r9" BIGINT,
    "h3_neighbors_r9" BIGINT[],
    "raw_json" JSONB NOT NULL,
    "name_normalized" TEXT,
    "lat" DECIMAL(10,7),
    "lng" DECIMAL(11,7),
    "observed_at" TIMESTAMP(3),
    "ingested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_processed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "raw_records_pkey" PRIMARY KEY ("raw_id")
);

-- CreateTable
CREATE TABLE "entity_links" (
    "canonical_id" TEXT NOT NULL,
    "raw_id" TEXT NOT NULL,
    "match_confidence" DECIMAL(4,3),
    "match_method" TEXT NOT NULL,
    "match_features" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "linked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "linked_by" TEXT,

    CONSTRAINT "entity_links_pkey" PRIMARY KEY ("canonical_id","raw_id")
);

-- CreateTable
CREATE TABLE "golden_records" (
    "canonical_id" TEXT NOT NULL,
    "placekey" TEXT,
    "google_place_id" TEXT,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_display" TEXT,
    "lat" DECIMAL(10,7) NOT NULL,
    "lng" DECIMAL(11,7) NOT NULL,
    "address_street" TEXT,
    "address_city" TEXT,
    "address_state" TEXT,
    "address_zip" TEXT,
    "neighborhood" TEXT,
    "category" TEXT,
    "cuisines" TEXT[],
    "price_level" INTEGER,
    "phone" TEXT,
    "website" TEXT,
    "instagram_handle" TEXT,
    "hours_json" JSONB,
    "hours_irregular" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "vibe_tags" TEXT[],
    "signature_dishes" TEXT[],
    "pro_tips" TEXT[],
    "pull_quote" TEXT,
    "pull_quote_source" TEXT,
    "pull_quote_url" TEXT,
    "business_status" TEXT NOT NULL DEFAULT 'operational',
    "source_attribution" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_resolved_at" TIMESTAMP(3),
    "data_completeness" DECIMAL(3,2),
    "source_count" INTEGER NOT NULL DEFAULT 1,
    "archive_reason" "ArchiveReason",
    "archived_at" TIMESTAMP(3),
    "archived_by" TEXT,
    "lifecycle_status" "LifecycleStatus" NOT NULL DEFAULT 'ACTIVE',
    "enriched_at" TIMESTAMP(3),
    "county" TEXT,
    "about_copy" TEXT,
    "about_source_url" TEXT,
    "menu_raw_text" TEXT,
    "menu_source_url" TEXT,
    "menu_url" TEXT,
    "scrape_status" TEXT,
    "scraped_at" TIMESTAMP(3),
    "winelist_raw_text" TEXT,
    "winelist_source_url" TEXT,
    "winelist_url" TEXT,
    "cuisine_posture" TEXT,
    "identity_signals" JSONB,
    "place_personality" TEXT,
    "price_tier" TEXT,
    "service_model" TEXT,
    "signals_generated_at" TIMESTAMP(3),
    "signals_reviewed" BOOLEAN NOT NULL DEFAULT false,
    "signals_reviewed_at" TIMESTAMP(3),
    "signals_reviewed_by" TEXT,
    "signals_version" INTEGER,
    "wine_program_intent" TEXT,
    "tagline" TEXT,
    "tagline_candidates" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tagline_generated_at" TIMESTAMP(3),
    "tagline_pattern" TEXT,
    "tagline_signals" JSONB,
    "tagline_version" INTEGER,
    "google_places_attributes" JSONB,
    "google_places_attributes_fetched_at" TIMESTAMP(3),

    CONSTRAINT "golden_records_pkey" PRIMARY KEY ("canonical_id")
);

-- CreateTable
CREATE TABLE "review_queue" (
    "queue_id" TEXT NOT NULL,
    "canonical_id" TEXT,
    "raw_id_a" TEXT NOT NULL,
    "raw_id_b" TEXT,
    "conflict_type" TEXT NOT NULL,
    "match_confidence" DECIMAL(4,3),
    "conflicting_fields" JSONB,
    "priority" INTEGER NOT NULL DEFAULT 5,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "resolution" TEXT,
    "resolution_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_to" TEXT,
    "resolved_by" TEXT,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "review_queue_pkey" PRIMARY KEY ("queue_id")
);

-- CreateTable
CREATE TABLE "review_audit_log" (
    "log_id" TEXT NOT NULL,
    "queue_id" TEXT NOT NULL,
    "resolved_by" TEXT NOT NULL,
    "resolution" TEXT NOT NULL,
    "decision_time_ms" INTEGER,
    "resolved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_audit_log_pkey" PRIMARY KEY ("log_id")
);

-- CreateTable
CREATE TABLE "provenance" (
    "id" TEXT NOT NULL,
    "place_id" TEXT NOT NULL,
    "added_by" TEXT NOT NULL,
    "source_type" TEXT,
    "source_name" TEXT,
    "source_url" TEXT,
    "source_date" TIMESTAMP(3),
    "notes" TEXT,
    "import_batch" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source_tier" INTEGER,
    "source_verified_at" TIMESTAMP(3),
    "source_verified_by" TEXT,
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',

    CONSTRAINT "provenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "countries" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cities" (
    "id" TEXT NOT NULL,
    "country_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "neighborhoods" (
    "id" TEXT NOT NULL,
    "city_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "neighborhoods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sources" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SourceType" NOT NULL,
    "status" "SourceStatus" NOT NULL DEFAULT 'PENDING',
    "approved_at" TIMESTAMP(3),
    "approved_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "place_coverages" (
    "id" TEXT NOT NULL,
    "place_id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "city_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "published_at" TIMESTAMP(3),
    "excerpt" TEXT,
    "quote" TEXT,
    "quote_author" TEXT,
    "status" "CoverageStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "place_coverages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "TagStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_call_logs" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "trigger" "ApiTrigger" NOT NULL,
    "actor_user_id" TEXT,
    "place_id" TEXT,
    "map_id" TEXT,
    "job_id" TEXT,
    "request_hash" TEXT,
    "estimated_cost_usd" DECIMAL(10,4),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_call_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "lists_slug_key" ON "lists"("slug");

-- CreateIndex
CREATE INDEX "lists_published_idx" ON "lists"("published");

-- CreateIndex
CREATE INDEX "lists_slug_idx" ON "lists"("slug");

-- CreateIndex
CREATE INDEX "lists_status_idx" ON "lists"("status");

-- CreateIndex
CREATE INDEX "lists_user_id_idx" ON "lists"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "places_slug_key" ON "places"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "places_google_place_id_key" ON "places"("google_place_id");

-- CreateIndex
CREATE INDEX "places_category_idx" ON "places"("category");

-- CreateIndex
CREATE INDEX "places_google_place_id_idx" ON "places"("google_place_id");

-- CreateIndex
CREATE INDEX "places_neighborhood_idx" ON "places"("neighborhood");

-- CreateIndex
CREATE INDEX "places_restaurant_group_id_idx" ON "places"("restaurant_group_id");

-- CreateIndex
CREATE INDEX "places_status_idx" ON "places"("status");

-- CreateIndex
CREATE INDEX "places_city_id_idx" ON "places"("city_id");

-- CreateIndex
CREATE INDEX "places_neighborhood_id_idx" ON "places"("neighborhood_id");

-- CreateIndex
CREATE INDEX "places_ranking_score_idx" ON "places"("ranking_score" DESC);

-- CreateIndex
CREATE INDEX "map_places_map_id_idx" ON "map_places"("map_id");

-- CreateIndex
CREATE INDEX "map_places_map_id_order_index_idx" ON "map_places"("map_id", "order_index");

-- CreateIndex
CREATE INDEX "map_places_place_id_idx" ON "map_places"("place_id");

-- CreateIndex
CREATE UNIQUE INDEX "map_places_map_id_place_id_key" ON "map_places"("map_id", "place_id");

-- CreateIndex
CREATE INDEX "locations_google_place_id_idx" ON "locations"("google_place_id");

-- CreateIndex
CREATE INDEX "locations_list_id_category_idx" ON "locations"("list_id", "category");

-- CreateIndex
CREATE INDEX "locations_list_id_idx" ON "locations"("list_id");

-- CreateIndex
CREATE INDEX "locations_list_id_order_index_idx" ON "locations"("list_id", "order_index");

-- CreateIndex
CREATE INDEX "import_jobs_status_idx" ON "import_jobs"("status");

-- CreateIndex
CREATE INDEX "import_jobs_user_id_idx" ON "import_jobs"("user_id");

-- CreateIndex
CREATE INDEX "saved_maps_user_id_idx" ON "saved_maps"("user_id");

-- CreateIndex
CREATE INDEX "saved_maps_list_id_idx" ON "saved_maps"("list_id");

-- CreateIndex
CREATE UNIQUE INDEX "saved_maps_user_id_list_id_key" ON "saved_maps"("user_id", "list_id");

-- CreateIndex
CREATE INDEX "viewer_bookmarks_place_id_idx" ON "viewer_bookmarks"("place_id");

-- CreateIndex
CREATE INDEX "viewer_bookmarks_viewer_user_id_idx" ON "viewer_bookmarks"("viewer_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "viewer_bookmarks_viewer_user_id_place_id_key" ON "viewer_bookmarks"("viewer_user_id", "place_id");

-- CreateIndex
CREATE UNIQUE INDEX "activity_spots_slug_key" ON "activity_spots"("slug");

-- CreateIndex
CREATE INDEX "activity_spots_layer_type_city_idx" ON "activity_spots"("layer_type", "city");

-- CreateIndex
CREATE INDEX "activity_spots_layer_type_latitude_longitude_idx" ON "activity_spots"("layer_type", "latitude", "longitude");

-- CreateIndex
CREATE INDEX "activity_spots_source_source_id_idx" ON "activity_spots"("source", "source_id");

-- CreateIndex
CREATE UNIQUE INDEX "people_slug_key" ON "people"("slug");

-- CreateIndex
CREATE INDEX "people_restaurant_group_id_idx" ON "people"("restaurant_group_id");

-- CreateIndex
CREATE INDEX "people_slug_idx" ON "people"("slug");

-- CreateIndex
CREATE INDEX "people_visibility_idx" ON "people"("visibility");

-- CreateIndex
CREATE INDEX "person_places_current_idx" ON "person_places"("current");

-- CreateIndex
CREATE INDEX "person_places_person_id_idx" ON "person_places"("person_id");

-- CreateIndex
CREATE INDEX "person_places_place_id_idx" ON "person_places"("place_id");

-- CreateIndex
CREATE UNIQUE INDEX "person_places_person_id_place_id_role_key" ON "person_places"("person_id", "place_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "restaurant_groups_slug_key" ON "restaurant_groups"("slug");

-- CreateIndex
CREATE INDEX "restaurant_groups_slug_idx" ON "restaurant_groups"("slug");

-- CreateIndex
CREATE INDEX "restaurant_groups_visibility_idx" ON "restaurant_groups"("visibility");

-- CreateIndex
CREATE INDEX "raw_records_h3_index_r9_idx" ON "raw_records"("h3_index_r9");

-- CreateIndex
CREATE INDEX "raw_records_placekey_idx" ON "raw_records"("placekey");

-- CreateIndex
CREATE INDEX "raw_records_is_processed_idx" ON "raw_records"("is_processed");

-- CreateIndex
CREATE INDEX "raw_records_name_normalized_idx" ON "raw_records"("name_normalized");

-- CreateIndex
CREATE UNIQUE INDEX "raw_records_source_name_external_id_key" ON "raw_records"("source_name", "external_id");

-- CreateIndex
CREATE INDEX "entity_links_raw_id_idx" ON "entity_links"("raw_id");

-- CreateIndex
CREATE INDEX "entity_links_canonical_id_idx" ON "entity_links"("canonical_id");

-- CreateIndex
CREATE INDEX "entity_links_match_method_idx" ON "entity_links"("match_method");

-- CreateIndex
CREATE UNIQUE INDEX "golden_records_placekey_key" ON "golden_records"("placekey");

-- CreateIndex
CREATE UNIQUE INDEX "golden_records_slug_key" ON "golden_records"("slug");

-- CreateIndex
CREATE INDEX "golden_records_neighborhood_idx" ON "golden_records"("neighborhood");

-- CreateIndex
CREATE INDEX "golden_records_category_idx" ON "golden_records"("category");

-- CreateIndex
CREATE INDEX "golden_records_business_status_idx" ON "golden_records"("business_status");

-- CreateIndex
CREATE INDEX "golden_records_slug_idx" ON "golden_records"("slug");

-- CreateIndex
CREATE INDEX "review_queue_status_idx" ON "review_queue"("status");

-- CreateIndex
CREATE INDEX "review_queue_priority_status_idx" ON "review_queue"("priority", "status");

-- CreateIndex
CREATE INDEX "review_queue_canonical_id_idx" ON "review_queue"("canonical_id");

-- CreateIndex
CREATE INDEX "review_audit_log_queue_id_idx" ON "review_audit_log"("queue_id");

-- CreateIndex
CREATE INDEX "review_audit_log_resolved_at_idx" ON "review_audit_log"("resolved_at");

-- CreateIndex
CREATE INDEX "provenance_place_id_idx" ON "provenance"("place_id");

-- CreateIndex
CREATE INDEX "provenance_added_by_idx" ON "provenance"("added_by");

-- CreateIndex
CREATE INDEX "provenance_import_batch_idx" ON "provenance"("import_batch");

-- CreateIndex
CREATE UNIQUE INDEX "countries_code_key" ON "countries"("code");

-- CreateIndex
CREATE UNIQUE INDEX "cities_slug_key" ON "cities"("slug");

-- CreateIndex
CREATE INDEX "neighborhoods_city_id_idx" ON "neighborhoods"("city_id");

-- CreateIndex
CREATE UNIQUE INDEX "neighborhoods_city_id_slug_key" ON "neighborhoods"("city_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "sources_name_key" ON "sources"("name");

-- CreateIndex
CREATE INDEX "sources_status_idx" ON "sources"("status");

-- CreateIndex
CREATE INDEX "place_coverages_place_id_idx" ON "place_coverages"("place_id");

-- CreateIndex
CREATE INDEX "place_coverages_source_id_idx" ON "place_coverages"("source_id");

-- CreateIndex
CREATE INDEX "place_coverages_city_id_idx" ON "place_coverages"("city_id");

-- CreateIndex
CREATE INDEX "place_coverages_status_idx" ON "place_coverages"("status");

-- CreateIndex
CREATE UNIQUE INDEX "tags_slug_key" ON "tags"("slug");

-- CreateIndex
CREATE INDEX "tags_status_idx" ON "tags"("status");

-- CreateIndex
CREATE INDEX "api_call_logs_provider_created_at_idx" ON "api_call_logs"("provider", "created_at");

-- CreateIndex
CREATE INDEX "api_call_logs_place_id_idx" ON "api_call_logs"("place_id");

-- CreateIndex
CREATE INDEX "api_call_logs_map_id_idx" ON "api_call_logs"("map_id");

-- AddForeignKey
ALTER TABLE "lists" ADD CONSTRAINT "lists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "places" ADD CONSTRAINT "places_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "places" ADD CONSTRAINT "places_neighborhood_id_fkey" FOREIGN KEY ("neighborhood_id") REFERENCES "neighborhoods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "places" ADD CONSTRAINT "places_restaurant_group_id_fkey" FOREIGN KEY ("restaurant_group_id") REFERENCES "restaurant_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "map_places" ADD CONSTRAINT "map_places_map_id_fkey" FOREIGN KEY ("map_id") REFERENCES "lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "map_places" ADD CONSTRAINT "map_places_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "lists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_maps" ADD CONSTRAINT "saved_maps_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_maps" ADD CONSTRAINT "saved_maps_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viewer_bookmarks" ADD CONSTRAINT "viewer_bookmarks_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viewer_bookmarks" ADD CONSTRAINT "viewer_bookmarks_viewer_user_id_fkey" FOREIGN KEY ("viewer_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "people" ADD CONSTRAINT "people_restaurant_group_id_fkey" FOREIGN KEY ("restaurant_group_id") REFERENCES "restaurant_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_places" ADD CONSTRAINT "person_places_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_places" ADD CONSTRAINT "person_places_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_links" ADD CONSTRAINT "entity_links_canonical_id_fkey" FOREIGN KEY ("canonical_id") REFERENCES "golden_records"("canonical_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_links" ADD CONSTRAINT "entity_links_raw_id_fkey" FOREIGN KEY ("raw_id") REFERENCES "raw_records"("raw_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_queue" ADD CONSTRAINT "review_queue_canonical_id_fkey" FOREIGN KEY ("canonical_id") REFERENCES "golden_records"("canonical_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_queue" ADD CONSTRAINT "review_queue_raw_id_a_fkey" FOREIGN KEY ("raw_id_a") REFERENCES "raw_records"("raw_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_queue" ADD CONSTRAINT "review_queue_raw_id_b_fkey" FOREIGN KEY ("raw_id_b") REFERENCES "raw_records"("raw_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_audit_log" ADD CONSTRAINT "review_audit_log_queue_id_fkey" FOREIGN KEY ("queue_id") REFERENCES "review_queue"("queue_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provenance" ADD CONSTRAINT "provenance_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "golden_records"("canonical_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cities" ADD CONSTRAINT "cities_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "neighborhoods" ADD CONSTRAINT "neighborhoods_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sources" ADD CONSTRAINT "sources_approved_by_user_id_fkey" FOREIGN KEY ("approved_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_coverages" ADD CONSTRAINT "place_coverages_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_coverages" ADD CONSTRAINT "place_coverages_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_coverages" ADD CONSTRAINT "place_coverages_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_call_logs" ADD CONSTRAINT "api_call_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_call_logs" ADD CONSTRAINT "api_call_logs_map_id_fkey" FOREIGN KEY ("map_id") REFERENCES "lists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_call_logs" ADD CONSTRAINT "api_call_logs_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE SET NULL ON UPDATE CASCADE;

