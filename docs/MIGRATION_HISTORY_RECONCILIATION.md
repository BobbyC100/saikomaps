---
doc_id: SAIKO-MIGRATION-HISTORY-RECONCILIATION
doc_type: guide
status: active
owner: Bobby Ciccaglione
created: '2026-03-10'
last_updated: '2026-03-10'
project_id: SAIKO
systems:
  - database
summary: ''
---
# Migration History Reconciliation Analysis

**Status:** Analysis Only — No Changes Applied  
**Date:** 2026-03-09  
**Analyst:** Cursor (Cortez)  
**Input:** Confirmed facts from `prisma migrate status`, `_prisma_migrations` direct query, repo inspection

---

## 1. Executive Summary

The local migration folder and the database migration history have forked. This is not catastrophic, but it is a structural risk that must be understood before any further migrations are applied.

**What happened in plain English:**

Between approximately 2026-02-20 and 2026-03-03, seven migrations were applied directly to the database without corresponding files being committed to the local repo. These were either applied via `psql` directly, or from a branch that was never merged. The local repo continued generating migrations without knowing the DB had diverged. The two histories interleave chronologically but do not share the same set of entries.

**The current risk:**

1. `prisma migrate deploy` cannot be trusted in this state. It will attempt to apply local migrations in order, but those migrations may conflict with changes already present in the DB (or may be redundant with DB-only migrations that achieved the same thing via different SQL).

2. `20260306200000_slim_entities_fields_v2` is recorded in the DB as failed/rolled-back. It is not applied. But its entry exists in `_prisma_migrations` in an error state — Prisma will detect this and may refuse to proceed without manual intervention.

3. There is at least one likely live schema mismatch: the DB-only migration `20260301000000_rename_place_id_to_entity_id_signals_overlays` may have renamed columns in `proposed_signals` and `operational_overlays` to `entity_id`, while the local Prisma schema still maps these as `place_id`. If true, Prisma queries against these tables will silently resolve to wrong column names and may produce errors in production.

4. Eight local migrations are not applied to the DB at all. Some of these depend on the DB already being in a state that the DB-only migrations may have altered differently.

**The immediate priority is: do not run `prisma migrate deploy` until the fork is understood and a reconciled baseline is established.**

---

## 2. Fork Explanation

### Where the fork began

The local migration folder's February 2026 sequence is:

```
20260220000000_v_places_la_bbox_golden_add_golden_text
20260221000000_add_saiko_fields_trace_v02
20260222120000_add_place_photo_eval
...
```

The DB-only migrations fall at:

```
20260220100000_add_website_source_confidence_updated_at   ← between local 220000 and 221000
20260220200000_add_website_source_class                   ← between local 220000 and 221000
```

This means the fork did not start at the end of local history — it started *inside* the February migration sequence. Migrations `20260220100000` and `20260220200000` were inserted between two local migrations chronologically, meaning they were applied to the DB at some point while local `20260221000000` onward was also being developed.

### The most likely mechanism (inferred, not confirmed)

**Direct psql application without local file creation.** Someone ran SQL directly against the DB (or applied a file that was never committed to the repo) at least twice in the `2026-02-20` window. The `_prisma_migrations` table was updated (either manually or via `prisma db execute`), but no corresponding `.sql` file was created under `prisma/migrations/`. This left a "phantom" migration trail in the DB that local Prisma cannot see.

This pattern then continued through March 3 — five more DB-only migrations accumulated, each applied directly or from an unmerged branch.

### Why the local migrations are not in the DB

The local migrations from `20260306100000` onward were created after the fork was already present. When `prisma migrate dev` was run to create them, it only saw local history and did not know the DB had diverged. The DB at that point had the 7 extra migrations applied, making the two histories incompatible. Running `prisma migrate status` now surfaces this incompatibility.

**Key confirmed fact that narrows this:** `20260221000000_add_saiko_fields_trace_v02` is present locally AND is in the DB applied history (it is not in either of the two mismatch lists). This means the fork point is narrow: DB-only entries `20260220100000` and `20260220200000` were applied between the last shared migration (`20260220000000`) and the next shared migration (`20260221000000`). The database accepted `20260221000000` even with the intervening DB-only migrations because Prisma migration history is strictly ordered by timestamp, not by content dependency.

