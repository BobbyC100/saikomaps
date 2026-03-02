-- Rename legacy constraint/index names on public.entities
-- Scope: names only. No data changes.

BEGIN;

-- PK constraint (and its backing index)
ALTER TABLE public.entities RENAME CONSTRAINT places_pkey TO entities_pkey;

-- Foreign key constraints on entities
ALTER TABLE public.entities RENAME CONSTRAINT places_category_id_fkey TO entities_category_id_fkey;
ALTER TABLE public.entities RENAME CONSTRAINT places_parent_id_fkey TO entities_parent_id_fkey;
ALTER TABLE public.entities RENAME CONSTRAINT places_restaurant_group_id_fkey TO entities_restaurant_group_id_fkey;

-- Unique indexes (slug, google_place_id - created as indexes not constraints)
ALTER INDEX public.places_slug_key RENAME TO entities_slug_key;
ALTER INDEX public.places_google_place_id_key RENAME TO entities_google_place_id_key;

-- Indexes (standalone btree indexes)
ALTER INDEX public.places_business_status_idx RENAME TO entities_business_status_idx;
ALTER INDEX public.places_category_id_idx RENAME TO entities_category_id_idx;
ALTER INDEX public.places_category_idx RENAME TO entities_category_idx;
ALTER INDEX public.places_google_place_id_idx RENAME TO entities_google_place_id_idx;
ALTER INDEX public.places_last_enriched_at_idx RENAME TO entities_last_enriched_at_idx;
ALTER INDEX public.places_needs_human_review_idx RENAME TO entities_needs_human_review_idx;
ALTER INDEX public.places_neighborhood_idx RENAME TO entities_neighborhood_idx;
ALTER INDEX public.places_parent_id_idx RENAME TO entities_parent_id_idx;
ALTER INDEX public.places_primary_vertical_idx RENAME TO entities_primary_vertical_idx;
ALTER INDEX public.places_restaurant_group_id_idx RENAME TO entities_restaurant_group_id_idx;
ALTER INDEX public.places_status_idx RENAME TO entities_status_idx;

COMMIT;
