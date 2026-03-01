-- SAIKO Website Enrichment Spec v1.1
-- merchant_enrichment_runs (append-only), merchant_signals (upsert), places enrichment columns

CREATE TABLE IF NOT EXISTS public.merchant_enrichment_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id text NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  source_url text NOT NULL,
  final_url text,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  http_status int,
  extraction_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence numeric,
  cost_usd numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS merchant_enrichment_runs_place_id_idx ON public.merchant_enrichment_runs(place_id);
CREATE INDEX IF NOT EXISTS merchant_enrichment_runs_fetched_at_idx ON public.merchant_enrichment_runs(fetched_at);

CREATE TABLE IF NOT EXISTS public.merchant_signals (
  place_id text PRIMARY KEY REFERENCES public.places(id) ON DELETE CASCADE,
  inferred_category text,
  inferred_cuisine jsonb,
  reservation_provider text,
  reservation_url text,
  ordering_provider text,
  ordering_url text,
  menu_url text,
  social_links jsonb,
  extraction_confidence numeric,
  last_updated_at timestamptz NOT NULL DEFAULT now()
);

-- Places: website enrichment lifecycle columns
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS last_enriched_at timestamptz;
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS enrichment_stage text;
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS needs_human_review boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS places_last_enriched_at_idx ON public.places(last_enriched_at) WHERE last_enriched_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS places_needs_human_review_idx ON public.places(needs_human_review) WHERE needs_human_review = true;
