-- Category-only re-enrich: throttle by attempt timestamp (avoid infinite loops)
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS category_enrich_attempted_at timestamptz;
