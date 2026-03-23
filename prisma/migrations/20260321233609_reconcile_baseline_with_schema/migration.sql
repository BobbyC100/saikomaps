/*
  Warnings:

  - You are about to drop the column `google_places_attributes_fetched_at` on the `entities` table. All the data in the column will be lost.
  - The primary key for the `entity_issues` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `merchant_enrichment_runs` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `confidence` on the `merchant_enrichment_runs` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Decimal(4,2)`.
  - You are about to alter the column `cost_usd` on the `merchant_enrichment_runs` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Decimal(10,6)`.
  - You are about to alter the column `extraction_confidence` on the `merchant_signals` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Decimal(4,2)`.
  - The primary key for the `place_appearances` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the `entity_links` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `golden_records` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `menu_signals` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `provenance` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `winelist_signals` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[slug]` on the table `Actor` will be added. If there are existing duplicate values, this will fail.
  - Made the column `needs_human_review` on table `entities` required. This step will fail if there are existing NULL values in that column.

*/

-- Drop unmanaged views that block column type changes
DROP VIEW IF EXISTS public.reservation_audit_missing_provider;
DROP VIEW IF EXISTS public.reservation_audit_unvalidated;
DROP VIEW IF EXISTS public.reservation_coverage_summary;
DROP VIEW IF EXISTS public.reservation_provider_audit_queue;
DROP VIEW IF EXISTS public.resolved_reservations;
DROP VIEW IF EXISTS public.entity_enrichment_tiers;
DROP VIEW IF EXISTS public.v_places_la_bbox_golden;
DROP VIEW IF EXISTS public.v_places_la_bbox;

-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('fixed', 'mobile', 'contained', 'civic');

-- CreateEnum
CREATE TYPE "ScheduleType" AS ENUM ('regular', 'market', 'route', 'open_access', 'date_bounded');

-- CreateEnum
CREATE TYPE "IdentityAnchorType" AS ENUM ('gpid', 'social', 'operator', 'parent', 'coordinates');

-- CreateEnum
CREATE TYPE "ContainmentType" AS ENUM ('independent', 'contained', 'host');

-- AlterEnum
ALTER TYPE "InterpretationType" ADD VALUE 'TIMEFOLD';

-- DropForeignKey
ALTER TABLE "public"."park_facility_relationships" DROP CONSTRAINT "park_facility_relationships_child_fk";

-- DropForeignKey
ALTER TABLE "public"."park_facility_relationships" DROP CONSTRAINT "park_facility_relationships_parent_fk";

-- DropForeignKey
ALTER TABLE "public"."reservation_provider_matches" DROP CONSTRAINT "reservation_provider_matches_entity_id_fkey";

-- DropIndex
DROP INDEX "public"."entities_enrichment_status_idx";

-- DropIndex
DROP INDEX "public"."entities_operating_status_idx";

-- DropIndex
DROP INDEX "public"."entities_publication_status_idx";

-- DropIndex
DROP INDEX "public"."idx_park_facility_rel_type";

-- AlterTable
ALTER TABLE "entities" RENAME CONSTRAINT "places_pkey" TO "entities_pkey";
ALTER TABLE "entities"
DROP COLUMN "google_places_attributes_fetched_at",
ADD COLUMN     "containment_type" "ContainmentType",
ADD COLUMN     "identity_anchor_type" "IdentityAnchorType",
ADD COLUMN     "location_type" "LocationType",
ADD COLUMN     "schedule_type" "ScheduleType",
ALTER COLUMN "confidence" DROP DEFAULT,
ALTER COLUMN "last_enriched_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "needs_human_review" SET NOT NULL,
ALTER COLUMN "category_enrich_attempted_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "entity_issues" DROP CONSTRAINT "entity_issues_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "resolved_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "entity_issues_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "identity_enrichment_runs" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "result_json" DROP DEFAULT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "instagram_accounts" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "last_fetched_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "last_successful_fetch_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "instagram_insight_snapshots" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "observed_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "instagram_media" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "timestamp" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "fetched_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "interpretation_cache" ALTER COLUMN "cache_id" DROP DEFAULT,
ALTER COLUMN "input_signal_ids" DROP DEFAULT;

-- AlterTable
ALTER TABLE "locations" ADD COLUMN     "tiktok" TEXT;

