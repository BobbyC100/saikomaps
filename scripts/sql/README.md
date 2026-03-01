# SQL Scripts

Ad-hoc SQL for backfills, verification, and rollout.

## Phase 2 Lock — verification and backfill

### Verify Phase 2 fields

Confirms `OperatorPlaceCandidate` audit columns (`reviewed_at`, `approved_by`, `confidence_bucket`, `match_score`) and `place_job_log` table exist. Includes quick counts by `confidence_bucket`.

- **Neon:** Paste contents of `verify-phase2-fields.sql` into Neon SQL console.
- **CLI:** `npx prisma db execute --file scripts/sql/verify-phase2-fields.sql`

### Backfill confidence_bucket

One-time backfill for existing PENDING candidates that have `confidence_bucket = NULL`.

- **Neon:** Paste contents of `backfill-confidence-bucket.sql` into Neon SQL console.
- **CLI:** `npx prisma db execute --file scripts/sql/backfill-confidence-bucket.sql`
