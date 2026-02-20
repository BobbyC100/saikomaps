-- v_places_la_bbox: LA County places via places lat/lng bounding box
-- Canonical LA gate for places-only queries (no golden_records join)
-- Use v_places_la_bbox_golden when you need golden_record linkage

CREATE OR REPLACE VIEW public.v_places_la_bbox AS
SELECT *
FROM public.places
WHERE latitude IS NOT NULL
  AND longitude IS NOT NULL
  AND latitude BETWEEN 33.70 AND 34.85
  AND longitude BETWEEN -118.95 AND -117.60;
