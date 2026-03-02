-- Finish enrichment_stage migration: drop view, swap columns, recreate view

DROP VIEW IF EXISTS public.v_places_la_bbox;
DROP VIEW IF EXISTS public.v_places_la_bbox_golden;

ALTER TABLE public.entities DROP COLUMN IF EXISTS enrichment_stage;
ALTER TABLE public.entities RENAME COLUMN enrichment_stage_new TO enrichment_stage;

CREATE OR REPLACE VIEW public.v_places_la_bbox AS
SELECT *
FROM public.entities
WHERE latitude IS NOT NULL
  AND longitude IS NOT NULL
  AND latitude BETWEEN 33.70 AND 34.85
  AND longitude BETWEEN -118.95 AND -117.60;

CREATE OR REPLACE VIEW public.v_places_la_bbox_golden AS
SELECT
  e.id,
  e.slug,
  e.google_place_id,
  e.name,
  e.address,
  e.latitude,
  e.longitude,
  e.phone,
  e.website AS places_website,
  e.description AS places_description,
  gr.website AS golden_website,
  gr.description AS golden_description,
  gr.about_copy AS golden_about_copy
FROM public.entities e
JOIN public.golden_records gr ON gr.google_place_id = e.google_place_id
WHERE gr.lat BETWEEN 33.70 AND 34.85
  AND gr.lng BETWEEN -118.95 AND -117.60;
