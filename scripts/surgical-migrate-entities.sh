#!/usr/bin/env bash
# scripts/surgical-migrate-entities.sh
#
# Applies the minimum set of migrations needed to create the `entities` table
# so that /place/[slug] routes can load.
#
# Also resolves the pre-existing failed migration: 20260217200000_golden_first_intake
#
# DOES NOT apply the following deferred migrations:
#   - 20260306200000_slim_entities_fields_v2
#   - 20260306300000_drop_legacy_tables_fields_v2
#   (those require canonical_entity_state to be populated first)
#
# Usage:
#   bash scripts/surgical-migrate-entities.sh
#   bash scripts/surgical-migrate-entities.sh --dry-run   (prints what would run, touches nothing)
#
# Safe to re-run: each step checks whether the migration is already applied.

set -euo pipefail

DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
  echo "=== DRY RUN MODE — no changes will be made ==="
fi

# ---------------------------------------------------------------------------
# Load DATABASE_URL
# ---------------------------------------------------------------------------
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | grep 'DATABASE_URL' | xargs)
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL not set. Ensure .env.local exists with DATABASE_URL."
  exit 1
fi

MIGRATIONS_DIR="prisma/migrations"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

checksum() {
  shasum -a 256 "$1" | awk '{print $1}'
}

new_uuid() {
  uuidgen | tr '[:upper:]' '[:lower:]'
}

is_applied() {
  local name="$1"
  local count
  count=$(psql "$DATABASE_URL" -t -c \
    "SELECT COUNT(*) FROM _prisma_migrations WHERE migration_name = '$name' AND finished_at IS NOT NULL;" \
    | tr -d ' \n')
  [ "$count" -gt 0 ]
}

run_sql_file() {
  local file="$1"
  local single_tx="${2:-true}"
  if [ "$DRY_RUN" = true ]; then
    echo "    [DRY RUN] would run: psql ... -f $file"
    return 0
  fi
  if [ "$single_tx" = true ]; then
    psql "$DATABASE_URL" --single-transaction -v ON_ERROR_STOP=1 -f "$file" -q
  else
    # Used only for add_saiko_fields_trace_v02 where two FK additions to
    # "entities" will fail (entities doesn't exist yet). The table creations
    # before those lines will have already committed.
    psql "$DATABASE_URL" -v ON_ERROR_STOP=0 -f "$file" -q || true
  fi
}

