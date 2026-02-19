# P3009 recovery — pasteable snippet

**Migration:** `prisma/migrations/20260217000000_add_password_reset_tokens/migration.sql`

**Migration creates:**
- Table `password_reset_tokens` (id, user_id, token_hash, expires_at, used_at, created_at) with primary key on `id`
- Indexes: `password_reset_tokens_user_id_idx`, `password_reset_tokens_token_hash_idx`, `password_reset_tokens_expires_at_idx`
- Foreign key: `password_reset_tokens_user_id_fkey` → `users(id)` ON DELETE CASCADE

**Likely failure point:** Migration failed with `relation "password_reset_tokens" already exists` (42P07). The table (and possibly indexes/FK) were already created (e.g. by a prior partial run or manual create), so Prisma recorded the migration as failed.

---

**If table exists (most common):** Safest path is **resolve as applied** (tells Prisma “consider this migration done” so it stops blocking).

**If table does NOT exist:** Safest path is **resolve as rolled-back**, then run **`npx prisma migrate deploy`** so Prisma re-runs this migration and applies it. Do not apply the SQL manually unless deploy fails again—then inspect logs and fix before retry.

---

**Exact command (matches folder name):**

```bash
npx prisma migrate resolve --applied 20260217000000_add_password_reset_tokens
```

Run this only after you have confirmed (Step 2 in the runbook) that `public.password_reset_tokens` exists. Then run `npx prisma migrate deploy`.
