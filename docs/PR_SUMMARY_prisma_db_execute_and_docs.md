# Summary of changes

## 1) Script: `scripts/prod-migrate-recover-and-deploy.sh`

- Both `prisma db execute` calls use **`--schema=prisma/schema.prisma --stdin`** (no `--json`—Prisma 6 does not support `--json` for `db execute`).
- **Step 2 (table existence):** Prisma 6 does not return query results from `db execute`, so the script uses **psql** when available to run `SELECT to_regclass('public.password_reset_tokens')` and branch on the result. If `psql` is not in PATH, the script prints manual instructions and exits so the operator can run Step 2 from the runbook and then run the correct `migrate resolve` command.

## 2) Docs (all three)

- Every `prisma db execute` example uses **`--schema=prisma/schema.prisma --stdin`** (no `--json`).
- **PRISMA_PROD_MIGRATION_RECOVERY.md** notes that Prisma 6 may only show "Script executed successfully." and offers **`--url "$DATABASE_URL"`** as an alternative when not in repo root.

---

## Key takeaways

- Use **`--schema=prisma/schema.prisma`** (or **`--url "$DATABASE_URL"`**) to avoid the "needs either --url or --schema" error.
- Until migration **`20260217000000_add_password_reset_tokens`** is resolved, `prisma migrate deploy` will continue to fail with P3009.

**Recovery:** See **`docs/P3009_RECOVERY_SNIPPET.md`** for what the migration creates, likely failure point, and the exact `migrate resolve` command. Run the resolve command only after confirming (via runbook Step 2) whether the table exists.
