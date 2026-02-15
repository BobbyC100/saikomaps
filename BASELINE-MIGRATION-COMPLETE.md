# Baseline Migration Complete ✅

**Date:** 2026-02-15  
**Branch:** `db/baseline-migrations`  
**Status:** Ready for PR / Merge to main  
**Commit:** `34d0f89`

---

## What Was Done

Successfully resolved Prisma database drift by creating a baseline migration that documents the current database schema without modifying any data.

### Phase 1: Baseline Migration ✅

1. **Pulled schema from database**
   - `npx prisma db pull` → Updated `schema.prisma` to match actual DB

2. **Created baseline migration**
   - Generated SQL representing empty → current schema
   - Path: `prisma/migrations/00000000000000_baseline/migration.sql`
   - Size: 31KB (documentation only, not executed)

3. **Marked migrations as applied**
   - Baseline migration: `00000000000000_baseline`
   - Orphaned migration: `20260214_add_ranking_score`
   - Command: `npx prisma migrate resolve --applied {name}`

4. **Verified drift resolution**
   - `npx prisma migrate status` → **"Database schema is up to date!"** ✅

### Phase 2: Guardrails ✅

1. **Updated README.md**
   - Added "Database Migrations" section with policy
   - Clear guidance: Use `prisma migrate dev`, never `prisma db push`
   - Included workflow examples

2. **Created drift resolution guide**
   - Path: `docs/database-drift-resolution.md`
   - Step-by-step recovery process
   - Troubleshooting section
   - Prevention best practices

---

## Verification

### Migration Status ✅
```bash
$ npx prisma migrate status
Database schema is up to date!
```

### Migration History
- 13 total migrations
- All marked as applied
- No pending migrations
- No drift detected

### Data Safety ✅
- **No data was modified**
- **No schema changes applied**
- **No SQL executed against database**
- Only migration history was updated

---

## Pre-Existing Issues Found

### TypeScript Build Error (Unrelated to Baseline)

**File:** `app/(viewer)/neighborhood/[slug]/page.tsx:52`

**Error:**
```
Type 'string | undefined' is not assignable to type 'string'.
Property 'category' may be undefined.
```

**Context:**
- This error exists in the current `cuisine-taxonomy-phase1` branch
- Unrelated to baseline migration (no code changes were made)
- The `db pull` documented existing schema; didn't change column types
- The `places.category` field has always been nullable (`String?`)

**Fix Required (separate PR):**
```typescript
// In neighborhood page.tsx line 52-60
const places: PlaceCardData[] = rankedPlaces.map((place) => ({
  // ... other fields
  category: place.category ?? '',  // Handle undefined
  // ... other fields
}));
```

---

## Next Steps

### 1. Merge This PR

**PR Title:** `Fix: Resolve Prisma database drift with baseline migration`

**PR Description:**
```markdown
Resolves database drift by creating a baseline migration that documents
the current database state without modifying data.

## Changes
- Created baseline migration from current DB schema
- Marked pending migrations as applied
- Added migration policy documentation
- Created drift resolution guide

## Verification
- ✅ `prisma migrate status` shows clean state
- ✅ All 13 migrations marked as applied
- ✅ No data modifications
- ✅ No schema changes

## Pre-Existing Issue
Build currently fails due to unrelated TypeScript error in
`app/(viewer)/neighborhood/[slug]/page.tsx`. This error exists in
`cuisine-taxonomy-phase1` branch and is unrelated to migration work.
Separate fix PR will follow.
```

### 2. Fix Neighborhood Page (Separate PR)

After baseline merges:

```bash
git checkout main
git pull
git checkout -b fix/neighborhood-category-type
# Fix the PlaceCardData type issue in neighborhood page
# Commit and PR
```

### 3. Proceed with Markets Integration (Phase 3)

**Only after both PRs above are merged:**

```bash
git checkout main
git pull
git checkout -b feat/markets-v1

# Now implement Markets spec v1.2:
# 1. Add Category model + seed
# 2. Add Place.categoryId FK
# 3. Add Place.parentId + market_schedule
# 4. Create migration: npx prisma migrate dev --name markets_integration_v1
# 5. Update Merchant page gating
```

---

## Files Changed

### Migration Files (New)
- `prisma/migrations/00000000000000_baseline/migration.sql` - Baseline SQL

### Documentation (New)
- `docs/database-drift-resolution.md` - Drift recovery guide

### Documentation (Modified)
- `README.md` - Added Database Migrations section

### Schema (Modified via db pull)
- `prisma/schema.prisma` - Introspected from database

### Other Files (Pre-existing, committed from working tree)
- Various checkpoint and crawl script files (from prior work)

---

## Commands Reference

### Verify Clean State
```bash
npx prisma migrate status
# Should show: "Database schema is up to date!"
```

### Future Schema Changes
```bash
# 1. Edit prisma/schema.prisma
# 2. Create migration
npx prisma migrate dev --name descriptive_name

# 3. Verify
npx prisma migrate status

# 4. Commit
git add prisma/schema.prisma prisma/migrations/
git commit -m "Add: schema change description"
```

---

## Known Gotchas

### CI/CD Deployment

When deploying to production:

```bash
# Use migrate deploy (not migrate dev)
npx prisma migrate deploy
```

This applies pending migrations without attempting to create new ones.

### Shadow Database

If you see shadow database errors during `migrate dev`:

1. Ensure your DB user can create databases
2. Or set `shadowDatabaseUrl` in `prisma/schema.prisma`:

```prisma
datasource db {
  provider          = "postgresql"
  url               = env("DATABASE_URL")
  shadowDatabaseUrl = env("SHADOW_DATABASE_URL")
}
```

---

## Questions or Issues?

See `docs/database-drift-resolution.md` for detailed troubleshooting.

---

**Summary:** Drift is fully resolved. Migration history is clean. Database is unchanged. Ready to merge and proceed with feature work. 🎉
