# P3009 follow-up: Find the real users table for password_reset_tokens FK

**Context:** The migration `20260217000000_add_password_reset_tokens` creates a table and an FK to `users`. The deploy failed because there is no `users` table in `public` (and no `"User"` in public). The **table** `public.password_reset_tokens` may already exist; the **FK** must point at whatever your app actually uses for auth (e.g. `auth.users`, `public.users`, etc.).

**Right now you’re not broken:** the table can work without the FK. Adding the FK is for integrity and to finish the migration cleanly.

---

## 1) Schemas in play + search_path

```bash
psql "$DATABASE_URL" -t -A -c "SHOW search_path;"
psql "$DATABASE_URL" -t -A -c "SELECT nspname FROM pg_namespace ORDER BY 1;"
```

---

## 2) Find anything that looks like a users table (any schema)

```bash
psql "$DATABASE_URL" -t -A -c "
SELECT table_schema || '.' || table_name
FROM information_schema.tables
WHERE table_type='BASE TABLE'
  AND (table_name ILIKE '%user%' OR table_name ILIKE '%account%')
ORDER BY 1;
"
```

**Expected:** One of e.g. `auth.users`, `public.users`, `public."User"`, or something like `accounts`, `members`, `app_users`.

---

## 3) Inspect password_reset_tokens (column name / type)

```bash
psql "$DATABASE_URL" -c "\d public.password_reset_tokens"
```

So we know the exact column name (e.g. `user_id` vs `userId`) for the FK.

---

## What to paste back

Paste the outputs of:

- `SHOW search_path;`
- The schema/table search (command 2)
- `\d public.password_reset_tokens`

Then you’ll get the **exact single `ALTER TABLE ... ADD CONSTRAINT ...` command** (no guessing).

---

## Example FK (only after you have the real target table)

Do **not** run any FK command until the diagnostic output confirms schema, table, and column names. If the column were `"userId"` (camelCase), you’d use `FOREIGN KEY ("userId")`; for snake_case `user_id` use `user_id` (no quotes unless the column is quoted in the DB).

---

## Result: no `public.users` in this DB

**What the diagnostic shows:**

- **search_path:** `"$user", public` — only public (plus system schemas).
- **User-like tables:** only `pg_catalog.pg_user_mapping`. No `public.users` (and no `auth.users`).
- **password_reset_tokens:** user identifier column is **`user_id`** (snake_case), not `"userId"`.

**Conclusion:** You can’t add the FK yet because the referenced table does not exist in this database.

**What to do now:**

- Do **not** run an FK command until a `users` table exists (e.g. `public.users` or `auth.users`).
- The `password_reset_tokens` table is valid without an FK; attempting to add it now will just repeat `relation ... does not exist`.

---

## When `public.users` exists: type check, then FK

The migration creates `CREATE TABLE "users"` (quoted identifier). Reference it as **`public."users"`** in the FK to match.

**1. Check type compatibility** (run before adding FK; type mismatch will cause the FK to fail):

```bash
psql "$DATABASE_URL" -t -A -c "
SELECT
  (SELECT data_type FROM information_schema.columns
   WHERE table_schema='public' AND table_name='password_reset_tokens' AND column_name='user_id') AS token_user_id_type,
  (SELECT data_type FROM information_schema.columns
   WHERE table_schema='public' AND table_name='users' AND column_name='id') AS users_id_type;
"
```

- If `users_id_type` is **uuid** and `token_user_id_type` is **text**: either alter `password_reset_tokens.user_id` to `uuid`, or keep it text and do not add the FK (schema is intentionally non-relational there).
- In this repo the seed migration defines `"users"."id"` as **TEXT**, so types already match; still run the check if the DB was created differently.

**2. Confirm the table exists** (quoted name; migration uses `"users"`):

```bash
psql "$DATABASE_URL" -t -A -c "SELECT to_regclass('public.users');"
psql "$DATABASE_URL" -t -A -c 'SELECT to_regclass(''public."users"'');'
```

