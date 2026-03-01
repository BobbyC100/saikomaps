-- Partial unique index on google_place_id: enforce uniqueness only when non-empty.
-- Run preflight first: scripts/sql/gpid-unique-preflight-and-rollout.sql (step 1).
-- For production, prefer running the CONCURRENTLY version in that script (outside a transaction).
CREATE UNIQUE INDEX IF NOT EXISTS places_google_place_id_unique_nonempty
ON public.places (google_place_id)
WHERE google_place_id IS NOT NULL AND btrim(google_place_id) <> '';
