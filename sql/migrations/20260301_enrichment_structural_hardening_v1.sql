-- SKAI-WO-ENRICHMENT-STRUCTURAL-HARDENING-V1
-- Failure tracking + deterministic stage model

-- Part A1: Failure tracking columns
ALTER TABLE public.entities
  ADD COLUMN IF NOT EXISTS last_enrichment_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_enrichment_error text,
  ADD COLUMN IF NOT EXISTS enrichment_retry_count integer NOT NULL DEFAULT 0;

-- Part B1: EnrichmentStage enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'EnrichmentStage'
  ) THEN
    CREATE TYPE public."EnrichmentStage" AS ENUM (
      'NOT_STARTED',
      'GOOGLE_COVERAGE_COMPLETE',
      'MERCHANT_ENRICHED',
      'FAILED'
    );
  END IF;
END $$;

-- Migrate enrichment_stage from text to enum (nullable; existing values become NULL or map)
ALTER TABLE public.entities
  ADD COLUMN IF NOT EXISTS enrichment_stage_new public."EnrichmentStage";

-- Backfill: map legacy free-form values to enum where possible
UPDATE public.entities e
SET enrichment_stage_new = CASE
  WHEN COALESCE(e.enrichment_stage, '') IN ('OK', 'ENRICHED_WEBSITE', 'GOOGLE_COVERAGE_COMPLETE', 'MERCHANT_ENRICHED') THEN 'MERCHANT_ENRICHED'::public."EnrichmentStage"
  WHEN COALESCE(e.enrichment_stage, '') IN ('BLOCKED', 'LOW_CONF', 'FAILED') THEN 'FAILED'::public."EnrichmentStage"
  WHEN e.places_data_cached_at IS NOT NULL AND (e.hours IS NOT NULL OR (e.google_photos IS NOT NULL AND e.google_photos::text != '[]')) THEN 'GOOGLE_COVERAGE_COMPLETE'::public."EnrichmentStage"
  ELSE 'NOT_STARTED'::public."EnrichmentStage"
END;

-- Drop old column, rename new
ALTER TABLE public.entities DROP COLUMN IF EXISTS enrichment_stage;
ALTER TABLE public.entities RENAME COLUMN enrichment_stage_new TO enrichment_stage;
