-- Rename place_* tables to entity_* (Philosophical Purity Pass)
-- Tables: place_appearances, place_actor_relationships, place_photo_eval, place_tag_scores

-- A) Rename tables
ALTER TABLE public.place_appearances RENAME TO entity_appearances;
ALTER TABLE public.place_actor_relationships RENAME TO entity_actor_relationships;
ALTER TABLE public.place_photo_eval RENAME TO entity_photo_eval;
ALTER TABLE public.place_tag_scores RENAME TO entity_tag_scores;

-- B) Rename indexes (place_* → entity_*)
DO $$
DECLARE
  tbl text[] := ARRAY[
    'place_appearances→entity_appearances',
    'place_actor_relationships→entity_actor_relationships',
    'place_photo_eval→entity_photo_eval',
    'place_tag_scores→entity_tag_scores'
  ];
  pair text;
  old_prefix text;
  new_prefix text;
  r record;
BEGIN
  FOREACH pair IN ARRAY tbl
  LOOP
    old_prefix := split_part(pair, '→', 1) || '_';
    new_prefix := split_part(pair, '→', 2) || '_';
    FOR r IN
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = split_part(pair, '→', 2)
        AND indexname LIKE old_prefix || '%'
    LOOP
      EXECUTE format(
        'ALTER INDEX public.%I RENAME TO %I',
        r.indexname,
        replace(r.indexname, old_prefix, new_prefix)
      );
    END LOOP;
  END LOOP;
END $$;

-- C) Rename constraints (place_* → entity_*)
DO $$
DECLARE
  tbl text[] := ARRAY[
    'place_appearances→entity_appearances',
    'place_actor_relationships→entity_actor_relationships',
    'place_photo_eval→entity_photo_eval',
    'place_tag_scores→entity_tag_scores'
  ];
  pair text;
  old_prefix text;
  new_prefix text;
  r record;
BEGIN
  FOREACH pair IN ARRAY tbl
  LOOP
    old_prefix := split_part(pair, '→', 1) || '_';
    new_prefix := split_part(pair, '→', 2) || '_';
    FOR r IN
      SELECT c.conname
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      JOIN pg_namespace n ON t.relnamespace = n.oid
      WHERE n.nspname = 'public'
        AND t.relname = split_part(pair, '→', 2)
        AND c.conname LIKE old_prefix || '%'
    LOOP
      EXECUTE format(
        'ALTER TABLE public.%I RENAME CONSTRAINT %I TO %I',
        split_part(pair, '→', 2),
        r.conname,
        replace(r.conname, old_prefix, new_prefix)
      );
    END LOOP;
  END LOOP;
END $$;