---

## 3. DB-Only Migrations

These seven migrations are in the DB's `_prisma_migrations` table but have no corresponding local files.

---

### `20260220100000_add_website_source_confidence_updated_at`

**Likely purpose:** Adds `website_source`, `confidence`, and `updated_at` fields to `golden_records`. The current local Prisma schema shows `golden_records` has `website_source String?`, `website_confidence Decimal?`, and `website_updated_at DateTime?` — these fields are likely what this migration added.

**Superseded by local migration?** No. These fields exist in the schema and would have required a migration to add them. Since no local migration adds them, this DB-only migration is the source of truth for their existence.

**Recommendation:** Reconstruct as a local file. The migration content can be inferred from the schema diff, or recovered by querying the DB `_prisma_migrations` table for the applied SQL (if `applied_steps_count` is non-zero and it has a `finished_at`).

---

### `20260220200000_add_website_source_class`

**Likely purpose:** Adds `website_source_class String?` to `golden_records`. The local schema shows: `website_source_class String? // first_party | third_party | ai_inferred`. No local migration adds this field.

**Superseded by local migration?** No — same situation as above.

**Recommendation:** Reconstruct as a local file alongside `20260220100000`.

---

### `20260301000000_rename_place_id_to_entity_id_signals_overlays`

**Likely purpose:** Completes the `place_id → entity_id` rename started by `20260228100000_places_to_entities`. That migration renamed `place_id` columns in many tables but appears to have missed `proposed_signals` and `operational_overlays`.

**Active risk:** If this migration successfully ran in the DB, the columns in `proposed_signals` and `operational_overlays` are now called `entity_id` in the database. The local Prisma schema still maps both as `@map("place_id")`:

- `proposed_signals.placeId @map("place_id")` (schema line 1233)  
- `operational_overlays.placeId @map("place_id")` (schema line 1256)

If the DB renamed these columns, Prisma queries against `proposed_signals` and `operational_overlays` will try to reference `place_id` but the column is `entity_id` — causing query failures. This is a **live schema mismatch risk** that should be verified immediately with:

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name IN ('proposed_signals', 'operational_overlays')
  AND column_name IN ('place_id', 'entity_id');
