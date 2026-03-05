-- Drop views that depend on vibe_tags, then drop the column, then recreate views without it.
-- Runtime replacement: golden_records.identity_signals.vibe_words

-- 1. Drop dependent views
DROP VIEW IF EXISTS v_entity_launch_readiness_v0;
DROP VIEW IF EXISTS v_places_la_bbox;

-- 2. Drop the column
ALTER TABLE public.entities DROP COLUMN IF EXISTS "vibe_tags";

-- 3. Recreate v_places_la_bbox without vibe_tags
CREATE VIEW v_places_la_bbox AS
SELECT id,
    slug,
    google_place_id,
    name,
    address,
    latitude,
    longitude,
    phone,
    website,
    instagram,
    hours,
    description,
    google_photos,
    google_types,
    price_level,
    neighborhood,
    category,
    places_data_cached_at,
    created_at,
    updated_at,
    editorial_sources,
    cuisine_type,
    ad_unit_override,
    ad_unit_type,
    pull_quote,
    pull_quote_author,
    pull_quote_source,
    pull_quote_type,
    pull_quote_url,
    tagline,
    tagline_candidates,
    tagline_generated,
    tagline_pattern,
    tagline_signals,
    tips,
    chef_recs,
    restaurant_group_id,
    status,
    intent_profile,
    intent_profile_override,
    reservation_url,
    entity_type,
    category_id,
    parent_id,
    market_schedule,
    google_places_attributes,
    primary_vertical,
    contextual_connection,
    curator_attribution,
    thematic_tags,
    transit_accessible,
    prl_override,
    business_status,
    confidence,
    overall_confidence,
    confidence_updated_at,
    last_enriched_at,
    needs_human_review,
    category_enrich_attempted_at,
    last_enrichment_attempt_at,
    last_enrichment_error,
    enrichment_retry_count,
    enrichment_stage
FROM entities
WHERE (latitude IS NOT NULL)
  AND (longitude IS NOT NULL)
  AND (latitude >= 33.70 AND latitude <= 34.85)
  AND (longitude >= -118.95 AND longitude <= -117.60);

