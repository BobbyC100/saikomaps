-- SKAI-WO-CORE-PLACE-RENAME-TO-ENTITY
-- Rename root identity primitive: places → entities, place_id → entity_id, place_type → entity_type

-- 1. Drop views that depend on places
DROP VIEW IF EXISTS public.v_places_la_bbox_golden;
DROP VIEW IF EXISTS public.v_places_la_bbox;

-- 2. Drop partial unique index on places (will recreate on entities)
DROP INDEX IF EXISTS places_google_place_id_unique_nonempty;

-- 3. Rename table places → entities
ALTER TABLE public.places RENAME TO entities;

-- 4. Rename place_type → entity_type in entities
ALTER TABLE public.entities RENAME COLUMN place_type TO entity_type;

-- 5. Rename place_id → entity_id in child tables (preserves FK references to entities.id)

-- map_places
ALTER TABLE public.map_places RENAME COLUMN place_id TO entity_id;

-- person_places
ALTER TABLE public.person_places RENAME COLUMN place_id TO entity_id;

-- merchant_enrichment_runs
ALTER TABLE public.merchant_enrichment_runs RENAME COLUMN place_id TO entity_id;

-- merchant_signals (place_id is PK)
ALTER TABLE public.merchant_signals RENAME COLUMN place_id TO entity_id;

-- place_appearances (subject_place_id, host_place_id)
-- Drop CHECK constraint (references host_place_id); recreate after rename
ALTER TABLE public.place_appearances DROP CONSTRAINT IF EXISTS place_appearances_location_check;
ALTER TABLE public.place_appearances RENAME COLUMN subject_place_id TO subject_entity_id;
ALTER TABLE public.place_appearances RENAME COLUMN host_place_id TO host_entity_id;
ALTER TABLE public.place_appearances ADD CONSTRAINT place_appearances_location_check CHECK (
  ("host_entity_id" IS NOT NULL)
  OR ("latitude" IS NOT NULL AND "longitude" IS NOT NULL AND "address_text" IS NOT NULL)
);

-- viewer_bookmarks
ALTER TABLE public.viewer_bookmarks RENAME COLUMN place_id TO entity_id;

-- place_photo_eval
ALTER TABLE public.place_photo_eval RENAME COLUMN place_id TO entity_id;

-- energy_scores
ALTER TABLE public.energy_scores RENAME COLUMN place_id TO entity_id;

-- place_tag_scores
ALTER TABLE public.place_tag_scores RENAME COLUMN place_id TO entity_id;

-- place_coverage_status
ALTER TABLE public.place_coverage_status RENAME COLUMN place_id TO entity_id;

-- gpid_resolution_queue
ALTER TABLE public.gpid_resolution_queue RENAME COLUMN place_id TO entity_id;

-- operator_place_candidates
ALTER TABLE public.operator_place_candidates RENAME COLUMN place_id TO entity_id;

-- place_actor_relationships
ALTER TABLE public.place_actor_relationships RENAME COLUMN place_id TO entity_id;

-- 6. Update FK constraint names for clarity (optional but improves audit)
-- PostgreSQL doesn't require this; FKs still reference entities.id correctly after table rename.
-- Skipping constraint renames per "no sweeping rename" — functional correctness only.

-- 7. Recreate partial unique index on entities
CREATE UNIQUE INDEX IF NOT EXISTS entities_google_place_id_unique_nonempty
ON public.entities (google_place_id)
WHERE google_place_id IS NOT NULL AND btrim(google_place_id) <> '';

-- 8. Recreate views (view names stay per work order; they now read from entities)
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
