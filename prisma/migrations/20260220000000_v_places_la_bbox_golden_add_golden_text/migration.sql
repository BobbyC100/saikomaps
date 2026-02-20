-- Add golden_records text fields to v_places_la_bbox_golden for tag scoring / explain.
-- Explicit column list to avoid collisions (places_* vs golden_*).
-- DROP required: PostgreSQL cannot CREATE OR REPLACE when new view has different column set.

DROP VIEW IF EXISTS public.v_places_la_bbox_golden;
CREATE VIEW public.v_places_la_bbox_golden AS
SELECT
  p.id,
  p.slug,
  p.google_place_id,
  p.name,
  p.address,
  p.latitude,
  p.longitude,
  p.phone,
  p.website AS places_website,
  p.description AS places_description,
  gr.website AS golden_website,
  gr.description AS golden_description,
  gr.about_copy AS golden_about_copy
FROM public.places p
JOIN public.golden_records gr
  ON gr.google_place_id = p.google_place_id
WHERE gr.lat BETWEEN 33.70 AND 34.85
  AND gr.lng BETWEEN -118.95 AND -117.60;
