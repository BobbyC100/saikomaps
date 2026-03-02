-- Rename table
ALTER TABLE public.place_coverage_status RENAME TO entity_coverage_status;

-- Rename indexes (if they exist)
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'entity_coverage_status'
      AND indexname LIKE 'place_coverage_status_%'
  LOOP
    EXECUTE format(
      'ALTER INDEX public.%I RENAME TO %I',
      r.indexname,
      replace(r.indexname, 'place_coverage_status_', 'entity_coverage_status_')
    );
  END LOOP;
END $$;

-- Rename constraints (PK/FK/etc) (if they exist)
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND t.relname = 'entity_coverage_status'
      AND c.conname LIKE 'place_coverage_status_%'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.entity_coverage_status RENAME CONSTRAINT %I TO %I',
      r.conname,
      replace(r.conname, 'place_coverage_status_', 'entity_coverage_status_')
    );
  END LOOP;
END $$;
