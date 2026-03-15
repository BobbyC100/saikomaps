---
doc_id: SCRIPTS-SQL-README
doc_type: reference
status: active
owner: Bobby Ciccaglione
created: '2026-02-15'
last_updated: '2026-03-14'
project_id: SAIKO
summary: >-
  Index of ad-hoc SQL scripts for backfills, verification, and rollout —
  Phase 2 field verification, confidence_bucket backfill, with Neon console
  and CLI execution instructions.
systems:
  - data-pipeline
  - identity
related_docs:
  - scripts/sql/README-gpid-rollout.md
  - docs/DATABASE_SCHEMA.md
category: engineering
tags: [schema, migration, pipeline, identity]
source: repo
---

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
