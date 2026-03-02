-- Tier 1 Google Hydration KPI
-- Tier 1 = entities where google_place_id IS NOT NULL AND btrim(google_place_id) <> ''
-- Run before/after coverage:apply to measure improvement.

SELECT
  COUNT(*) AS tier1_total,
  COUNT(*) FILTER (WHERE google_places_attributes IS NULL) AS missing_google_places_attributes,
  COUNT(*) FILTER (WHERE places_data_cached_at IS NULL) AS missing_places_cached_at,
  COUNT(*) FILTER (WHERE address IS NULL OR btrim(COALESCE(address,'')) = '') AS missing_address,
  COUNT(*) FILTER (WHERE latitude IS NULL OR longitude IS NULL) AS missing_lat_lng,
  COUNT(*) FILTER (WHERE website IS NULL OR btrim(COALESCE(website,'')) = '') AS missing_website,
  COUNT(*) FILTER (WHERE phone IS NULL OR btrim(COALESCE(phone,'')) = '') AS missing_phone,
  COUNT(*) FILTER (WHERE hours IS NULL) AS missing_hours,
  COUNT(*) FILTER (WHERE category IS NULL OR btrim(COALESCE(category,'')) = '') AS missing_category
FROM entities
WHERE google_place_id IS NOT NULL
  AND btrim(COALESCE(google_place_id,'')) <> '';
