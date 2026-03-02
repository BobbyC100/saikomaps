-- SKAI-WO-ENT-TIER1-002: Tier 1 Field Backfill — Website, Category, Phone
-- Copy from golden_records to entities where entity has google_place_id and field is empty.
-- Rules: Only write if NULL/empty. Only copy existing values. No overwrite of populated fields.
-- Category fallback: primary_vertical when golden.category is empty.
-- Idempotent: safe to run multiple times.

UPDATE public.entities e
SET
  website = CASE
    WHEN (e.website IS NULL OR btrim(COALESCE(e.website, '')) = '')
         AND g.website IS NOT NULL AND btrim(g.website) <> ''
    THEN g.website
    ELSE e.website
  END,
  phone = CASE
    WHEN (e.phone IS NULL OR btrim(COALESCE(e.phone, '')) = '')
         AND g.phone IS NOT NULL AND btrim(g.phone) <> ''
    THEN g.phone
    ELSE e.phone
  END,
  category = CASE
    WHEN (e.category IS NULL OR btrim(COALESCE(e.category, '')) = '')
         AND g.category IS NOT NULL AND btrim(g.category) <> ''
    THEN g.category
    WHEN (e.category IS NULL OR btrim(COALESCE(e.category, '')) = '')
         AND e.primary_vertical IS NOT NULL
    THEN initcap(lower(e.primary_vertical::text))
    ELSE e.category
  END,
  updated_at = now()
FROM public.golden_records g
WHERE g.slug = e.slug
  AND e.google_place_id IS NOT NULL
  AND btrim(COALESCE(e.google_place_id, '')) <> ''
  AND (
    ((e.website IS NULL OR btrim(COALESCE(e.website, '')) = '') AND g.website IS NOT NULL AND btrim(g.website) <> '')
    OR ((e.phone IS NULL OR btrim(COALESCE(e.phone, '')) = '') AND g.phone IS NOT NULL AND btrim(g.phone) <> '')
    OR ((e.category IS NULL OR btrim(COALESCE(e.category, '')) = '')
        AND ((g.category IS NOT NULL AND btrim(g.category) <> '') OR e.primary_vertical IS NOT NULL))
  );