```

**Superseded by local migration?** No. No local migration addresses these two tables.

**Recommendation:** Verify DB column names first. If the rename happened, create a local migration file documenting it and update the Prisma schema `@map` annotations.

---

### `20260301100000_add_launch_readiness_to_place_coverage_status`

**Likely purpose:** Adds launch-readiness tracking to `place_coverage_status`. The current schema includes `last_missing_groups Json? @map("last_missing_groups")` — this field may have been added here. Alternatively, this may have added a `is_launch_ready` boolean or a readiness score column that was later removed or not reflected in the local schema.

**Superseded by local migration?** Possibly partially — the fields it added may already be in the schema, or may have been superseded by the Fields v2 approach to readiness scoring. Cannot confirm without the migration file.

**Recommendation:** Recover the SQL from `_prisma_migrations.migration` column (Prisma stores the applied SQL), inspect it, and determine whether the fields are present in the current DB schema. If present: create a local file. If not: document as retired.

---

### `20260303000000_add_traces`

**Likely purpose:** Given `20260221000000_add_saiko_fields_trace_v02` added `FieldsMembership`, `TraceSignalsCache`, and `Actor` tables (with `IF NOT EXISTS` guards and idempotent FK adds), this March 3 migration likely adds a different traces-related concept. Candidates:

- A v1 or interim traces schema that predated v02  
- Additional fields or indexes on `TraceSignalsCache`  
- A separate `traces` table (distinct from `TraceSignalsCache`) for event logging  

The migration name `add_traces` (without a version suffix) is distinct enough from `add_saiko_fields_trace_v02` that they likely address different tables.

**Superseded by local migration?** Unknown without the file. If it adds a standalone `traces` table not present in the local schema, it is not superseded.

**Recommendation:** Recover from `_prisma_migrations`. If it creates objects not in the local schema, add a local file. If superseded, document and retire.

---

### `20260303200000_neutralize_restaurant_group_id`

**Likely purpose:** Makes `restaurant_group_id` safe to deprecate — likely removes the FK constraint from `entities.restaurant_group_id` to `restaurant_groups`, or sets a `NOT NULL` to nullable, or marks it in some way. The current schema has the deprecation comment:

```prisma
restaurantGroupId String? @map("restaurant_group_id") // DEPRECATED: use place_actor_relationships. No new writes.
```

The field is already nullable in the schema. This migration likely made the column nullable in the DB (or dropped the FK constraint) to enable the deprecation path.

**Superseded by local migration?** Possibly — the local `20260228000000_place_actor_relationships` migration and the subsequent `backfill-place-actor-relationships.ts` script handle the replacement side. The neutralization of the column itself is what this DB-only migration covers.

**Recommendation:** Verify current DB state of the `restaurant_group_id` FK constraint. If the FK is gone, reconstruct the local file documenting its removal. If the FK still exists, this migration may not have applied correctly.

---

### `20260303210000_timefold_v1_entities`

**Likely purpose:** "Timefold" is not a term used elsewhere in the local repo. This migration is the most opaque of the seven. Candidates:

- Adds time-zone or time-window fields to entities (market schedule, hours folding)  
- Adds a first version of event/appearance scheduling logic at the entity level  
- Adds a `timefold` operational concept for entities that change over time (pop-ups, temporary closures, seasonal operations)  

None of these appear in the local schema as a distinctly labeled "timefold" concept. The `marketSchedule Json?` field on entities is already present locally and scheduled for removal in the slim-entities migration. It's possible `timefold_v1_entities` added that field, or it added something else entirely.

**Recommendation:** Recover from `_prisma_migrations`. This is the highest-uncertainty DB-only migration. Do not proceed past the reconciliation phase without understanding its content.

---

## 4. Local-Only Unapplied Migrations

These are in the local `prisma/migrations/` folder but are absent from the DB's `_prisma_migrations`.

---

### `20260306300000_drop_legacy_tables_fields_v2`

**Intended:** Yes — this is the second deferred architectural gate migration (drops `golden_records`, legacy MDM tables, etc.).

**Depends on unresolved prerequisites?** Yes. Multiple: `slim_entities_fields_v2` must be applied first, all reads migrated off `golden_records`, `migrate-actor-relationships-to-entities.ts` applied, etc. See `docs/DEFERRED_MIGRATION_GATES.md`.

**Should remain pending?** Yes. This is intentionally deferred. Do not apply.

**Should be rewritten?** Not yet — but if the DB-only migrations introduced schema changes that this migration assumes, it may need updating. Assess after DB-only migrations are recovered.

---

### `20260307000000_rewire_fieldsmembership_to_entities`

**Intended:** Yes — explicitly rewires `FieldsMembership` FK from `golden_records` to `entities`.

**Complication:** Migration `20260221000000_add_saiko_fields_trace_v02` already includes an idempotent `ADD CONSTRAINT` block that adds `FieldsMembership_entity_id_fkey → entities.id`. If that block successfully executed in the DB (because no FK existed at creation time), then `20260307000000` is redundant — the DB already has the correct FK. If the `20260221000000` block silently failed (because a golden_records FK was already present at that time), then `20260307000000` is still needed.

**Safest approach before applying:** Run the verification query:
```sql
SELECT conname, confrelid::regclass AS referenced_table
FROM pg_constraint
WHERE conname = 'FieldsMembership_entity_id_fkey';
```
If it shows `entities`, this migration is a no-op and can be marked applied without running. If it shows `golden_records`, it must be applied (safe DDL).

---

### `20260307000001_rewire_tracesignalscache_to_entities`

**Intended:** Yes — mirrors `20260307000000` for `TraceSignalsCache`.

**Same complication and recommendation as above.** Verify:
```sql
SELECT conname, confrelid::regclass AS referenced_table
FROM pg_constraint
WHERE conname = 'TraceSignalsCache_entity_id_fkey';
```

---

### `20260307000003_add_merchant_surface_scans`

**Intended:** Yes — adds `merchant_surface_scans` table, which is present in the local Prisma schema and actively used by enrichment scripts.

**Depends on prerequisites?** Only that `entities` exists (it does). This migration is safe and self-contained.

**Should remain pending?** Yes, in the sense that it hasn't been applied to DB. But it SHOULD be applied (after migration history is reconciled) — the table it creates is in active use by local scripts.

**Risk:** If the DB already has `merchant_surface_scans` from some other path (e.g., applied manually), running this migration will fail with "table already exists."

---

### `20260307000004_add_menu_fetches`

**Same situation as above** for `menu_fetches` table. Both tables are schema-present and script-active. Safe to apply once history is reconciled and DB state verified.

---

### `20260307000005_add_menu_fetches_pdf_fields`

**Intended:** Yes — adds PDF-specific fields to `menu_fetches`. Depends on `20260307000004` being applied first.

---

### `20260307000006_add_identity_enrichment`

**Intended:** Yes — adds `identity_enrichment_runs` table (used by the review queue system, present in local schema).

---

### `20260308000000_add_merchant_surfaces` and `20260309000000_add_merchant_surface_artifacts`

**Intended:** Yes — add the `merchant_surfaces` and `merchant_surface_artifacts` tables, both present in local schema and actively used.

**Note:** Three of these are new table creations (`merchant_surface_scans`, `merchant_surfaces`, `merchant_surface_artifacts`) and four are additive changes. All are safe to apply in isolation assuming prior history is clean. The question is whether any of the DB-only migrations created conflicting or overlapping tables.

---

## 5. slim_entities_fields_v2 Rollback Analysis

### What the migration file shows

`20260306200000_slim_entities_fields_v2/migration.sql` uses four `ALTER TABLE entities DROP COLUMN IF EXISTS ...` blocks. It is labeled at the top as a DEFERRED migration with explicit "do not apply until" conditions. It was designed to be applied manually via `psql`.

Despite this label, it appears in the DB's `_prisma_migrations` as failed/rolled-back multiple times. This means it was attempted — possibly via `prisma migrate deploy` or `prisma migrate dev` — more than once, each time failing and being rolled back.

### Most likely cause of rollback

**PostgreSQL will reject `ALTER TABLE ... DROP COLUMN` if any view depends on that column.** The migration does not include `DROP VIEW` statements before the column drops.

From earlier analysis:

- `v_places_la_bbox` — selects approximately 35 columns from `entities` including `name`, `address`, `latitude`, `longitude`, `description`, `tagline`, and all the fields being dropped
- `v_entity_launch_readiness_v0` — also selects multiple columns from `entities` that are being dropped

If either of these views existed in the DB at migration time, PostgreSQL would raise:

```
ERROR: cannot drop column <column> of table entities because other objects depend on it
DETAIL: view v_places_la_bbox depends on column <column> of table entities
HINT: Use DROP ... CASCADE to drop the dependent objects too.
```

This causes the entire transaction to roll back. Prisma records a failed migration.

**Secondary possible cause:** The migration was attempted before `canonical_entity_state` was populated, but that would not cause a DB error — it would only cause data loss (product pages breaking). The view dependency is the only thing that would cause an automatic rollback at the DB level.

**Confirmed prerequisite failure:** The migration header states explicit prerequisites including "canonical_entity_state is fully populated." That gate was not checked (or not met) before the migration was attempted.

### Should it be retried, replaced, or retired?

**Recommendation: retained, but its DB error state must be resolved before any further migrate commands.**

The migration's intent is correct and the architecture it implements is the target state. It should not be retired. However:

1. The error state in `_prisma_migrations` must be cleared before Prisma will allow further migration deploys. This requires either running `prisma migrate resolve --rolled-back <migration-name>` or marking it as manually applied if it did succeed at some point.

2. Before retrying, `v_places_la_bbox` and `v_entity_launch_readiness_v0` must be explicitly dropped (via a preparatory migration or manual SQL).

3. All gate conditions in `docs/DEFERRED_MIGRATION_GATES.md` must be satisfied before retry.

---

## 6. Recommended Source of Truth

### Recommendation: the DB is the source of truth for applied state; the local schema is the source of truth for intended state — but they need reconciliation before either can be trusted fully.

**Rationale:**

- The DB has successfully applied migrations (including the 7 DB-only ones) that represent real structural decisions made during development. These cannot be ignored.
- The local Prisma schema accurately reflects the intended final architecture (Fields v2 four-layer model). It was not created with knowledge of the DB-only migrations, but those migrations are additive (adding fields and renaming columns) rather than contradictory to the local schema's intent.
- A `prisma db pull` to regenerate the schema from the DB would capture the DB-only migrations' effects, but would also capture the rolled-back state of `slim_entities_fields_v2` (i.e., `entities` still has all its data columns) — which is correct for the current moment.

**What to NOT do:** Do not treat the local migration folder as the authoritative history and attempt to make the DB conform to it via force-apply. The DB has data and structures built on top of the 7 DB-only migrations. Applying conflicting migrations on top of them is unsafe.

**What to do:** Create a reconciled baseline — a new set of local migration files that reflects the DB's actual applied history, then bring the local-only unapplied migrations forward from there.

---

## 7. Safe Path Forward

This is sequencing only. No implementation yet.

### Phase 1: Understand DB reality (before any migration commands)

**1a.** Query `_prisma_migrations` for each DB-only migration's content:
```sql
SELECT migration_name, applied_steps_count, finished_at, logs
FROM _prisma_migrations
WHERE migration_name IN (
  '20260220100000_add_website_source_confidence_updated_at',
  '20260220200000_add_website_source_class',
  '20260301000000_rename_place_id_to_entity_id_signals_overlays',
  '20260301100000_add_launch_readiness_to_place_coverage_status',
  '20260303000000_add_traces',
  '20260303200000_neutralize_restaurant_group_id',
  '20260303210000_timefold_v1_entities'
)
ORDER BY migration_name;
```

Confirm each has `finished_at IS NOT NULL` and `applied_steps_count > 0` (i.e., they actually ran successfully).

**1b.** Verify the `proposed_signals` and `operational_overlays` column name issue:
```sql
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_name IN ('proposed_signals', 'operational_overlays')
  AND column_name IN ('place_id', 'entity_id');
