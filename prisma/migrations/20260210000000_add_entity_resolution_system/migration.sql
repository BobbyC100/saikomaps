-- CreateEnum for entity resolution system
CREATE TYPE "LifecycleStatus" AS ENUM ('ACTIVE', 'LEGACY_FAVORITE', 'FLAG_FOR_REVIEW', 'ARCHIVED', 'CLOSED_PERMANENTLY');
CREATE TYPE "ArchiveReason" AS ENUM ('CLOSED', 'AGED_OUT', 'QUALITY_DECLINE', 'DATA_ERROR', 'MANUAL');
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'SOURCE_CONFIRMED', 'FOUNDER_VERIFIED');
CREATE TYPE "signal_status" AS ENUM ('ok', 'partial', 'failed');

-- CreateTable: raw_records
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

-- CreateTable: golden_records
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
    "lifecycle_status" "LifecycleStatus" NOT NULL DEFAULT 'ACTIVE',
    "archive_reason" "ArchiveReason",
    "archived_at" TIMESTAMP(3),
    "archived_by" TEXT,
    "source_attribution" JSONB NOT NULL,
    "provenance_v2" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_resolved_at" TIMESTAMP(3),
    "enriched_at" TIMESTAMP(3),
    "county" TEXT,
    "data_completeness" DECIMAL(3,2),
    "source_count" INTEGER NOT NULL DEFAULT 1,
    "menu_url" TEXT,
    "menu_source_url" TEXT,
    "menu_raw_text" TEXT,
    "winelist_url" TEXT,
    "winelist_source_url" TEXT,
    "winelist_raw_text" TEXT,
    "about_copy" TEXT,
    "about_source_url" TEXT,
    "scraped_at" TIMESTAMP(3),
    "scrape_status" TEXT,
    "cuisine_posture" TEXT,
    "service_model" TEXT,
    "price_tier" TEXT,
    "wine_program_intent" TEXT,
    "place_personality" TEXT,
    "identity_signals" JSONB,
    "signals_generated_at" TIMESTAMP(3),
    "signals_version" INTEGER,
    "signals_reviewed" BOOLEAN NOT NULL DEFAULT false,
    "signals_reviewed_by" TEXT,
    "signals_reviewed_at" TIMESTAMP(3),
    "tagline" TEXT,
    "tagline_candidates" TEXT[],
    "tagline_pattern" TEXT,
    "tagline_generated_at" TIMESTAMP(3),
    "tagline_signals" JSONB,
    "tagline_version" INTEGER,
    "google_places_attributes" JSONB,
    "google_places_attributes_fetched_at" TIMESTAMP(3),

    CONSTRAINT "golden_records_pkey" PRIMARY KEY ("canonical_id")
);

-- CreateTable: entity_links
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

-- CreateTable: review_queue
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

-- CreateTable: review_audit_log
CREATE TABLE "review_audit_log" (
    "log_id" TEXT NOT NULL,
    "queue_id" TEXT NOT NULL,
    "resolved_by" TEXT NOT NULL,
    "resolution" TEXT NOT NULL,
    "decision_time_ms" INTEGER,
    "resolved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_audit_log_pkey" PRIMARY KEY ("log_id")
);

-- CreateTable: provenance
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
    "source_tier" INTEGER,
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "source_verified_at" TIMESTAMP(3),
    "source_verified_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provenance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "raw_records_source_name_external_id_key" ON "raw_records"("source_name", "external_id");
CREATE INDEX "raw_records_h3_index_r9_idx" ON "raw_records"("h3_index_r9");
CREATE INDEX "raw_records_placekey_idx" ON "raw_records"("placekey");
CREATE INDEX "raw_records_is_processed_idx" ON "raw_records"("is_processed");
CREATE INDEX "raw_records_name_normalized_idx" ON "raw_records"("name_normalized");

CREATE UNIQUE INDEX "golden_records_placekey_key" ON "golden_records"("placekey");
CREATE UNIQUE INDEX "golden_records_slug_key" ON "golden_records"("slug");
CREATE INDEX "golden_records_neighborhood_idx" ON "golden_records"("neighborhood");
CREATE INDEX "golden_records_category_idx" ON "golden_records"("category");
CREATE INDEX "golden_records_business_status_idx" ON "golden_records"("business_status");
CREATE INDEX "golden_records_slug_idx" ON "golden_records"("slug");

CREATE INDEX "entity_links_raw_id_idx" ON "entity_links"("raw_id");
CREATE INDEX "entity_links_canonical_id_idx" ON "entity_links"("canonical_id");
CREATE INDEX "entity_links_match_method_idx" ON "entity_links"("match_method");

CREATE INDEX "review_queue_status_idx" ON "review_queue"("status");
CREATE INDEX "review_queue_priority_status_idx" ON "review_queue"("priority", "status");
CREATE INDEX "review_queue_canonical_id_idx" ON "review_queue"("canonical_id");

CREATE INDEX "review_audit_log_queue_id_idx" ON "review_audit_log"("queue_id");
CREATE INDEX "review_audit_log_resolved_at_idx" ON "review_audit_log"("resolved_at");

CREATE INDEX "provenance_place_id_idx" ON "provenance"("place_id");
CREATE INDEX "provenance_added_by_idx" ON "provenance"("added_by");
CREATE INDEX "provenance_import_batch_idx" ON "provenance"("import_batch");

-- AddForeignKey
ALTER TABLE "entity_links" ADD CONSTRAINT "entity_links_raw_id_fkey" FOREIGN KEY ("raw_id") REFERENCES "raw_records"("raw_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "entity_links" ADD CONSTRAINT "entity_links_canonical_id_fkey" FOREIGN KEY ("canonical_id") REFERENCES "golden_records"("canonical_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "review_queue" ADD CONSTRAINT "review_queue_canonical_id_fkey" FOREIGN KEY ("canonical_id") REFERENCES "golden_records"("canonical_id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "review_queue" ADD CONSTRAINT "review_queue_raw_id_a_fkey" FOREIGN KEY ("raw_id_a") REFERENCES "raw_records"("raw_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "review_queue" ADD CONSTRAINT "review_queue_raw_id_b_fkey" FOREIGN KEY ("raw_id_b") REFERENCES "raw_records"("raw_id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "review_audit_log" ADD CONSTRAINT "review_audit_log_queue_id_fkey" FOREIGN KEY ("queue_id") REFERENCES "review_queue"("queue_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "provenance" ADD CONSTRAINT "provenance_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "golden_records"("canonical_id") ON DELETE CASCADE ON UPDATE CASCADE;
