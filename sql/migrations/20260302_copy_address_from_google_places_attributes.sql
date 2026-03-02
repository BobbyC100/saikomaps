-- One-off: copy address from google_places_attributes into entities.address
-- When: google_place_id exists, entities.address is empty, formatted_address exists in attrs
-- Idempotent: safe to run multiple times (only updates where address is empty)

UPDATE public.entities e
SET address = COALESCE(
  e.google_places_attributes->>'formatted_address',
  e.google_places_attributes->>'formattedAddress'
)
WHERE e.google_place_id IS NOT NULL
  AND btrim(COALESCE(e.google_place_id, '')) <> ''
  AND (e.address IS NULL OR btrim(COALESCE(e.address, '')) = '')
  AND e.google_places_attributes IS NOT NULL
  AND (
    (e.google_places_attributes->>'formatted_address' IS NOT NULL AND btrim(COALESCE(e.google_places_attributes->>'formatted_address', '')) <> '')
    OR
    (e.google_places_attributes->>'formattedAddress' IS NOT NULL AND btrim(COALESCE(e.google_places_attributes->>'formattedAddress', '')) <> '')
  );