**3. Add FK** (use `public."users"` to match the migration’s quoted identifier):

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c '
ALTER TABLE public.password_reset_tokens
ADD CONSTRAINT password_reset_tokens_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public."users"(id)
ON DELETE CASCADE
ON UPDATE CASCADE;
'
```

**4. Verify the constraint exists and what it references:**

```bash
psql "$DATABASE_URL" -t -A -c "
SELECT conname
FROM pg_constraint
WHERE conrelid = 'public.password_reset_tokens'::regclass;
"
```

You should see `password_reset_tokens_user_id_fkey`. To confirm the referenced table:

```bash
psql "$DATABASE_URL" -t -A -c "
SELECT
  conname,
  confrelid::regclass AS references_table
FROM pg_constraint
WHERE conrelid = 'public.password_reset_tokens'::regclass
  AND contype = 'f';
"
```

Expect `references_table` to show `public.users` or `public."users"`.

---

## How to get `public.users`

- **Don’t guess which migration creates it.** Confirm via (use `grep` if `rg` is not installed):

  ```bash
  rg -n "CREATE TABLE .*users" prisma/migrations/**/migration.sql
  ```

  Or with grep:

  ```bash
  grep -rn 'CREATE TABLE .*users' prisma/migrations --include='*.sql'
  ```

- **Result in this repo:** `prisma/migrations/20260205000656_npm_run_db_seed_demo/migration.sql:11:CREATE TABLE "users"` — the **users** table is created by a **seed/demo** migration. If this environment is intended to include app users, ensure the migration that creates `public."users"` is applied. If that migration is **seed/demo-only** and not meant to run in prod, decide whether `users` belongs in prod at all; “missing migration” does not automatically mean “broken prod.”

If your system expects `public.users`, confirm which migration creates it. If you paste the output of that `rg` search (or the matching lines), we can say whether `public.users` is part of your migration history or your auth is meant to be external (in which case don’t add this FK at all).

**If no `users` table exists in migration history:** Treat `user_id` as an external subject identifier and **do not add an FK**. Do not create `public.users` just to satisfy the constraint.

---

## What to do next in this DB (practical)

1. **Apply the missing migration** that creates `"users"` (preferably via Prisma if it’s in the migration set; the seed/demo migration defines it).
2. **Confirm the table exists** (both forms; migration uses quoted `"users"`):
   ```bash
   psql "$DATABASE_URL" -t -A -c "SELECT to_regclass('public.users');"
   psql "$DATABASE_URL" -t -A -c 'SELECT to_regclass(''public."users"'');'
   ```
3. **Check id types** (query in “When public.users exists” above). In this repo the seed migration defines `"users"."id"` as **TEXT**, so it matches `password_reset_tokens.user_id`; if your DB differs, align types or skip the FK.
4. **Add the FK** using `public."users"` (command above), then **verify** via the `pg_constraint` query.

---

## Clean decision point (no more diagnostics)

**Established:** `public."users"` is in this repo’s migration history (created by `20260205000656_npm_run_db_seed_demo`). Your current DB does not have that migration applied. The FK failure was schema drift, not external auth.

**If this DB is meant to have app users (most likely):**

1. **Apply the migration that creates `"users"`** — via Prisma if it’s in the migration set, otherwise apply the `CREATE TABLE "users"` SQL from that migration.
2. **Confirm the table exists:**
   ```bash
   psql "$DATABASE_URL" -t -A -c "SELECT to_regclass('public.\"users\"');"
   ```
3. **Add the FK:**
   ```bash
   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c '
   ALTER TABLE public.password_reset_tokens
   ADD CONSTRAINT password_reset_tokens_user_id_fkey
   FOREIGN KEY (user_id) REFERENCES public."users"(id)
   ON DELETE CASCADE
   ON UPDATE CASCADE;
   '
   ```
4. **Verify:**
   ```bash
   psql "$DATABASE_URL" -t -A -c "
   SELECT conname, confrelid::regclass
   FROM pg_constraint
   WHERE conrelid = 'public.password_reset_tokens'::regclass
     AND contype = 'f';
   "
   ```

**If this DB is intentionally without users:**

- Do nothing. Leave `user_id` as a text identifier. Do not create `public.users` just to satisfy the FK.

The doc describes both paths with guardrails. From an operational standpoint: this is done.
