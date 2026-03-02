-- SKAI-WO-ENT-COORDS-001: Propagate lat/lng from golden_records → entities
-- Copy existing coordinates where entity has GPID, entity missing coords, golden has valid lat+lng.
-- Idempotent: safe to run multiple times.

UPDATE public.entities e
SET
  latitude = g.lat,
  longitude = g.lng,
  updated_at = now()
FROM public.golden_records g
WHERE g.slug = e.slug
  AND e.google_place_id IS NOT NULL
  AND (e.latitude IS NULL OR e.longitude IS NULL)
  AND g.lat IS NOT NULL
  AND g.lng IS NOT NULL;