mark_applied() {
  local name="$1"
  local sum="$2"
  if [ "$DRY_RUN" = true ]; then
    echo "    [DRY RUN] would insert _prisma_migrations: $name"
    return 0
  fi
  psql "$DATABASE_URL" -q -c "
    INSERT INTO _prisma_migrations
      (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
    VALUES
      ('$(new_uuid)', '$sum', NOW(), '$name', NULL, NULL, NOW(), 1)
    ON CONFLICT (id) DO NOTHING;
  "
}

verify_table_exists() {
  local table="$1"
  local count
  count=$(psql "$DATABASE_URL" -t -c \
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='$table';" \
    | tr -d ' \n')
  if [ "$count" -eq 0 ]; then
    echo "ERROR: Expected table '$table' to exist after migration, but it does not."
    exit 1
  fi
}

apply_migration() {
  local name="$1"
  local single_tx="${2:-true}"
  local sql_file="$MIGRATIONS_DIR/$name/migration.sql"

  echo -n "  [$name] "

  if is_applied "$name"; then
    echo "already applied — skipping"
    return 0
  fi

  if [ ! -f "$sql_file" ]; then
    echo ""
    echo "ERROR: SQL file not found: $sql_file"
    exit 1
  fi

  run_sql_file "$sql_file" "$single_tx"
  local sum
  sum=$(checksum "$sql_file")
  mark_applied "$name" "$sum"
  echo "✓"
}

# ---------------------------------------------------------------------------
# Step 0: Resolve failed migration — 20260217200000_golden_first_intake
#
# This migration has a bug: it tries to use "PromotionStatus" type before
# creating it. It failed in the DB and was recorded with finished_at = NULL.
# Fix: create the types first, re-run the migration (IF NOT EXISTS guards make
# it safe), then mark it resolved.
# ---------------------------------------------------------------------------

echo ""
echo "=== Step 0: Resolve failed migration: 20260217200000_golden_first_intake ==="

if is_applied "20260217200000_golden_first_intake"; then
  echo "  Already resolved — skipping."
else
  echo -n "  Creating PromotionStatus / ResolutionType / MatchMethod types ... "
  if [ "$DRY_RUN" = false ]; then
    psql "$DATABASE_URL" -q -c "
      DO \$\$ BEGIN
        CREATE TYPE \"PromotionStatus\" AS ENUM ('PENDING', 'VERIFIED', 'PUBLISHED');
      EXCEPTION WHEN duplicate_object THEN null; END \$\$;
      DO \$\$ BEGIN
        CREATE TYPE \"ResolutionType\" AS ENUM ('matched', 'created', 'ambiguous');
      EXCEPTION WHEN duplicate_object THEN null; END \$\$;
      DO \$\$ BEGIN
        CREATE TYPE \"MatchMethod\" AS ENUM ('exact', 'normalized', 'fuzzy');
      EXCEPTION WHEN duplicate_object THEN null; END \$\$;
    "
  else
    echo "[DRY RUN]"
  fi
  echo "✓"

  echo -n "  Running migration SQL (idempotent with IF NOT EXISTS guards) ... "
  run_sql_file "$MIGRATIONS_DIR/20260217200000_golden_first_intake/migration.sql" true
  echo "✓"

  echo -n "  Marking resolved in _prisma_migrations ... "
  if [ "$DRY_RUN" = false ]; then
    psql "$DATABASE_URL" -q -c "
      UPDATE _prisma_migrations
      SET finished_at = NOW(), applied_steps_count = 1, logs = NULL
      WHERE migration_name = '20260217200000_golden_first_intake';
    "
  else
    echo "[DRY RUN]"
  fi
  echo "✓"
fi

# ---------------------------------------------------------------------------
# Step 1: Apply migrations 1–20 (up to add_website_source_class)
# These are clean: no DROPs, no FK dependency on entities.
# ---------------------------------------------------------------------------

echo ""
echo "=== Step 1: Migrations 1–20 (pre-Actor, no entities FK dependency) ==="

for name in \
  "20260218000000_add_primary_vertical" \
  "20260218000001_require_primary_vertical" \
  "20260218010000_add_place_page_fields" \
  "20260219000000_add_energy_tag_engine_v1" \
  "20260219010000_energy_v1_no_popularity" \
  "20260219200000_v_places_la_bbox_golden" \
  "20260219210000_create_view_v_places_la_bbox" \
  "20260220000000_v_places_la_bbox_golden_add_golden_text" \
  "20260220100000_add_website_source_confidence_updated_at" \
  "20260220200000_add_website_source_class"; do
  apply_migration "$name" true
done

# ---------------------------------------------------------------------------
# Step 2: Apply 20260221000000_add_saiko_fields_trace_v02
#
# Special handling required: this migration creates Actor, FieldsMembership,
# and TraceSignalsCache tables, but also tries to FK FieldsMembership and
# TraceSignalsCache to "entities" — which doesn't exist yet. The exception
# guard (WHEN duplicate_object) does NOT catch undefined_table errors, so
# those two FK additions will fail.
#
# Resolution: run WITHOUT --single-transaction so the table CREATEs commit
# independently. The two FK failures are expected and tolerated here. The
# missing FKs are added explicitly in Step 5 after entities is created.
# ---------------------------------------------------------------------------

echo ""
echo "=== Step 2: 20260221000000_add_saiko_fields_trace_v02 (Actor/FieldsMembership/TraceSignalsCache) ==="
echo "  Note: FieldsMembership and TraceSignalsCache FKs to 'entities' will fail here."
echo "  This is expected — entities does not exist yet. FKs are added in Step 5."

NAME="20260221000000_add_saiko_fields_trace_v02"
if is_applied "$NAME"; then
  echo "  [$NAME] already applied — skipping"
else
  echo -n "  [$NAME] running without --single-transaction ... "
  run_sql_file "$MIGRATIONS_DIR/$NAME/migration.sql" false

  # Verify the tables we care about were actually created
  if [ "$DRY_RUN" = false ]; then
    verify_table_exists "Actor"
    verify_table_exists "FieldsMembership"
    verify_table_exists "TraceSignalsCache"
  fi

  SUM=$(checksum "$MIGRATIONS_DIR/$NAME/migration.sql")
  mark_applied "$NAME" "$SUM"
  echo "✓ (tables created; entity FKs deferred to Step 5)"
fi

# ---------------------------------------------------------------------------
# Step 3: Migrations 22–28 (place_photo_eval through place_appearances_v1)
# These FK to "places" and "Actor" — both exist at this point.
# NOTE: 20260229/20260230/20260231 have out-of-order timestamps but are
# required by places_to_entities which renames their columns.
# ---------------------------------------------------------------------------

echo ""
echo "=== Step 3: Migrations 22–28 (place_photo_eval → place_appearances_v1) ==="

for name in \
  "20260222120000_add_place_photo_eval" \
  "20260223100000_add_prl_override" \
  "20260223150000_add_coverage_ledger" \
  "20260223160000_add_places_business_status" \
  "20260225100000_sources_and_golden_merge_quality" \
  "20260225110000_confidence_v1_places_sources" \
  "20260225202353_add_match_confidence" \
  "20260226100000_golden_records_nullable_lat_lng" \
  "20260226120000_merchant_website_enrichment" \
  "20260226200000_category_enrich_attempted_at" \
  "20260227100000_gpid_unique_nonempty" \
  "20260227200000_gpid_resolution_queue" \
  "20260228000000_place_actor_relationships" \
  "20260228000001_actor_kind_default" \
  "20260229000000_add_operator_place_candidates" \
  "20260230000000_operator_candidate_review_fields_and_place_job_log" \
  "20260231000000_place_appearances_v1"; do
  apply_migration "$name" true
done

# ---------------------------------------------------------------------------
# Step 4: 20260228100000_places_to_entities
# The key migration: renames places → entities, place_type → entity_type,
# and place_id → entity_id in all child tables. Also recreates views.
# ---------------------------------------------------------------------------

echo ""
echo "=== Step 4: 20260228100000_places_to_entities — THE KEY MIGRATION ==="
apply_migration "20260228100000_places_to_entities" true

if [ "$DRY_RUN" = false ]; then
  verify_table_exists "entities"
  echo "  ✓ entities table confirmed in DB"
fi

# ---------------------------------------------------------------------------
# Step 5: Add the deferred FKs from add_saiko_fields_trace_v02
# Now that entities exists, we can add the FK constraints that failed in Step 2.
# ---------------------------------------------------------------------------

echo ""
echo "=== Step 5: Add deferred FKs — FieldsMembership and TraceSignalsCache → entities ==="

if [ "$DRY_RUN" = false ]; then
  psql "$DATABASE_URL" -q -c "
    DO \$\$ BEGIN
      ALTER TABLE \"FieldsMembership\"
        ADD CONSTRAINT \"FieldsMembership_entity_id_fkey\"
        FOREIGN KEY (\"entity_id\") REFERENCES \"entities\"(\"id\")
        ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END \$\$;

    DO \$\$ BEGIN
      ALTER TABLE \"TraceSignalsCache\"
        ADD CONSTRAINT \"TraceSignalsCache_entity_id_fkey\"
        FOREIGN KEY (\"entity_id\") REFERENCES \"entities\"(\"id\")
        ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END \$\$;
  "
  echo "  ✓ FK constraints added"
else
  echo "  [DRY RUN] would add FieldsMembership and TraceSignalsCache FKs to entities"
fi

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------

echo ""
echo "=== Complete. Summary: ==="

if [ "$DRY_RUN" = false ]; then
  echo ""
  echo "Entities table:"
  psql "$DATABASE_URL" -c "\dt entities"

  echo ""
  echo "Remaining unapplied migrations (expect 23):"
  npx prisma migrate status 2>&1 | grep -A 100 "Following migrations" | head -30 || true

  echo ""
  echo "FK constraints on FieldsMembership and TraceSignalsCache:"
  psql "$DATABASE_URL" -c "
    SELECT conname, conrelid::regclass AS table_name, confrelid::regclass AS references
    FROM pg_constraint
    WHERE contype = 'f'
      AND conrelid IN (
        'FieldsMembership'::regclass,
        'TraceSignalsCache'::regclass
      );
  " 2>/dev/null || true
else
  echo "  Dry run complete. Run without --dry-run to apply."
fi
