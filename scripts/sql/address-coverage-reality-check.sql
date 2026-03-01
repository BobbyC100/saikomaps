-- Address Coverage Reality Check
-- Purpose: Determine whether missing `entities.address` is a flow/backfill issue
-- (address exists in entities.google_places_attributes JSONB) or a sourcing/enrichment issue.
--
-- Notes:
-- - There is no separate `google_places_attributes` table.
-- - On `entities`, you have:
--     google_place_id
--     address
--     google_places_attributes (JSONB)
-- - We treat either `formatted_address` or `formattedAddress` as the possible JSON keys.
--
-- Run blocks in order: Step 1, Step 2, Step 3.

-- =====================
-- Step 1: Missing address counts + GPID availability
-- =====================
SELECT
  COUNT(*) AS total_entities,
  COUNT(*) FILTER (WHERE address IS NULL) AS missing_address,
  COUNT(*) FILTER (WHERE address IS NULL AND google_place_id IS NOT NULL) AS missing_address_with_gpid,
  COUNT(*) FILTER (WHERE address IS NULL AND google_place_id IS NULL) AS missing_address_no_gpid
FROM entities;

-- =====================
-- Step 2: For missing-address entities that DO have GPID,
-- do we already have a formatted address in JSONB?
-- =====================
WITH missing_with_gpid AS (
  SELECT
    id,
    google_place_id,
    address,
    COALESCE(
      google_places_attributes->>'formatted_address',
      google_places_attributes->>'formattedAddress'
    ) AS google_formatted_address
  FROM entities
  WHERE address IS NULL
    AND google_place_id IS NOT NULL
)
SELECT
  COUNT(*) AS missing_address_with_gpid,
  COUNT(*) FILTER (
    WHERE google_formatted_address IS NOT NULL
      AND NULLIF(TRIM(google_formatted_address), '') IS NOT NULL
  ) AS have_formatted_address_in_google_attrs
FROM missing_with_gpid;

-- =====================
-- Step 3: Sample rows to visually confirm where the address exists
-- (entity column vs JSONB)
-- =====================
SELECT
  id,
  name,
  slug,
  neighborhood,
  google_place_id,
  address AS entity_address,
  COALESCE(
    google_places_attributes->>'formatted_address',
    google_places_attributes->>'formattedAddress'
  ) AS google_address
FROM entities
WHERE address IS NULL
ORDER BY COALESCE(updated_at, created_at) DESC
LIMIT 25;
