# Image QA Production Release Process

This process is mandatory for Image QA changes.

## Release Rules

1. Ship from PRs only. No direct production deploy from dirty local state.
2. Scope each PR to one vertical (for example, Layer 1 ingestion only).
3. Merge to `main` first, then deploy production from `main`.
4. Do not call a task complete until production checks pass.

## Required Steps Per Release

1. **Branch and scope**
   - Create or use a scoped branch.
   - Stage only files for the Image QA change.

2. **Pre-merge checks**
   - Run:
     - `node scripts/check-schema.js`
     - `npx prisma generate`
     - `npm run typecheck`
   - If ingestion scripts changed, run dry-runs with a small batch.

3. **Database change path**
   - If `prisma migrate dev` is blocked by drift, apply additive SQL via `prisma db execute`.
   - Record the SQL file in `scripts/sql/` with a clear name.

4. **Commit and PR**
   - Commit scoped files only.
   - Push branch.
   - Open PR to `main` with:
     - Summary
     - DB changes
     - Validation output
     - Rollback notes

5. **Production deploy**
   - Deploy production from merged `main`.
   - Run production checks:
     - `/api/health` is OK
     - DB connectivity is OK
     - Feature-specific smoke checks pass

6. **Post-deploy verification**
   - For Image QA ingestion:
     - Confirm row counts in `place_photos` by source.
     - Confirm `MISSING_DIM` appears for Instagram rows with null dimensions.
   - Only then mark release complete.

## Definition of Complete

A release is complete only when:

- merged to `main`
- deployed to production
- production checks passed
- post-deploy data checks passed
