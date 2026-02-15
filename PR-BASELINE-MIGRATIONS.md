# PR: Fix: Resolve Prisma database drift with baseline migration

**Branch:** `db/baseline-migrations` → `main`  
**Create PR at:** https://github.com/BobbyC100/saikomaps/pull/new/db/baseline-migrations

---

## Title

```
Fix: Resolve Prisma database drift with baseline migration
```

## Description

```markdown
## What

Created baseline migration to document current database schema and marked existing migrations as applied. **No database changes or data modifications were made.**

## Why

Repair drift so future schema work uses `prisma migrate dev` cleanly instead of `db push`. Previous schema changes were applied directly to the database without creating migration files, causing Prisma to detect drift and block new migrations.

## Changes

- **Created baseline migration**: `prisma/migrations/00000000000000_baseline/migration.sql` (31KB, documentation only)
- **Marked migrations as applied**: 
  - `00000000000000_baseline` - Current full schema state
  - `20260214_add_ranking_score` - Previously applied via db push
- **Updated `prisma/schema.prisma`**: Introspected from database via `prisma db pull`
- **Added documentation**:
  - `README.md` - Database Migrations policy section
  - `docs/database-drift-resolution.md` - Drift recovery guide

## Verification

✅ **Migration status clean:**
```bash
$ npx prisma migrate status
Database schema is up to date!
```

✅ **No data modifications**: Used `prisma migrate resolve --applied` (history-only, no SQL execution)

✅ **No schema changes**: Baseline documents existing state, doesn't modify it

✅ **All 13 migrations marked as applied**

## Notes

### Pre-Existing TypeScript Error (Intentionally Not Fixed)

Build currently fails with a TypeScript error in `app/(viewer)/neighborhood/[slug]/page.tsx:52`:
```
Type 'string | undefined' is not assignable to type 'string'.
Property 'category' may be undefined.
```

**This error pre-dates the baseline work** and is intentionally excluded from this PR to keep the migration fix surgical. The baseline migration only documents existing schema - it doesn't change code or types.

**This will be fixed in a separate PR** after baseline merges.

## Future Workflow

After merge, all schema changes must use:
```bash
npx prisma migrate dev --name descriptive_name
```

See updated `README.md` and `docs/database-drift-resolution.md` for details.

---

**No data loss. No schema changes. Clean migration history restored.** ✅
```

---

## After Creating PR

Once the PR is created and reviewed, merge to `main`. Then:

1. **Fix TypeScript error** (separate PR)
2. **Proceed with Markets integration** on clean foundation
