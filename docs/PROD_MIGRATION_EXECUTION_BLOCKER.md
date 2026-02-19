# Production Migration Execution Blocker

**Status:** Awaiting Resolution  
**Environment:** Production (Neon via Vercel)  
**Blocking Migration:** `20260217000000_add_password_reset_tokens`  
**Error Code:** P3009

---

## Current State

`prisma migrate deploy` fails with:

```
Error: P3009
migrate found failed migrations in the target database.
The `20260217000000_add_password_reset_tokens` migration ... failed
```

New migrations cannot apply until this is reconciled.

**Pending migrations:**

- `20260217100000_add_energy_formality_scoring`
- `20260217200000_golden_first_intake`

Golden-first ingestion cannot proceed until migration state is clean.

---

## Objective

Reconcile the failed migration in `_prisma_migrations` safely in production, **without**:

- Resetting the database
- Using `db push`
- Deleting migration history manually

---

## Required Steps

### 1️⃣ Inspect Failed Migration Record

Run (`--schema` or `--url` required):

```bash
npx prisma db execute --schema=prisma/schema.prisma --stdin <<'SQL'
SELECT
  migration_name,
  started_at,
  finished_at,
  rolled_back_at,
  applied_steps_count,
  logs
FROM "_prisma_migrations"
WHERE migration_name = '20260217000000_add_password_reset_tokens';
SQL
```

**Capture:**

- `logs`
- `applied_steps_count`
- whether `finished_at` or `rolled_back_at` is null

---

### 2️⃣ Inspect Actual Schema State

Check whether table exists:

```bash
npx prisma db execute --schema=prisma/schema.prisma --stdin <<'SQL'
SELECT to_regclass('public.password_reset_tokens') AS password_reset_tokens_table;
SQL
```

**Interpretation:**

| Result | Meaning |
|--------|---------|
| `password_reset_tokens` | Table exists |
| `null` | Table does not exist |

---

**Pasteable analysis:** See **`docs/P3009_RECOVERY_SNIPPET.md`** for what this migration creates, the likely failure point, and the exact `migrate resolve` command.

---

## Resolution Decision Tree

### Case A — Table Exists

The migration likely failed because it attempted to create an already-existing object.

**Mark migration as applied:**

```bash
npx prisma migrate resolve --applied 20260217000000_add_password_reset_tokens
```

**Then run:**

```bash
npx prisma migrate deploy
```

---

### Case B — Table Does Not Exist

Migration genuinely failed before applying.

**Mark migration as rolled back:**

```bash
npx prisma migrate resolve --rolled-back 20260217000000_add_password_reset_tokens
```

Then re-run:

```bash
npx prisma migrate deploy
```

If deploy fails again:

- Review logs
- Inspect migration SQL
- Correct issue before retry

---

## Success Criteria

- `npx prisma migrate deploy` completes without P3009
- `20260217100000_add_energy_formality_scoring` applied
- `20260217200000_golden_first_intake` applied
- New schema fields exist in production DB

**Only after this is complete** may intake/resolver execution proceed.

---

## Explicit Non-Actions

**Do NOT:**

- Run `prisma migrate dev` against production
- Run `prisma db push` against production
- Manually edit `_prisma_migrations`
- Reset the database

---

## Next Phase (Once Unblocked)

Follow:

**`docs/GOLDEN_FIRST_POST_DEPLOY_CHECKLIST.md`**

Order:

1. Intake
2. Resolve
3. Sanity-check
4. Promotion dry run

No promotion with `--commit` until checklist passes.

---

*This is now a self-contained execution doc.*

*If you want, I can also create a short "Operator Run Script" version that Cursor can literally follow step-by-step without thinking.*
