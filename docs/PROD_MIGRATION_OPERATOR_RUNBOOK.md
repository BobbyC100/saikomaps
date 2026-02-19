# Production Migration Operator Runbook

**Golden-First Rollout — Recovery + Deploy**

**Goal:** Clear failed migration and successfully run `migrate deploy`  
**Time:** ~5–10 minutes  
**Mode:** Execute, don’t improvise

**One-file wrapper (optional):** After preflight, you can run `./scripts/prod-migrate-recover-and-deploy.sh` to automate Steps 1–4. It stops on any error (`set -euo pipefail`).

---

## 🔒 Preflight (Do Not Skip)

- [ ] Confirm `DATABASE_URL` points to production
- [ ] Confirm you are on correct git commit
- [ ] Confirm no active Vercel deploy running
- [ ] Confirm no concurrent migration attempt

---

## Step 1 — Inspect Failed Migration

Run (`--schema` required so Prisma finds the schema):

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

Copy the output.

---

## Step 2 — Check Table Existence

```bash
npx prisma db execute --schema=prisma/schema.prisma --stdin <<'SQL'
SELECT to_regclass('public.password_reset_tokens') AS password_reset_tokens_table;
SQL
```

**Interpret result:**

- `password_reset_tokens` (or `public.password_reset_tokens`) → table exists
- empty / `null` → table does not exist

**Exact resolve command** (matches folder; run only after Step 2):  
`npx prisma migrate resolve --applied 20260217000000_add_password_reset_tokens`  
(See **`docs/P3009_RECOVERY_SNIPPET.md`** for full context.)

---

## Step 3 — Resolve

**If table exists:**

```bash
npx prisma migrate resolve --applied 20260217000000_add_password_reset_tokens
```

**If table does NOT exist:**

```bash
npx prisma migrate resolve --rolled-back 20260217000000_add_password_reset_tokens
```

---

## Step 4 — Deploy Remaining Migrations

```bash
npx prisma migrate deploy
```

**Expected outcome:**

- No P3009 error
- Remaining migrations apply successfully

---

## Step 5 — Verify Schema

Confirm golden-first fields exist:

```bash
npx prisma db pull
```

Confirm:

- `golden_records` has new fields (e.g. `confidence`, `promotion_status`)
- `resolution_links` table exists
- `raw_records` has new fields (e.g. `intake_batch_id`, `source_type`, `imported_at`)

---

## 🚨 STOP CONDITIONS

**Do NOT proceed to intake if:**

- `migrate deploy` fails again
- Any unexpected SQL errors appear
- Migration status still shows failed state

Escalate before continuing.

---

## Step 6 — Handoff

Once deploy succeeds:

**Proceed to:** `docs/GOLDEN_FIRST_POST_DEPLOY_CHECKLIST.md`

**Order:**

1. Intake
2. Resolve
3. Sanity-check
4. Promotion dry-run
5. Promotion commit (only if safe)

---

## Why This Exists

To eliminate:

- Guesswork
- Improvised commands
- Production risk
- Migration drift

Follow it exactly.

---

*This keeps your system behaving like a data company, not a startup guessing in prod.*

*If you want to tighten even further, we can add a one-line shell wrapper that automates Steps 1–4 and refuses to continue unless conditions pass.*
