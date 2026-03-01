ALTER TABLE public.golden_records
ADD COLUMN IF NOT EXISTS match_confidence DOUBLE PRECISION;
