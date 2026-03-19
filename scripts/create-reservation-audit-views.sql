-- Reservation V1 — Audit Views (3 views only)
-- Run via: ./scripts/db-neon.sh psql -f scripts/create-reservation-audit-views.sql

-- A. Missing provider: has URL but no provider detected
CREATE OR REPLACE VIEW reservation_audit_missing_provider AS
SELECT
  e.id AS entity_id,
  e.name,
  e.slug,
  COALESCE(rpm.booking_url, ms.reservation_url, e.reservation_url) AS reservation_url,
  ms.reservation_provider AS extracted_provider,
  ms.extraction_confidence,
  e.primary_vertical,
  e.website
FROM entities e
LEFT JOIN merchant_signals ms ON ms.entity_id = e.id
LEFT JOIN reservation_provider_matches rpm ON rpm.entity_id = e.id
WHERE COALESCE(rpm.booking_url, ms.reservation_url, e.reservation_url) IS NOT NULL
  AND COALESCE(rpm.booking_url, ms.reservation_url, e.reservation_url) != ''
  AND rpm.provider IS NULL
  AND (ms.reservation_provider IS NULL OR ms.reservation_provider = '' OR ms.reservation_provider = 'other')
ORDER BY ms.extraction_confidence DESC NULLS LAST;

-- B. Low confidence / unvalidated: has provider match but not yet matched
CREATE OR REPLACE VIEW reservation_audit_unvalidated AS
SELECT
  rpm.entity_id,
  e.name,
  e.slug,
  rpm.provider,
  rpm.match_status,
  rpm.match_score,
  rpm.confidence_level,
  rpm.booking_url,
  rpm.validation_source,
  rpm.last_checked_at
FROM reservation_provider_matches rpm
JOIN entities e ON e.id = rpm.entity_id
WHERE rpm.match_status != 'matched'
ORDER BY rpm.match_score DESC NULLS LAST;

-- C. Coverage summary: renderable vs gaps by provider
CREATE OR REPLACE VIEW reservation_coverage_summary AS
SELECT
  COALESCE(rpm.provider, ms.reservation_provider, 'none') AS provider,
  COUNT(DISTINCT e.id)::int AS entity_count,
  COUNT(DISTINCT CASE WHEN rpm.is_renderable THEN e.id END)::int AS renderable,
  COUNT(DISTINCT CASE WHEN rpm.match_status = 'probable' THEN e.id END)::int AS probable,
  COUNT(DISTINCT CASE WHEN ms.reservation_url IS NOT NULL AND rpm.id IS NULL THEN e.id END)::int AS extracted_not_validated,
  COUNT(DISTINCT CASE WHEN rpm.provider IS NULL AND ms.reservation_provider IS NULL
    AND COALESCE(ms.reservation_url, e.reservation_url) IS NOT NULL THEN e.id END)::int AS no_provider
FROM entities e
LEFT JOIN reservation_provider_matches rpm ON rpm.entity_id = e.id
LEFT JOIN merchant_signals ms ON ms.entity_id = e.id
WHERE e.primary_vertical IN ('EAT', 'DRINKS')
  AND (rpm.id IS NOT NULL OR ms.reservation_url IS NOT NULL OR e.reservation_url IS NOT NULL)
GROUP BY COALESCE(rpm.provider, ms.reservation_provider, 'none')
ORDER BY entity_count DESC;