-- AlterTable
ALTER TABLE "merchant_enrichment_runs" DROP CONSTRAINT "merchant_enrichment_runs_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "fetched_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "confidence" SET DATA TYPE DECIMAL(4,2),
ALTER COLUMN "cost_usd" SET DATA TYPE DECIMAL(10,6),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "merchant_enrichment_runs_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "merchant_signals" ALTER COLUMN "extraction_confidence" SET DATA TYPE DECIMAL(4,2),
ALTER COLUMN "last_updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "merchant_surface_artifacts" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "merchant_surfaces" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "fetched_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "discovered_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "observed_claims" ALTER COLUMN "claim_id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "park_facility_relationships" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "place_appearances" DROP CONSTRAINT "place_appearances_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "place_appearances_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "reservation_provider_matches" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "validation_source" DROP DEFAULT,
ALTER COLUMN "last_checked_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "last_verified_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "sanction_conflicts" ALTER COLUMN "conflict_id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "sources" ALTER COLUMN "trust_tier" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "coverage_sources" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "curator_note" VARCHAR(140),
ADD COLUMN     "scope_pills" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- DropTable
DROP TABLE "public"."entity_links";

-- DropTable
DROP TABLE "public"."golden_records";

-- DropTable
DROP TABLE "public"."menu_signals";

-- DropTable
DROP TABLE "public"."provenance";

-- DropTable
DROP TABLE "public"."winelist_signals";

-- DropEnum
DROP TYPE "public"."ArchiveReason";

-- DropEnum
DROP TYPE "public"."LifecycleStatus";

-- DropEnum
DROP TYPE "public"."PromotionStatus";

-- DropEnum
DROP TYPE "public"."VerificationStatus";

-- DropEnum
DROP TYPE "public"."signal_status";

-- CreateTable
CREATE TABLE "saved_maps" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "list_id" TEXT NOT NULL,
    "saved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_maps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "saved_maps_user_id_idx" ON "saved_maps"("user_id");

-- CreateIndex
CREATE INDEX "saved_maps_list_id_idx" ON "saved_maps"("list_id");

-- CreateIndex
CREATE UNIQUE INDEX "saved_maps_user_id_list_id_key" ON "saved_maps"("user_id", "list_id");

-- CreateIndex (drop first — baseline has partial variant)
DROP INDEX IF EXISTS "Actor_slug_key";
CREATE UNIQUE INDEX "Actor_slug_key" ON "Actor"("slug");

-- CreateIndex
CREATE INDEX "entities_last_enriched_at_idx" ON "entities"("last_enriched_at");

-- CreateIndex
CREATE INDEX "entities_needs_human_review_idx" ON "entities"("needs_human_review");

-- RenameForeignKey
ALTER TABLE "entities" RENAME CONSTRAINT "places_category_id_fkey" TO "entities_category_id_fkey";

-- RenameForeignKey
ALTER TABLE "entities" RENAME CONSTRAINT "places_parent_id_fkey" TO "entities_parent_id_fkey";

-- RenameForeignKey
ALTER TABLE "entities" RENAME CONSTRAINT "places_restaurant_group_id_fkey" TO "entities_restaurant_group_id_fkey";

-- RenameForeignKey
ALTER TABLE "gpid_resolution_queue" RENAME CONSTRAINT "gpid_resolution_queue_place_id_fkey" TO "gpid_resolution_queue_entity_id_fkey";

-- RenameForeignKey
ALTER TABLE "map_places" RENAME CONSTRAINT "map_places_place_id_fkey" TO "map_places_entity_id_fkey";

-- RenameForeignKey
ALTER TABLE "merchant_surface_artifacts" RENAME CONSTRAINT "merchant_surface_artifacts_surface_id_fkey" TO "merchant_surface_artifacts_merchant_surface_id_fkey";

-- RenameForeignKey
ALTER TABLE "operator_place_candidates" RENAME CONSTRAINT "operator_place_candidates_place_id_fkey" TO "operator_place_candidates_entity_id_fkey";

-- RenameForeignKey
ALTER TABLE "person_places" RENAME CONSTRAINT "person_places_place_id_fkey" TO "person_places_entity_id_fkey";

-- RenameForeignKey
ALTER TABLE "place_actor_relationships" RENAME CONSTRAINT "place_actor_relationships_place_id_fkey" TO "place_actor_relationships_entity_id_fkey";

-- RenameForeignKey
ALTER TABLE "place_appearances" RENAME CONSTRAINT "place_appearances_host_place_id_fkey" TO "place_appearances_host_entity_id_fkey";

-- RenameForeignKey
ALTER TABLE "place_appearances" RENAME CONSTRAINT "place_appearances_subject_place_id_fkey" TO "place_appearances_subject_entity_id_fkey";

-- RenameForeignKey
ALTER TABLE "place_coverage_status" RENAME CONSTRAINT "place_coverage_status_place_id_fkey" TO "place_coverage_status_entity_id_fkey";

