-- =============================================================================
-- GPID partial unique index: preflight + rollout
-- Table: public.places
-- Goal: Never allow duplicate non-empty google_place_id (uniqueness only when set).
-- Index name: places_google_place_id_unique_nonempty
-- =============================================================================

-- -----------------------------------------------------------------------------
-- STEP 1: PREFLIGHT — run this first. If it returns 0 rows, you can apply the index.
-- -----------------------------------------------------------------------------

SELECT google_place_id, count(*) AS cnt
FROM public.places
WHERE google_place_id IS NOT NULL AND btrim(google_place_id) <> ''
GROUP BY 1
HAVING count(*) > 1;


-- -----------------------------------------------------------------------------
-- STEP 2: IF PREFLIGHT RETURNED ROWS — list duplicate rows for manual remediation
-- -----------------------------------------------------------------------------

-- (Run this only when step 1 returned at least one row.)
-- Replace :gpid with each duplicate google_place_id from step 1, or use the variant below.

-- Single GPID (replace 'ChIJ...' with the duplicate value from step 1):
/*
SELECT id, name, google_place_id, updated_at
FROM public.places
WHERE google_place_id IS NOT NULL AND btrim(google_place_id) <> ''
  AND google_place_id = 'ChIJ...'
ORDER BY updated_at;
*/

-- All rows that are part of any duplicate group (no substitution needed):
SELECT p.id, p.name, p.google_place_id, p.updated_at
FROM public.places p
JOIN (
  SELECT google_place_id
  FROM public.places
  WHERE google_place_id IS NOT NULL AND btrim(google_place_id) <> ''
  GROUP BY 1
  HAVING count(*) > 1
) dup ON p.google_place_id = dup.google_place_id
ORDER BY p.google_place_id, p.updated_at;


-- -----------------------------------------------------------------------------
-- STEP 3: APPLY INDEX (only after preflight returns 0 rows)
-- -----------------------------------------------------------------------------
-- CONCURRENTLY cannot run inside a transaction (e.g. Prisma migrate).
-- Run this block manually against the DB (e.g. psql or Neon SQL editor).

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS places_google_place_id_unique_nonempty
ON public.places (google_place_id)
WHERE google_place_id IS NOT NULL AND btrim(google_place_id) <> '';


-- -----------------------------------------------------------------------------
-- VERIFICATION (after applying index)
-- -----------------------------------------------------------------------------

-- Duplicates should be 0:
-- SELECT google_place_id, count(*) FROM public.places
-- WHERE google_place_id IS NOT NULL AND btrim(google_place_id) <> ''
-- GROUP BY 1 HAVING count(*) > 1;

-- Index should exist:
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public' AND tablename = 'places'
--   AND indexname = 'places_google_place_id_unique_nonempty';
