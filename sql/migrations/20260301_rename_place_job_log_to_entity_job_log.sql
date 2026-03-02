-- A-only rename: place_job_log -> entity_job_log

ALTER TABLE public.place_job_log RENAME TO entity_job_log;

-- Rename indexes (place_job_log_* -> entity_job_log_*)
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'entity_job_log'
      AND indexname LIKE 'place_job_log_%'
  LOOP
    EXECUTE format(
      'ALTER INDEX public.%I RENAME TO %I',
      r.indexname,
      replace(r.indexname, 'place_job_log_', 'entity_job_log_')
    );
  END LOOP;
END $$;

-- Rename constraints (place_job_log_* -> entity_job_log_*)
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND t.relname = 'entity_job_log'
      AND c.conname LIKE 'place_job_log_%'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.entity_job_log RENAME CONSTRAINT %I TO %I',
      r.conname,
      replace(r.conname, 'place_job_log_', 'entity_job_log_')
    );
  END LOOP;
END $$;