-- RenameForeignKey
ALTER TABLE "place_photo_eval" RENAME CONSTRAINT "place_photo_eval_place_id_fkey" TO "place_photo_eval_entity_id_fkey";

-- RenameForeignKey
ALTER TABLE "viewer_bookmarks" RENAME CONSTRAINT "viewer_bookmarks_place_id_fkey" TO "viewer_bookmarks_entity_id_fkey";

-- ============================================================================
-- Clean orphaned rows before adding FK constraints
-- Order: parent tables first, then child tables that reference them
-- ============================================================================

-- Layer 1: tables that only reference entities (the root)
DELETE FROM "merchant_enrichment_runs" WHERE "entity_id" NOT IN (SELECT "id" FROM "entities");
DELETE FROM "merchant_signals" WHERE "entity_id" NOT IN (SELECT "id" FROM "entities");
DELETE FROM "EntityActorRelationship" WHERE "entity_id" NOT IN (SELECT "id" FROM "entities");
DELETE FROM "park_facility_relationships" WHERE "parent_entity_id" NOT IN (SELECT "id" FROM "entities");
DELETE FROM "park_facility_relationships" WHERE "child_entity_id" NOT IN (SELECT "id" FROM "entities");
DELETE FROM "derived_signals" WHERE "entity_id" NOT IN (SELECT "id" FROM "entities");
DELETE FROM "interpretation_cache" WHERE "entity_id" NOT IN (SELECT "id" FROM "entities");
DELETE FROM "entity_issues" WHERE "entity_id" NOT IN (SELECT "id" FROM "entities");
DELETE FROM "reservation_provider_matches" WHERE "entity_id" NOT IN (SELECT "id" FROM "entities");
DELETE FROM "canonical_entity_state" WHERE "entity_id" NOT IN (SELECT "id" FROM "entities");

-- Layer 2: observed_claims (references entities, source_registry, attribute_registry, self)
DELETE FROM "observed_claims" WHERE "entity_id" NOT IN (SELECT "id" FROM "entities");
DELETE FROM "observed_claims" WHERE "source_id" NOT IN (SELECT "id" FROM "source_registry");
DELETE FROM "observed_claims" WHERE "attribute_key" NOT IN (SELECT "attribute_key" FROM "attribute_registry");
DELETE FROM "observed_claims" WHERE "supersedes_claim_id" IS NOT NULL AND "supersedes_claim_id" NOT IN (SELECT "claim_id" FROM "observed_claims");

-- Layer 3: canonical_sanctions (references observed_claims AND canonical_entity_state — must come AFTER both are clean)
DELETE FROM "canonical_sanctions" WHERE "entity_id" NOT IN (SELECT "entity_id" FROM "canonical_entity_state");
DELETE FROM "canonical_sanctions" WHERE "claim_id" NOT IN (SELECT "claim_id" FROM "observed_claims");

-- Layer 4: energy/tag scoring chain
DELETE FROM "tag_versions" WHERE "depends_on_energy_version" NOT IN (SELECT "version" FROM "energy_versions");
DELETE FROM "energy_scores" WHERE "entity_id" NOT IN (SELECT "id" FROM "entities");
DELETE FROM "energy_scores" WHERE "version" NOT IN (SELECT "version" FROM "energy_versions");
DELETE FROM "place_tag_scores" WHERE "entity_id" NOT IN (SELECT "id" FROM "entities");
DELETE FROM "place_tag_scores" WHERE "version" NOT IN (SELECT "version" FROM "tag_versions");

-- Layer 5: identity enrichment
DELETE FROM "identity_enrichment_runs" WHERE "review_queue_id" IS NOT NULL AND "review_queue_id" NOT IN (SELECT "queue_id" FROM "review_queue");
DELETE FROM "identity_enrichment_runs" WHERE "raw_id" NOT IN (SELECT "raw_id" FROM "raw_records");

