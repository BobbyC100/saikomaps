---
doc_id: SCRIPTS-SQL-GPID-ROLLOUT
doc_type: runbook
status: active
owner: Bobby Ciccaglione
created: '2026-02-27'
last_updated: '2026-03-14'
project_id: SAIKO
summary: >-
  Rollout runbook for the GPID partial unique index — preflight duplicate check,
  CONCURRENTLY index creation for production, dev migration path, and verification
  queries. Prevents duplicate google_place_id rows in places table.
systems:
  - identity
  - data-pipeline
related_docs:
  - scripts/sql/README.md
  - docs/DATABASE_SCHEMA.md
category: operations
tags: [identity, schema, migration, pipeline]
source: repo
---

# GPID partial unique index — rollout

**Goal:** DB-level guardrail so we never have two `places` rows with the same non-empty `google_place_id`. Many rows may have NULL or blank.

**Index name:** `places_google_place_id_unique_nonempty`

## Rollout (safe, no broken deploys)

1. **Preflight** — Run step 1 in `gpid-unique-preflight-and-rollout.sql`:
   - If it returns **rows**: you have duplicates. Run step 2 (list duplicate rows), remediate (e.g. set one row’s `google_place_id` to NULL or correct GPID), then re-run step 1 until it returns 0 rows.
   - If it returns **0 rows**: safe to apply the index.

2. **Apply the index**
   - **Production / live DB:** Run step 3 in `gpid-unique-preflight-and-rollout.sql` **manually** (e.g. Neon SQL editor or `psql`). That uses `CREATE UNIQUE INDEX CONCURRENTLY`, which cannot run inside a transaction. This avoids long table locks.
   - **Dev / small DB:** You can use `npx prisma migrate deploy`; the migration `20260227100000_gpid_unique_nonempty` creates the same index without `CONCURRENTLY` inside the migration transaction.

3. **Verify** — Use the verification queries at the bottom of `gpid-unique-preflight-and-rollout.sql`.

## CONCURRENTLY

Use **CONCURRENTLY** on prod-like DBs so the index is built without blocking writes. It must be run **outside** a transaction (Prisma runs migrations in a transaction, so the migration uses the non-CONCURRENTLY version for compatibility).