-- 4. Recreate v_entity_launch_readiness_v0 without vibe_tags
--    Editorial signal (10 pts) now: pull_quote OR tagline (vibe_tags removed)
CREATE VIEW v_entity_launch_readiness_v0 AS
WITH la AS (
    SELECT entities.id,
        entities.name,
        entities.category,
        entities.primary_vertical,
        entities.address,
        entities.latitude,
        entities.longitude,
        entities.website,
        entities.instagram,
        entities.phone,
        entities.reservation_url,
        entities.pull_quote,
        entities.tagline,
        entities.google_photos,
        entities.hours,
        entities.google_place_id,
        entities.places_data_cached_at
    FROM entities
    WHERE (entities.latitude IS NOT NULL)
      AND (entities.longitude IS NOT NULL)
      AND (entities.latitude >= 33.70 AND entities.latitude <= 34.85)
      AND (entities.longitude >= -118.95 AND entities.longitude <= -117.60)
      AND (entities.entity_type = 'venue'::"EntityType")
      AND (entities.primary_vertical = ANY (ARRAY[
          'EAT'::"PrimaryVertical", 'COFFEE'::"PrimaryVertical", 'WINE'::"PrimaryVertical",
          'DRINKS'::"PrimaryVertical", 'SHOP'::"PrimaryVertical", 'CULTURE'::"PrimaryVertical",
          'NATURE'::"PrimaryVertical", 'STAY'::"PrimaryVertical", 'WELLNESS'::"PrimaryVertical",
          'BAKERY'::"PrimaryVertical", 'PURVEYORS'::"PrimaryVertical", 'ACTIVITY'::"PrimaryVertical"
      ]))
      AND NOT ((COALESCE(entities.category, '') ILIKE '%doctor%') OR (entities.name ILIKE '%MD%'))
      AND NOT (
          (entities.name ~ '^\d{3,5}\s+\S')
          AND (entities.name ~ '(Blvd|St\.?|Ave\.?|Street|Avenue|Road|Rd\.?)(\s|,|$)')
      )
),
active_appearances AS (
    SELECT entity_appearances.subject_entity_id AS entity_id,
        bool_or((entity_appearances.schedule_text IS NOT NULL) AND (btrim(entity_appearances.schedule_text) <> '')) AS has_schedule_text,
        bool_or((entity_appearances.address_text IS NOT NULL) AND (btrim(entity_appearances.address_text) <> '')) AS has_address_text,
        bool_or((entity_appearances.latitude IS NOT NULL) AND (entity_appearances.longitude IS NOT NULL)) AS has_lat_lng
    FROM entity_appearances
    WHERE entity_appearances.status = 'ACTIVE'::"EntityAppearanceStatus"
    GROUP BY entity_appearances.subject_entity_id
),
photo_eval_accepted AS (
    SELECT entity_photo_eval.entity_id,
        count(*) AS accepted_count
    FROM entity_photo_eval
    WHERE entity_photo_eval.tier = ANY (ARRAY['HERO'::"PlacePhotoEvalTier", 'GALLERY'::"PlacePhotoEvalTier"])
    GROUP BY entity_photo_eval.entity_id
)
SELECT
    e.id AS entity_id,
    e.name,
    COALESCE(e.category, (e.primary_vertical)::text) AS category,
    (
        CASE WHEN (e.name IS NOT NULL AND btrim(e.name) <> '') THEN 10 ELSE 0 END
        + CASE WHEN ((e.category IS NOT NULL AND btrim(e.category) <> '') OR e.primary_vertical IS NOT NULL) THEN 10 ELSE 0 END
        + CASE WHEN ((e.latitude IS NOT NULL AND e.longitude IS NOT NULL) OR (e.address IS NOT NULL AND btrim(e.address) <> '') OR aa.entity_id IS NOT NULL) THEN 10 ELSE 0 END
        + CASE WHEN ((e.website IS NOT NULL AND btrim(e.website) <> '') OR (e.instagram IS NOT NULL AND btrim(e.instagram) <> '')) THEN 10 ELSE 0 END
        + CASE WHEN ((e.phone IS NOT NULL AND btrim(e.phone) <> '') OR (e.reservation_url IS NOT NULL AND btrim(e.reservation_url) <> '')) THEN 5 ELSE 0 END
        + CASE WHEN ((e.pull_quote IS NOT NULL AND btrim(e.pull_quote) <> '') OR (e.tagline IS NOT NULL AND btrim(e.tagline) <> '')) THEN 10 ELSE 0 END
        + CASE WHEN ((e.google_photos IS NOT NULL AND jsonb_array_length(e.google_photos) > 0) OR pea.accepted_count > 0) THEN 10 ELSE 0 END
        + CASE WHEN ((e.hours IS NOT NULL AND jsonb_typeof(e.hours) <> 'null') OR aa.has_schedule_text = true) THEN 10 ELSE 0 END
        + CASE WHEN (e.google_place_id IS NOT NULL AND btrim(e.google_place_id) <> '') THEN 10 ELSE 0 END
        + CASE WHEN (e.places_data_cached_at IS NOT NULL AND e.places_data_cached_at >= (now() - '14 days'::interval)) THEN 15 ELSE 0 END
    ) AS score,
    (
        CASE WHEN (e.name IS NOT NULL AND btrim(e.name) <> '') THEN 10 ELSE 0 END
        + CASE WHEN ((e.category IS NOT NULL AND btrim(e.category) <> '') OR e.primary_vertical IS NOT NULL) THEN 10 ELSE 0 END
        + CASE WHEN ((e.latitude IS NOT NULL AND e.longitude IS NOT NULL) OR (e.address IS NOT NULL AND btrim(e.address) <> '') OR aa.entity_id IS NOT NULL) THEN 10 ELSE 0 END
        + CASE WHEN ((e.website IS NOT NULL AND btrim(e.website) <> '') OR (e.instagram IS NOT NULL AND btrim(e.instagram) <> '')) THEN 10 ELSE 0 END
        + CASE WHEN ((e.phone IS NOT NULL AND btrim(e.phone) <> '') OR (e.reservation_url IS NOT NULL AND btrim(e.reservation_url) <> '')) THEN 5 ELSE 0 END
        + CASE WHEN ((e.pull_quote IS NOT NULL AND btrim(e.pull_quote) <> '') OR (e.tagline IS NOT NULL AND btrim(e.tagline) <> '')) THEN 10 ELSE 0 END
        + CASE WHEN ((e.google_photos IS NOT NULL AND jsonb_array_length(e.google_photos) > 0) OR pea.accepted_count > 0) THEN 10 ELSE 0 END
        + CASE WHEN ((e.hours IS NOT NULL AND jsonb_typeof(e.hours) <> 'null') OR aa.has_schedule_text = true) THEN 10 ELSE 0 END
        + CASE WHEN (e.google_place_id IS NOT NULL AND btrim(e.google_place_id) <> '') THEN 10 ELSE 0 END
        + CASE WHEN (e.places_data_cached_at IS NOT NULL AND e.places_data_cached_at >= (now() - '14 days'::interval)) THEN 15 ELSE 0 END
    ) >= 85 AS is_launch_ready,
    COALESCE((
        SELECT array_agg(m.key ORDER BY m.ord)
        FROM (
            SELECT 'name'::text AS key, 1 AS ord WHERE (e.name IS NULL OR btrim(e.name) = '')
            UNION ALL SELECT 'category', 2 WHERE ((e.category IS NULL OR btrim(e.category) = '') AND e.primary_vertical IS NULL)
            UNION ALL SELECT 'location', 3 WHERE ((e.latitude IS NULL OR e.longitude IS NULL) AND (e.address IS NULL OR btrim(e.address) = '') AND aa.entity_id IS NULL)
            UNION ALL SELECT 'website_or_instagram', 4 WHERE ((e.website IS NULL OR btrim(e.website) = '') AND (e.instagram IS NULL OR btrim(e.instagram) = ''))
            UNION ALL SELECT 'phone_or_reservation', 5 WHERE ((e.phone IS NULL OR btrim(e.phone) = '') AND (e.reservation_url IS NULL OR btrim(e.reservation_url) = ''))
            UNION ALL SELECT 'editorial', 6 WHERE ((e.pull_quote IS NULL OR btrim(e.pull_quote) = '') AND (e.tagline IS NULL OR btrim(e.tagline) = ''))
            UNION ALL SELECT 'photos', 7 WHERE ((e.google_photos IS NULL OR jsonb_array_length(e.google_photos) = 0) AND (pea.accepted_count IS NULL OR pea.accepted_count = 0))
            UNION ALL SELECT 'hours', 8 WHERE ((e.hours IS NULL OR jsonb_typeof(e.hours) = 'null') AND (aa.has_schedule_text IS NULL OR aa.has_schedule_text = false))
            UNION ALL SELECT 'googlePlaceId', 9 WHERE (e.google_place_id IS NULL OR btrim(e.google_place_id) = '')
            UNION ALL SELECT 'freshness', 10 WHERE (e.places_data_cached_at IS NULL OR e.places_data_cached_at < (now() - '14 days'::interval))
        ) m
    ), ARRAY[]::text[]) AS missing,
    now() AS computed_at
FROM la e
LEFT JOIN active_appearances aa ON aa.entity_id = e.id
LEFT JOIN photo_eval_accepted pea ON pea.entity_id = e.id;
