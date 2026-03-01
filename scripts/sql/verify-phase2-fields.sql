-- A) Confirm OperatorPlaceCandidate columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'operator_place_candidates'
  AND column_name IN ('reviewed_at', 'approved_by', 'confidence_bucket', 'match_score')
ORDER BY column_name;

-- B) Confirm place_job_log table exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'place_job_log'
ORDER BY ordinal_position;

-- C) Quick counts by confidence_bucket
SELECT confidence_bucket, COUNT(*) AS cnt
FROM operator_place_candidates
GROUP BY confidence_bucket
ORDER BY confidence_bucket NULLS FIRST;
