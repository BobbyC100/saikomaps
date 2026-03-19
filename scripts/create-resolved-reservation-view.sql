-- Resolved reservation view: single clean read surface for UI
-- Merges validated provider matches with merchant-extracted fallback.
-- Run via: ./scripts/db-neon.sh psql -f scripts/create-resolved-reservation-view.sql

CREATE OR REPLACE VIEW resolved_reservations AS
SELECT
  e.id AS entity_id,
  e.slug,
  e.name,
  -- Resolved provider (Tier 1 only get named)
  CASE
    WHEN rpm.provider IN ('resy', 'opentable', 'tock', 'sevenrooms') THEN rpm.provider
    ELSE NULL
  END AS resolved_provider,
  -- Resolved URL: validated > merchant_signals > entities
  COALESCE(rpm.booking_url, ms.reservation_url, e.reservation_url) AS resolved_reservation_url,
  -- Confidence source
  CASE
    WHEN rpm.id IS NOT NULL AND rpm.is_renderable THEN 'validated'
    WHEN ms.reservation_url IS NOT NULL THEN 'extracted'
    WHEN e.reservation_url IS NOT NULL THEN 'legacy'
    ELSE NULL
  END AS resolved_source,
  -- Confidence level
  COALESCE(rpm.confidence_level, 'weak') AS resolved_confidence,
  -- Button label
  CASE
    WHEN rpm.provider = 'resy' THEN 'Reserve on Resy'
    WHEN rpm.provider = 'opentable' THEN 'Reserve on OpenTable'
    WHEN rpm.provider = 'tock' THEN 'Reserve on Tock'
    WHEN rpm.provider = 'sevenrooms' THEN 'Reserve on SevenRooms'
    ELSE 'Reserve'
  END AS button_label,
  -- Is renderable (any URL = renderable, don't over-gate)
  CASE
    WHEN COALESCE(rpm.booking_url, ms.reservation_url, e.reservation_url) IS NOT NULL
      AND COALESCE(rpm.booking_url, ms.reservation_url, e.reservation_url) != ''
    THEN true
    ELSE false
  END AS is_renderable
FROM entities e
LEFT JOIN reservation_provider_matches rpm
  ON rpm.entity_id = e.id AND rpm.is_renderable = true
LEFT JOIN merchant_signals ms
  ON ms.entity_id = e.id
WHERE COALESCE(rpm.booking_url, ms.reservation_url, e.reservation_url) IS NOT NULL
  AND COALESCE(rpm.booking_url, ms.reservation_url, e.reservation_url) != '';
