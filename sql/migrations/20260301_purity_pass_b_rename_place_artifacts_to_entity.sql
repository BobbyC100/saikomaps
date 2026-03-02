-- SKAI-WO-PURITY-PASS-B
-- Rename Place* enums used by entity tables, and clean up constraint names containing 'place_'

DO $$
BEGIN
  -- Enum renames (idempotent-ish: only run if old type exists)
  IF EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE n.nspname='public' AND t.typname='PlaceStatus'
  ) THEN
    EXECUTE 'ALTER TYPE public."PlaceStatus" RENAME TO "EntityStatus"';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE n.nspname='public' AND t.typname='PlaceType'
  ) THEN
    EXECUTE 'ALTER TYPE public."PlaceType" RENAME TO "EntityType"';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE n.nspname='public' AND t.typname='PlaceAppearanceStatus'
  ) THEN
    EXECUTE 'ALTER TYPE public."PlaceAppearanceStatus" RENAME TO "EntityAppearanceStatus"';
  END IF;
END $$;


DO $$
DECLARE r record;
DECLARE newname text;
BEGIN
  -- Constraint renames: only when replace(conname,'place_','entity_') changes the name
  FOR r IN
    SELECT conname, conrelid::regclass AS tbl
    FROM pg_constraint
    WHERE connamespace='public'::regnamespace
      AND conname LIKE '%place_%'
  LOOP
    newname := replace(r.conname, 'place_', 'entity_');
    IF newname IS DISTINCT FROM r.conname THEN
      EXECUTE format('ALTER TABLE %s RENAME CONSTRAINT %I TO %I', r.tbl, r.conname, newname);
    END IF;
  END LOOP;
END $$;
