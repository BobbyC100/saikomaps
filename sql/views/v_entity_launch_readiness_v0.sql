-- v_entity_launch_readiness_v0
-- Per-entity launch readiness score (0-100) for LA scope.
-- Launch-ready = score >= 85.
-- Cohort: venue entity_type, place-like primary_vertical, exclude doctors/raw addresses.
-- Weights: name(10), category(10), location(10), website|instagram(10), phone|reservation(5),
--   editorial(10), photos(10), hours(10), googlePlaceId(10), freshness(15) = 100.

CREATE OR REPLACE VIEW public.v_entity_launch_readiness_v0 AS
WITH la AS (
  SELECT id, name, category, primary_vertical, address, latitude, longitude,
         website, instagram, phone, reservation_url,
         pull_quote, tagline, vibe_tags,
         google_photos, hours, google_place_id, places_data_cached_at
  FROM public.entities
  WHERE latitude IS NOT NULL
    AND longitude IS NOT NULL
    AND latitude BETWEEN 33.70 AND 34.85
    AND longitude BETWEEN -118.95 AND -117.60
    AND entity_type = 'venue'
    AND primary_vertical IN ('EAT', 'COFFEE', 'WINE', 'DRINKS', 'SHOP', 'CULTURE', 'NATURE', 'STAY', 'WELLNESS', 'BAKERY', 'PURVEYORS', 'ACTIVITY')
    AND NOT (COALESCE(category, '') ILIKE '%doctor%' OR name ILIKE '%MD%')
    AND NOT (name ~ '^\d{3,5}\s+\S' AND name ~ '(Blvd|St\.?|Ave\.?|Street|Avenue|Road|Rd\.?)(\s|,|$)')
),
-- Active appearances (subject = entity)
active_appearances AS (
  SELECT subject_entity_id AS entity_id,
         bool_or(schedule_text IS NOT NULL AND btrim(schedule_text) <> '') AS has_schedule_text,
         bool_or(address_text IS NOT NULL AND btrim(address_text) <> '') AS has_address_text,
         bool_or(latitude IS NOT NULL AND longitude IS NOT NULL) AS has_lat_lng
  FROM public.entity_appearances
  WHERE status = 'ACTIVE'
  GROUP BY subject_entity_id
),
-- Photo eval (HERO or GALLERY = accepted)
photo_eval_accepted AS (
  SELECT entity_id, COUNT(*) AS accepted_count
  FROM public.entity_photo_eval
  WHERE tier IN ('HERO', 'GALLERY')
  GROUP BY entity_id
)
SELECT
  e.id AS entity_id,
  e.name,
  COALESCE(e.category, e.primary_vertical::text) AS category,
  (
    -- name (10)
    CASE WHEN e.name IS NOT NULL AND btrim(e.name) <> '' THEN 10 ELSE 0 END
    + -- primary category (10)
    CASE WHEN (e.category IS NOT NULL AND btrim(e.category) <> '') OR e.primary_vertical IS NOT NULL THEN 10 ELSE 0 END
    + -- one location signal (10): lat/lng OR address OR active appearance
    CASE
      WHEN (e.latitude IS NOT NULL AND e.longitude IS NOT NULL)
        OR (e.address IS NOT NULL AND btrim(e.address) <> '')
        OR (aa.entity_id IS NOT NULL)
      THEN 10 ELSE 0
    END
    + -- website OR instagram (10)
    CASE
      WHEN (e.website IS NOT NULL AND btrim(e.website) <> '')
        OR (e.instagram IS NOT NULL AND btrim(e.instagram) <> '')
      THEN 10 ELSE 0
    END
    + -- phone OR reservation link (5)
    CASE
      WHEN (e.phone IS NOT NULL AND btrim(e.phone) <> '')
        OR (e.reservation_url IS NOT NULL AND btrim(e.reservation_url) <> '')
      THEN 5 ELSE 0
    END
    + -- editorial: curator note OR tagline OR vibes/tags (10)
    CASE
      WHEN (e.pull_quote IS NOT NULL AND btrim(e.pull_quote) <> '')
        OR (e.tagline IS NOT NULL AND btrim(e.tagline) <> '')
        OR (e.vibe_tags IS NOT NULL AND array_length(e.vibe_tags, 1) > 0)
      THEN 10 ELSE 0
    END
    + -- photos: >= 1 primary (10)
    CASE
      WHEN (e.google_photos IS NOT NULL AND jsonb_array_length(e.google_photos) > 0)
        OR (pea.accepted_count > 0)
      THEN 10 ELSE 0
    END
    + -- hours (10): schedule_text in active appearance OR structured hours
    CASE
      WHEN (e.hours IS NOT NULL AND jsonb_typeof(e.hours) <> 'null')
        OR (aa.has_schedule_text = true)
      THEN 10 ELSE 0
    END
    + -- googlePlaceId (10)
    CASE WHEN e.google_place_id IS NOT NULL AND btrim(e.google_place_id) <> '' THEN 10 ELSE 0 END
    + -- freshness (15): cached within 14 days (no explicit manual flag in v0)
    CASE
      WHEN e.places_data_cached_at IS NOT NULL
        AND e.places_data_cached_at >= (now() - interval '14 days')
      THEN 15 ELSE 0
    END
  )::int AS score,
  (
    (CASE WHEN e.name IS NOT NULL AND btrim(e.name) <> '' THEN 10 ELSE 0 END)
    + (CASE WHEN (e.category IS NOT NULL AND btrim(e.category) <> '') OR e.primary_vertical IS NOT NULL THEN 10 ELSE 0 END)
    + (CASE WHEN (e.latitude IS NOT NULL AND e.longitude IS NOT NULL) OR (e.address IS NOT NULL AND btrim(e.address) <> '') OR (aa.entity_id IS NOT NULL) THEN 10 ELSE 0 END)
    + (CASE WHEN (e.website IS NOT NULL AND btrim(e.website) <> '') OR (e.instagram IS NOT NULL AND btrim(e.instagram) <> '') THEN 10 ELSE 0 END)
    + (CASE WHEN (e.phone IS NOT NULL AND btrim(e.phone) <> '') OR (e.reservation_url IS NOT NULL AND btrim(e.reservation_url) <> '') THEN 5 ELSE 0 END)
    + (CASE WHEN (e.pull_quote IS NOT NULL AND btrim(e.pull_quote) <> '') OR (e.tagline IS NOT NULL AND btrim(e.tagline) <> '') OR (e.vibe_tags IS NOT NULL AND array_length(e.vibe_tags, 1) > 0) THEN 10 ELSE 0 END)
    + (CASE WHEN (e.google_photos IS NOT NULL AND jsonb_array_length(e.google_photos) > 0) OR (pea.accepted_count > 0) THEN 10 ELSE 0 END)
    + (CASE WHEN (e.hours IS NOT NULL AND jsonb_typeof(e.hours) <> 'null') OR (aa.has_schedule_text = true) THEN 10 ELSE 0 END)
    + (CASE WHEN e.google_place_id IS NOT NULL AND btrim(e.google_place_id) <> '' THEN 10 ELSE 0 END)
    + (CASE WHEN e.places_data_cached_at IS NOT NULL AND e.places_data_cached_at >= (now() - interval '14 days') THEN 15 ELSE 0 END)
  ) >= 85 AS is_launch_ready,
  COALESCE(
    (
      SELECT array_agg(m.key ORDER BY m.ord)
      FROM (
      SELECT 'name' AS key, 1 AS ord WHERE e.name IS NULL OR btrim(e.name) = ''
      UNION ALL SELECT 'category', 2 WHERE (e.category IS NULL OR btrim(e.category) = '') AND e.primary_vertical IS NULL
      UNION ALL SELECT 'location', 3 WHERE (e.latitude IS NULL OR e.longitude IS NULL) AND (e.address IS NULL OR btrim(e.address) = '') AND aa.entity_id IS NULL
      UNION ALL SELECT 'website_or_instagram', 4 WHERE (e.website IS NULL OR btrim(e.website) = '') AND (e.instagram IS NULL OR btrim(e.instagram) = '')
      UNION ALL SELECT 'phone_or_reservation', 5 WHERE (e.phone IS NULL OR btrim(e.phone) = '') AND (e.reservation_url IS NULL OR btrim(e.reservation_url) = '')
      UNION ALL SELECT 'editorial', 6 WHERE (e.pull_quote IS NULL OR btrim(e.pull_quote) = '') AND (e.tagline IS NULL OR btrim(e.tagline) = '') AND (e.vibe_tags IS NULL OR array_length(e.vibe_tags, 1) IS NULL OR array_length(e.vibe_tags, 1) = 0)
      UNION ALL SELECT 'photos', 7 WHERE (e.google_photos IS NULL OR jsonb_array_length(e.google_photos) = 0) AND (pea.accepted_count IS NULL OR pea.accepted_count = 0)
      UNION ALL SELECT 'hours', 8 WHERE (e.hours IS NULL OR jsonb_typeof(e.hours) = 'null') AND (aa.has_schedule_text IS NULL OR aa.has_schedule_text = false)
      UNION ALL SELECT 'googlePlaceId', 9 WHERE e.google_place_id IS NULL OR btrim(e.google_place_id) = ''
      UNION ALL SELECT 'freshness', 10 WHERE e.places_data_cached_at IS NULL OR e.places_data_cached_at < (now() - interval '14 days')
      ) m
    ),
    ARRAY[]::text[]
  ) AS missing,
  now() AS computed_at
FROM la e
LEFT JOIN active_appearances aa ON aa.entity_id = e.id
LEFT JOIN photo_eval_accepted pea ON pea.entity_id = e.id;
