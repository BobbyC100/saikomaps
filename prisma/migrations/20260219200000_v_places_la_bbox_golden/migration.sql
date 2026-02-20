-- v_places_la_bbox_golden: LA County places via golden_records geo
-- Canonical LA gate: golden_records lat/lng bounding box
-- Excludes places without matching golden_record (missing google_place_id or no golden row)

CREATE OR REPLACE VIEW v_places_la_bbox_golden AS
SELECT p.*
FROM places p
JOIN golden_records gr ON gr.google_place_id = p.google_place_id
WHERE gr.lat BETWEEN 33.70 AND 34.85
  AND gr.lng BETWEEN -118.95 AND -117.60;
