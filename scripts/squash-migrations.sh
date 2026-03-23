#!/usr/bin/env bash
# =============================================================================
# squash-migrations.sh — Replace 74 individual migrations with a single baseline
# =============================================================================
#
# WHAT THIS DOES:
#   1. Backs up existing migrations to prisma/migrations_backup_YYYYMMDD/
#   2. Removes all 20260* migration folders
#   3. Keeps only 00000000000000_baseline/ and migration_lock.toml
#   4. After running this, `npx prisma migrate dev` should replay cleanly
#
# FOR THE LIVE DATABASE:
#   After running this script, you'll need to mark the baseline as "already applied"
#   on your Neon production database:
#
#     npx prisma migrate resolve --applied 00000000000000_baseline
#
#   This tells Prisma "this migration is already reflected in the live DB, don't re-run it."
#
# USAGE:
#   cd your-project-root
#   chmod +x scripts/squash-migrations.sh
#   ./scripts/squash-migrations.sh
#
# =============================================================================

set -euo pipefail

MIGRATIONS_DIR="prisma/migrations"
BACKUP_DIR="prisma/migrations_backup_$(date +%Y%m%d_%H%M%S)"

echo "=== Saiko Maps Migration Squash ==="
echo ""

# Verify we're in the right directory
if [ ! -f "prisma/schema.prisma" ]; then
  echo "ERROR: prisma/schema.prisma not found. Run this from the project root."
  exit 1
fi

# Verify the baseline exists
if [ ! -f "$MIGRATIONS_DIR/00000000000000_baseline/migration.sql" ]; then
  echo "ERROR: 00000000000000_baseline/migration.sql not found."
  echo "Make sure the baseline migration has been created first."
  exit 1
fi

# Count existing migrations
OLD_COUNT=$(ls -d "$MIGRATIONS_DIR"/20260* 2>/dev/null | wc -l | tr -d ' ')
echo "Found $OLD_COUNT old migration folders to remove."

# Backup
echo "Backing up to $BACKUP_DIR ..."
mkdir -p "$BACKUP_DIR"
for dir in "$MIGRATIONS_DIR"/20260*; do
  if [ -d "$dir" ]; then
    cp -r "$dir" "$BACKUP_DIR/"
  fi
done
echo "Backup complete: $BACKUP_DIR"

# Remove old migrations
echo "Removing old migration folders..."
for dir in "$MIGRATIONS_DIR"/20260*; do
  if [ -d "$dir" ]; then
    rm -rf "$dir"
  fi
done

REMAINING=$(ls -d "$MIGRATIONS_DIR"/20260* 2>/dev/null | wc -l | tr -d ' ')
if [ "$REMAINING" -gt 0 ]; then
  echo "WARNING: $REMAINING old migration folders could not be removed."
  exit 1
fi

echo ""
echo "=== Migration squash complete ==="
echo ""
echo "Remaining migrations:"
ls "$MIGRATIONS_DIR"/
echo ""
echo "Next steps:"
echo "  1. Run: npx prisma migrate dev"
echo "     (This replays the baseline on the shadow DB to verify it matches schema.prisma)"
echo ""
echo "  2. For your live Neon database, mark the baseline as already applied:"
echo "     npx prisma migrate resolve --applied 00000000000000_baseline"
echo ""
echo "  3. Verify: npx prisma migrate status"
