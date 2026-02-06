-- Analyze Places by Photo and Google Place ID Coverage
-- This query helps understand data quality and completeness for places in the database
-- Run with: psql $DATABASE_URL -f scripts/analyze-place-data-coverage.sql

-- Count places by photo status and Google Place ID status
SELECT 
  CASE 
    WHEN google_photos IS NULL OR google_photos::text = '[]' OR google_photos::text = 'null' THEN 'no_photos'
    ELSE 'has_photos'
  END as photo_status,
  CASE 
    WHEN google_place_id IS NULL OR google_place_id = '' THEN 'no_place_id'
    ELSE 'has_place_id'
  END as place_id_status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM places
GROUP BY 1, 2
ORDER BY 1, 2;

-- Additional stats for context
SELECT 
  COUNT(*) as total_places,
  COUNT(google_place_id) as places_with_place_id,
  COUNT(*) FILTER (WHERE google_photos IS NOT NULL AND google_photos::text != '[]' AND google_photos::text != 'null') as places_with_photos,
  COUNT(*) FILTER (WHERE google_place_id IS NOT NULL AND google_photos IS NOT NULL AND google_photos::text != '[]') as fully_enriched_places
FROM places;