```

**1c.** Verify FK targets for `FieldsMembership` and `TraceSignalsCache`:
```sql
SELECT conname, confrelid::regclass AS referenced_table
FROM pg_constraint
WHERE conname IN (
  'FieldsMembership_entity_id_fkey',
  'TraceSignalsCache_entity_id_fkey'
);
```

**1d.** Confirm the `slim_entities_fields_v2` error state:
```sql
SELECT migration_name, applied_steps_count, finished_at, logs, rolled_back_at
FROM _prisma_migrations
WHERE migration_name LIKE '%slim_entities%';
```

---

### Phase 2: Resolve the slim_entities_fields_v2 error state

The rolled-back migration entry in `_prisma_migrations` will block `prisma migrate deploy`. It must be resolved before any other migrations can be applied via Prisma.

**2a.** Run:
```bash
npx prisma migrate resolve --rolled-back 20260306200000_slim_entities_fields_v2
```

This tells Prisma to treat the migration as "rolled back / not applied." The migration remains in the folder and can be retried later when prerequisites are met. This does NOT apply the migration — it only clears the error state.

---

### Phase 3: Create local files for DB-only migrations

For each of the 7 DB-only migrations: recover the SQL from `_prisma_migrations.migration` column (if stored — some Prisma versions store applied SQL, some don't), then create matching local files. If SQL is not stored, reconstruct from schema diffs.

**Order to create them in:**
```
20260220100000_add_website_source_confidence_updated_at
20260220200000_add_website_source_class
20260301000000_rename_place_id_to_entity_id_signals_overlays
20260301100000_add_launch_readiness_to_place_coverage_status
20260303000000_add_traces
20260303200000_neutralize_restaurant_group_id
20260303210000_timefold_v1_entities
```

After creating each file, run:
```bash
npx prisma migrate resolve --applied <migration_name>
```

This tells Prisma to register these as applied without running them (since they're already in the DB).

---

### Phase 4: Verify the rewire migrations (20260307000000, 20260307000001)

After Phase 1c confirms FK targets:

- If `FieldsMembership` → `entities`: mark `20260307000000` as applied (`prisma migrate resolve --applied`)
- If `FieldsMembership` → `golden_records`: apply `20260307000000` normally  
- Same logic for `TraceSignalsCache` / `20260307000001`

---

### Phase 5: Apply the remaining safe local-only migrations

Once migration history is clean and `prisma migrate status` shows no drift, apply in order:

```
20260307000003_add_merchant_surface_scans
20260307000004_add_menu_fetches
20260307000005_add_menu_fetches_pdf_fields
20260307000006_add_identity_enrichment
20260308000000_add_merchant_surfaces
20260309000000_add_merchant_surface_artifacts
```

Verify each with `prisma migrate status` between applies during initial stabilization.

---

### Phase 6: Return to deferred migration prerequisites

Only after Phase 5 is complete and `prisma migrate status` shows a clean history:

- Satisfy Gate 1 prerequisites (see `docs/DEFERRED_MIGRATION_GATES.md`)
- Drop the dependent views
- Retry `20260306200000_slim_entities_fields_v2`
- Proceed to Gate 2 prerequisites
- Apply `20260306300000_drop_legacy_tables_fields_v2`

---

## 8. Immediate Do / Do Not Do

### DO NOT do right now

| Action | Why |
|---|---|
| Run `prisma migrate deploy` | Will attempt to apply local-only migrations in an unknown order against a DB that may conflict |
| Run `prisma migrate dev` | May create new migrations based on schema drift that compound the confusion |
| Apply `20260306200000_slim_entities_fields_v2` manually via psql | The error state must be cleared first; views must be dropped first; prerequisites must be met |
| Apply `20260306300000_drop_legacy_tables_fields_v2` | Gate 1 is not satisfied; would permanently drop golden_records before migration history is clean |
| Delete or modify any migration file | Migration files are the audit trail; altering them creates additional inconsistency |
| Run `prisma db push` | Would attempt to make the DB conform to the local schema and destroy the DB-only migration work |
| Apply `20260307000000` or `20260307000001` | Not until Phase 1c confirms whether they're needed or redundant |

### DO (in order)

1. **First:** Run Phase 1 queries against the DB and capture results. This is read-only and establishes ground truth.

2. **Second:** Verify the `proposed_signals`/`operational_overlays` column name issue (Phase 1b). If `entity_id` exists in DB but schema says `place_id`, this is a live production risk requiring immediate local schema update.

3. **Third:** Run `prisma migrate resolve --rolled-back 20260306200000_slim_entities_fields_v2` to clear the error state and unblock Prisma.

4. **Fourth:** Begin Phase 3 — create local migration files for the 7 DB-only migrations and register them as applied.

5. **Fifth:** Once history is clean, proceed with Phase 4 and 5.

The deferred architectural migrations (slim-entities, drop-legacy-tables) should not be retried until the migration history fork is fully resolved.

---

## Appendix: Migration Timeline (Confirmed)

```
LOCAL ONLY                DB ONLY                     SHARED (both)
─────────────────────────────────────────────────────────────────
                                                       ... through 20260220000000
           20260220100000_add_website_source_*         ← DB-only (between local 220000 and 221000)
           20260220200000_add_website_source_class      ← DB-only
                                                       20260221000000_add_saiko_fields_trace_v02
                                                       20260222120000 through 20260231000000
           20260301000000_rename_place_id_*             ← DB-only
           20260301100000_add_launch_readiness_*        ← DB-only
           20260303000000_add_traces                    ← DB-only
           20260303200000_neutralize_restaurant_group   ← DB-only
           20260303210000_timefold_v1_entities          ← DB-only
                                                       20260305000000 through 20260306100000
                          [slim_entities: ROLLED BACK] 20260306200000 (error state in DB)
20260306300000 (local, never applied)
20260307000000 (local, never applied) ─── FK may already be correct in DB
20260307000001 (local, never applied) ─── FK may already be correct in DB
20260307000003 through 20260309000000 (local, never applied)
```

---

*This document is analysis only. No schema changes, migrations, or data modifications were made during its production.*
