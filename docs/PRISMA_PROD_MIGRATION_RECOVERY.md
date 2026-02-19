# Prisma Production Migration Recovery

**Context:** Golden-First Intake Rollout  
**Environment:** Production (Neon via Vercel)  
**Date:** Feb 17, 2026

---

> **Preflight Checklist**  
> Before running any command:
>
> - [ ] Confirm `DATABASE_URL` points to production
> - [ ] Confirm you are on the intended git commit
> - [ ] Confirm no deploy is currently running on Vercel
>
> Production mistakes almost always happen above the migration layer.

---

## Situation

`prisma migrate deploy` is blocked with:

```
Error: P3009

migrate found failed migrations in the target database.
The `20260217000000_add_password_reset_tokens` migration started at ... failed
```

Prisma refuses to apply new migrations when a previous migration is marked as failed in `_prisma_migrations`.

**Pending migrations:**

- `20260217100000_add_energy_formality_scoring`
- `20260217200000_golden_first_intake`

We must reconcile the failed migration before proceeding.

---

## Why This Happens

Prisma tracks migration state in `_prisma_migrations`.

If:

- A migration partially ran
- A table already existed
- A manual DB change occurred
- Or a migration errored mid-flight

Prisma records it as **failed** and blocks further deploys.

This is expected safety behavior.

---

## Resolution Strategy

We **do not** use `prisma db push` on production.

We use **`prisma migrate resolve`** to reconcile migration history with actual DB state.

---

## Step 1 — Inspect Migration State

Run (`--schema` or `--url` required so Prisma knows which DB; Prisma 6 does not return query rows from `db execute`, so you may only see "Script executed successfully."—use a DB client if you need to inspect rows):

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

Or with URL explicitly (e.g. when not in repo root):  
`npx prisma db execute --url "$DATABASE_URL" --stdin <<'SQL' ... SQL`

This shows:

- Whether it partially applied
- Any error logs

---

## Step 2 — Check Actual Schema State

Check if the table already exists:

```bash
npx prisma db execute --schema=prisma/schema.prisma --stdin <<'SQL'
SELECT to_regclass('public.password_reset_tokens') AS password_reset_tokens_table;
SQL
```

**Interpretation**

| Result | Meaning |
|--------|---------|
| `password_reset_tokens` | Table exists |
| `null` | Table does not exist |

---

## Step 3 — Resolve Based on Reality

### Case A — Table Exists (Most Common)

Migration likely failed because it tried to create an already-existing table.

**Mark as applied:**

```bash
npx prisma migrate resolve --applied 20260217000000_add_password_reset_tokens
```

**Then:**

```bash
npx prisma migrate deploy
```

This will now apply:

- `20260217100000_add_energy_formality_scoring`
- `20260217200000_golden_first_intake`

---

### Case B — Table Does Not Exist

Migration genuinely failed before applying.

**Mark as rolled back:**

```bash
npx prisma migrate resolve --rolled-back 20260217000000_add_password_reset_tokens
```

Then re-run:

```bash
npx prisma migrate deploy
```

If failure repeats, inspect the `logs` column from Step 1 and correct the SQL.

---

## Order of Operations (Critical)

1. Reconcile failed migration
2. Run `migrate deploy`
3. Verify new schema columns exist
4. **Then** run intake / resolve pipeline

**Never** deploy code that depends on new columns before migration succeeds.

---

## Guardrails

- **Never** run `prisma migrate dev` against production
- **Never** run `prisma db push` against production
- **Never** manually delete rows from `_prisma_migrations`
- **Always** reconcile with `migrate resolve`

---

## After Successful Deploy

You may run:

```bash
npm run intake -- --batch coverage_seed_v1 --source seed --file data/coverage_seed_v1.txt
npm run resolve -- --batch coverage_seed_v1
npm run promote -- --batch coverage_seed_v1 --commit --allow-places-write
```

---

## Outcome

Once resolved:

- Golden-first schema is live in production
- Migration history is consistent
- Future deploys are unblocked
- Intake pipeline can run safely

---

## How to Prevent This Again

- **Never** manually create tables in prod
- **Never** run `migrate dev` against prod
- **Always** apply migrations before deploying schema-dependent code

Future-proof for a new hire.

---

*If you want, I can also generate a short "Postmortem Note" explaining how the password_reset_tokens drift likely happened so this doesn't recur.*