-- AddForeignKey
ALTER TABLE "merchant_enrichment_runs" ADD CONSTRAINT "merchant_enrichment_runs_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_signals" ADD CONSTRAINT "merchant_signals_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_maps" ADD CONSTRAINT "saved_maps_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_maps" ADD CONSTRAINT "saved_maps_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity_enrichment_runs" ADD CONSTRAINT "identity_enrichment_runs_review_queue_id_fkey" FOREIGN KEY ("review_queue_id") REFERENCES "review_queue"("queue_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity_enrichment_runs" ADD CONSTRAINT "identity_enrichment_runs_raw_id_fkey" FOREIGN KEY ("raw_id") REFERENCES "raw_records"("raw_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tag_versions" ADD CONSTRAINT "tag_versions_depends_on_energy_version_fkey" FOREIGN KEY ("depends_on_energy_version") REFERENCES "energy_versions"("version") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "energy_scores" ADD CONSTRAINT "energy_scores_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "energy_scores" ADD CONSTRAINT "energy_scores_version_fkey" FOREIGN KEY ("version") REFERENCES "energy_versions"("version") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_tag_scores" ADD CONSTRAINT "place_tag_scores_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_tag_scores" ADD CONSTRAINT "place_tag_scores_version_fkey" FOREIGN KEY ("version") REFERENCES "tag_versions"("version") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityActorRelationship" ADD CONSTRAINT "EntityActorRelationship_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "park_facility_relationships" ADD CONSTRAINT "park_facility_relationships_parent_entity_id_fkey" FOREIGN KEY ("parent_entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "park_facility_relationships" ADD CONSTRAINT "park_facility_relationships_child_entity_id_fkey" FOREIGN KEY ("child_entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observed_claims" ADD CONSTRAINT "observed_claims_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observed_claims" ADD CONSTRAINT "observed_claims_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "source_registry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observed_claims" ADD CONSTRAINT "observed_claims_attribute_key_fkey" FOREIGN KEY ("attribute_key") REFERENCES "attribute_registry"("attribute_key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observed_claims" ADD CONSTRAINT "observed_claims_supersedes_claim_id_fkey" FOREIGN KEY ("supersedes_claim_id") REFERENCES "observed_claims"("claim_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canonical_entity_state" ADD CONSTRAINT "canonical_entity_state_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canonical_sanctions" ADD CONSTRAINT "canonical_sanctions_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "observed_claims"("claim_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canonical_sanctions" ADD CONSTRAINT "canonical_sanctions_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "canonical_entity_state"("entity_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "derived_signals" ADD CONSTRAINT "derived_signals_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interpretation_cache" ADD CONSTRAINT "interpretation_cache_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_issues" ADD CONSTRAINT "entity_issues_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation_provider_matches" ADD CONSTRAINT "reservation_provider_matches_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "energy_scores_place_id_idx" RENAME TO "energy_scores_entity_id_idx";

-- RenameIndex
ALTER INDEX "energy_scores_place_id_version_key" RENAME TO "energy_scores_entity_id_version_key";

-- RenameIndex
ALTER INDEX "places_business_status_idx" RENAME TO "entities_business_status_idx";

-- RenameIndex
ALTER INDEX "places_category_id_idx" RENAME TO "entities_category_id_idx";

-- RenameIndex
ALTER INDEX "places_category_idx" RENAME TO "entities_category_idx";

-- RenameIndex
ALTER INDEX "places_google_place_id_idx" RENAME TO "entities_google_place_id_idx";

-- RenameIndex
ALTER INDEX "places_google_place_id_key" RENAME TO "entities_google_place_id_key";

-- RenameIndex
ALTER INDEX "places_neighborhood_idx" RENAME TO "entities_neighborhood_idx";

-- RenameIndex
ALTER INDEX "places_parent_id_idx" RENAME TO "entities_parent_id_idx";

-- RenameIndex
ALTER INDEX "places_primary_vertical_idx" RENAME TO "entities_primary_vertical_idx";

-- RenameIndex
ALTER INDEX "places_restaurant_group_id_idx" RENAME TO "entities_restaurant_group_id_idx";

-- RenameIndex
ALTER INDEX "places_slug_key" RENAME TO "entities_slug_key";

-- RenameIndex
ALTER INDEX "places_status_idx" RENAME TO "entities_status_idx";

-- RenameIndex
ALTER INDEX "idx_entity_issues_problem_status" RENAME TO "entity_issues_problem_class_status_idx";

-- RenameIndex
ALTER INDEX "idx_entity_issues_severity_status" RENAME TO "entity_issues_severity_status_idx";

-- RenameIndex
ALTER INDEX "idx_entity_issues_status" RENAME TO "entity_issues_status_idx";

-- RenameIndex
ALTER INDEX "idx_entity_issues_type_status" RENAME TO "entity_issues_issue_type_status_idx";

-- RenameIndex
ALTER INDEX "gpid_resolution_queue_place_id_idx" RENAME TO "gpid_resolution_queue_entity_id_idx";

-- RenameIndex
ALTER INDEX "instagram_insight_snapshots_subject_idx" RENAME TO "instagram_insight_snapshots_subject_type_subject_id_idx";

-- RenameIndex
ALTER INDEX "instagram_insight_snapshots_timeseries_idx" RENAME TO "instagram_insight_snapshots_subject_id_metric_name_observed_idx";

-- RenameIndex
ALTER INDEX "instagram_media_user_id_timestamp_idx" RENAME TO "instagram_media_instagram_user_id_timestamp_idx";

-- RenameIndex
ALTER INDEX "map_places_map_id_place_id_key" RENAME TO "map_places_map_id_entity_id_key";

-- RenameIndex
ALTER INDEX "map_places_place_id_idx" RENAME TO "map_places_entity_id_idx";

-- RenameIndex
ALTER INDEX "merchant_enrichment_runs_place_id_idx" RENAME TO "merchant_enrichment_runs_entity_id_idx";

-- RenameIndex
ALTER INDEX "merchant_surface_artifacts_dedupe_idx" RENAME TO "merchant_surface_artifacts_merchant_surface_id_artifact_typ_key";

-- RenameIndex
ALTER INDEX "merchant_surface_artifacts_surface_id_idx" RENAME TO "merchant_surface_artifacts_merchant_surface_id_idx";

-- RenameIndex
ALTER INDEX "merchant_surface_artifacts_type_version_idx" RENAME TO "merchant_surface_artifacts_artifact_type_artifact_version_idx";

-- RenameIndex
ALTER INDEX "merchant_surfaces_fetch_parse_status_idx" RENAME TO "merchant_surfaces_fetch_status_parse_status_idx";

-- RenameIndex
ALTER INDEX "merchant_surfaces_surface_type_extraction_idx" RENAME TO "merchant_surfaces_surface_type_extraction_status_idx";

-- RenameIndex
ALTER INDEX "operator_place_candidates_place_id_idx" RENAME TO "operator_place_candidates_entity_id_idx";

-- RenameIndex
ALTER INDEX "idx_park_facility_rel_child" RENAME TO "park_facility_relationships_child_entity_id_idx";

-- RenameIndex
ALTER INDEX "idx_park_facility_rel_parent" RENAME TO "park_facility_relationships_parent_entity_id_idx";

-- RenameIndex
ALTER INDEX "park_facility_relationships_unique" RENAME TO "park_facility_relationships_parent_entity_id_child_entity_i_key";

-- RenameIndex
ALTER INDEX "person_places_person_id_place_id_role_key" RENAME TO "person_places_person_id_entity_id_role_key";

-- RenameIndex
ALTER INDEX "person_places_place_id_idx" RENAME TO "person_places_entity_id_idx";

-- RenameIndex
ALTER INDEX "place_actor_relationships_place_id_actor_id_role_key" RENAME TO "place_actor_relationships_entity_id_actor_id_role_key";

-- RenameIndex
ALTER INDEX "place_actor_relationships_place_id_idx" RENAME TO "place_actor_relationships_entity_id_idx";

-- RenameIndex
ALTER INDEX "place_appearances_host_place_id_status_idx" RENAME TO "place_appearances_host_entity_id_status_idx";

-- RenameIndex
ALTER INDEX "place_appearances_subject_place_id_status_idx" RENAME TO "place_appearances_subject_entity_id_status_idx";

-- RenameIndex
ALTER INDEX "place_coverage_status_place_id_idx" RENAME TO "place_coverage_status_entity_id_idx";

-- RenameIndex
ALTER INDEX "place_photo_eval_place_id_idx" RENAME TO "place_photo_eval_entity_id_idx";

-- RenameIndex
ALTER INDEX "place_photo_eval_place_id_photo_ref_key" RENAME TO "place_photo_eval_entity_id_photo_ref_key";

-- RenameIndex
ALTER INDEX "place_tag_scores_place_id_idx" RENAME TO "place_tag_scores_entity_id_idx";

-- RenameIndex
ALTER INDEX "place_tag_scores_place_id_version_key" RENAME TO "place_tag_scores_entity_id_version_key";

-- RenameIndex
ALTER INDEX "idx_rpm_entity_id" RENAME TO "reservation_provider_matches_entity_id_idx";

-- RenameIndex
ALTER INDEX "idx_rpm_match_status_last_checked" RENAME TO "reservation_provider_matches_match_status_last_checked_at_idx";

-- RenameIndex
ALTER INDEX "idx_rpm_provider_is_renderable" RENAME TO "reservation_provider_matches_provider_is_renderable_idx";

-- RenameIndex
ALTER INDEX "idx_rpm_provider_match_status" RENAME TO "reservation_provider_matches_provider_match_status_idx";

-- RenameIndex
ALTER INDEX "viewer_bookmarks_place_id_idx" RENAME TO "viewer_bookmarks_entity_id_idx";

-- RenameIndex
ALTER INDEX "viewer_bookmarks_viewer_user_id_place_id_key" RENAME TO "viewer_bookmarks_viewer_user_id_entity_id_key";
