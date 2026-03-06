-- Fields v2: Slim entities to routing shell
-- ⚠️  DEFERRED MIGRATION — DO NOT APPLY until:
--   1. canonical_entity_state is fully populated (run scripts/populate-canonical-state.ts)
--   2. /api/places/[slug]/route.ts has been updated to read from canonical_entity_state
--   3. You have verified place pages render correctly from the new data layer
--
-- Apply manually with:
--   psql $DATABASE_URL -f prisma/migrations/20260306200000_slim_entities_fields_v2/migration.sql
--
-- This migration removes ALL data-carrying columns from `entities`, leaving only
-- the routing shell: id, slug, business_status, primary_vertical, created_at, updated_at.

-- ---------------------------------------------------------------------------
-- Step 1: Drop columns that are now in canonical_entity_state
-- ---------------------------------------------------------------------------

ALTER TABLE entities
  DROP COLUMN IF EXISTS name,
  DROP COLUMN IF EXISTS address,
  DROP COLUMN IF EXISTS latitude,
  DROP COLUMN IF EXISTS longitude,
  DROP COLUMN IF EXISTS phone,
  DROP COLUMN IF EXISTS website,
  DROP COLUMN IF EXISTS instagram,
  DROP COLUMN IF EXISTS hours,
  DROP COLUMN IF EXISTS description,
  DROP COLUMN IF EXISTS google_photos,
  DROP COLUMN IF EXISTS google_types,
  DROP COLUMN IF EXISTS price_level,
  DROP COLUMN IF EXISTS neighborhood,
  DROP COLUMN IF EXISTS category,
  DROP COLUMN IF EXISTS places_data_cached_at,
  DROP COLUMN IF EXISTS cuisine_type,
  DROP COLUMN IF EXISTS reservation_url,
  DROP COLUMN IF EXISTS google_places_attributes,
  DROP COLUMN IF EXISTS google_place_id;

-- ---------------------------------------------------------------------------
-- Step 2: Drop columns that are now in interpretation_cache
-- ---------------------------------------------------------------------------

ALTER TABLE entities
  DROP COLUMN IF EXISTS pull_quote,
  DROP COLUMN IF EXISTS pull_quote_author,
  DROP COLUMN IF EXISTS pull_quote_source,
  DROP COLUMN IF EXISTS pull_quote_type,
  DROP COLUMN IF EXISTS pull_quote_url,
  DROP COLUMN IF EXISTS tagline,
  DROP COLUMN IF EXISTS tagline_candidates,
  DROP COLUMN IF EXISTS tagline_generated,
  DROP COLUMN IF EXISTS tagline_pattern,
  DROP COLUMN IF EXISTS tagline_signals,
  DROP COLUMN IF EXISTS tips;

-- ---------------------------------------------------------------------------
-- Step 3: Drop columns that are purely legacy/deprecated
-- ---------------------------------------------------------------------------

ALTER TABLE entities
  DROP COLUMN IF EXISTS editorial_sources,
  DROP COLUMN IF EXISTS ad_unit_override,
  DROP COLUMN IF EXISTS ad_unit_type,
  DROP COLUMN IF EXISTS transit_accessible,
  DROP COLUMN IF EXISTS thematic_tags,
  DROP COLUMN IF EXISTS contextual_connection,
  DROP COLUMN IF EXISTS curator_attribution,
  DROP COLUMN IF EXISTS chef_recs,
  DROP COLUMN IF EXISTS restaurant_group_id,
  DROP COLUMN IF EXISTS intent_profile,
  DROP COLUMN IF EXISTS intent_profile_override,
  DROP COLUMN IF EXISTS prl_override,
  DROP COLUMN IF EXISTS market_schedule,
  DROP COLUMN IF EXISTS confidence,
  DROP COLUMN IF EXISTS overall_confidence,
  DROP COLUMN IF EXISTS confidence_updated_at,
  DROP COLUMN IF EXISTS description_source,
  DROP COLUMN IF EXISTS description_confidence,
  DROP COLUMN IF EXISTS description_reviewed,
  DROP COLUMN IF EXISTS last_enriched_at,
  DROP COLUMN IF EXISTS enrichment_stage,
  DROP COLUMN IF EXISTS needs_human_review,
  DROP COLUMN IF EXISTS category_enrich_attempted_at,
  DROP COLUMN IF EXISTS parent_id;

-- ---------------------------------------------------------------------------
-- Step 4: Drop column `category_id` (FK to categories — use canonical_entity_state.category)
-- ---------------------------------------------------------------------------

ALTER TABLE entities
  DROP COLUMN IF EXISTS category_id;

-- ---------------------------------------------------------------------------
-- What remains on entities after this migration:
--   id              TEXT PRIMARY KEY
--   slug            TEXT UNIQUE (routing key — never removed)
--   business_status TEXT
--   primary_vertical PrimaryVertical
--   entity_type     PlaceType
--   status          PlaceStatus
--   created_at      TIMESTAMP
--   updated_at      TIMESTAMP
--
-- All FK targets (map_places, viewer_bookmarks, energy_scores, etc.) remain intact.
-- ---------------------------------------------------------------------------
