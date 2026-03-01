-- One-time backfill: confidence_bucket for existing PENDING candidates
-- Derives from match_score: >=0.85 HIGH, 0.70-0.85 MEDIUM, <0.70 LOW

UPDATE operator_place_candidates
SET confidence_bucket =
  CASE
    WHEN match_score >= 0.85 THEN 'HIGH'
    WHEN match_score >= 0.70 THEN 'MEDIUM'
    ELSE 'LOW'
  END
WHERE confidence_bucket IS NULL
  AND match_score IS NOT NULL;
