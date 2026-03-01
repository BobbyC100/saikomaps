-- Verification one-liner (run after backfill-entities-address-from-google)
WITH missing AS (
  SELECT
    address IS NULL AS is_missing_address,
    google_place_id IS NOT NULL AS has_gpid,
    COALESCE(
      google_places_attributes->>'formatted_address',
      google_places_attributes->>'formattedAddress'
    ) AS google_addr
  FROM entities
)
SELECT
  COUNT(*) FILTER (WHERE is_missing_address) AS missing_address,
  COUNT(*) FILTER (WHERE is_missing_address AND has_gpid) AS missing_address_with_gpid,
  COUNT(*) FILTER (WHERE is_missing_address AND has_gpid AND NULLIF(TRIM(google_addr), '') IS NOT NULL)
    AS missing_address_with_gpid_and_google_addr
FROM missing;
