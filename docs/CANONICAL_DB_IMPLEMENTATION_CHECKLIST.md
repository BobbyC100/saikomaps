# Canonical DB Authority & Env Hygiene — Implementation Checklist

**Locked.** No scope expansion. No architecture discussion. Execute in order.

---

## Phase 1: Env and config

### 1.1 Env schema (single authority)

- [ ] **config/env.ts**  
  - Load only `.env.local` (already does).  
  - Replace schema with:
    - `DATABASE_URL`: string, URL (required).  
    - `DB_ENV`: enum `'dev' | 'staging' | 'prod'` (required).  
  - Remove `DATABASE_URL_POOLED`, `DATABASE_URL_DIRECT`, and any `-pooler` refinement.  
  - On parse failure: throw (no fallback).

### 1.2 DB connection layer

- [ ] **config/db.ts**  
  - Import `env` from `./env` and `assertDbTargetAllowed` from `@/lib/db-guard`.  
  - Before creating any client: call `assertDbTargetAllowed()`.  
  - Use a single Prisma client: `datasourceUrl: env.DATABASE_URL`.  
  - Export a single `db` (e.g. `db.admin` / `db.app` both point to same client if you keep the shape, or just `db`).  
  - Remove all references to `DATABASE_URL_POOLED` and `DATABASE_URL_DIRECT`.

### 1.3 DB guard

- [ ] **lib/db-guard.ts**  
  - Keep `assertDbTargetAllowed()` and `getDbBanner()` using `process.env.DATABASE_URL`.  
  - Update error message: remove references to `.env.db.neon` and `db-neon.sh`; say “Use ./scripts/db-use.sh and ensure .env.local has DATABASE_URL and DB_ENV.”  
  - Add and export `requireProdConfirmation(message?: string): void`:  
    - If `process.env.DB_ENV !== 'prod'`, return.  
    - If `process.env.CONFIRM_PROD !== '1'`: log message (e.g. “Destructive run against prod. Set CONFIRM_PROD=1 to proceed.”) and `process.exit(1)`.

### 1.4 Prod confirmation (destructive scripts)

- [ ] **scripts/seed-prod-places.ts**  
  - After importing config/db, call `requireProdConfirmation('Seeding production places.')` (or equivalent from db-guard).  
- [ ] **scripts/prod-migrate-recover-and-deploy.sh**  
  - Already checks DATABASE_URL; add explicit check that `DB_ENV=prod` and require CONFIRM_PROD=1 (or equivalent) before destructive steps.  
- [ ] Any other script that writes to prod when `DB_ENV=prod`: add `requireProdConfirmation()` at start.

---

## Phase 2: Env files and examples

### 2.1 Canonical example

- [ ] **.env.local.example**  
  - Content only:
    ```bash
    # Copy to .env.local. Required for scripts and local dev.
    DATABASE_URL="postgresql://user:pass@host:5432/database?sslmode=require"
    DB_ENV=dev
    ```
  - Remove `DATABASE_URL_POOLED`, `DATABASE_URL_DIRECT`, and `local_dev`.  
  - Comment: `DB_ENV is dev | staging | prod`.

### 2.2 Delete deprecated env files / vars

- [ ] Delete **.env.db.example** (if present).  
- [ ] In repo and docs: document that **.env.db.neon** must be deleted if it exists (no script to create it).  
- [ ] Ensure no committed file sets or documents `DATABASE_URL_WITH_SCHEMA`, `NEON_DATABASE_URL`, or alternate DB vars as the authority.

---

## Phase 3: Shell entry point (single script)

### 3.1 Create scripts/db-use.sh

- [ ] Create **scripts/db-use.sh** (executable).  
  - No direct `source .env.local` in user-facing usage; script may load env via a small Node one-liner that reads `.env.local` and outputs exports for the shell (same pattern as current db-shell.sh).  
  - Required: script loads only from `.env.local` and exports `DATABASE_URL` and `DB_ENV`.  
  - If `.env.local` missing or `DATABASE_URL`/`DB_ENV` empty after load: print error and exit 1.  
  - **Subcommands:**
    - `./scripts/db-use.sh whoami`  
      - Run Node script that prints: `DB_ENV`, `host`, `database`, `user`, `search_path`.  
      - If any of these cannot be printed, exit non-zero (no silent connection).  
    - `./scripts/db-use.sh psql [args...]`  
      - Export env from .env.local, then `exec psql "$DATABASE_URL" "$@"`.  
    - `./scripts/db-use.sh check`  
      - Verify `places` table exists (e.g. run a small Node or psql check). Exit 0 only if it exists.  
  - Script must print a one-line “Connected to: …” / “DB_ENV: …” before running whoami/check or psql so the user always sees which DB is in use.

### 3.2 Whoami implementation

- [ ] **scripts/db-whoami.ts**  
  - Use `env` from `@/config/env` only (no direct `process.env.DATABASE_URL`).  
  - Use `env.DATABASE_URL` and `env.DB_ENV`.  
  - Print: `DB_ENV`, `host`, `database`, `user`, `search_path` (from live query).  
  - Remove all references to `DATABASE_URL_DIRECT` / `DATABASE_URL_POOLED`.  
  - Ensure output is parseable/clear so `db-use.sh whoami` can rely on it.

### 3.3 Deprecate old shell scripts

- [ ] **scripts/db-shell.sh**  
  - Replace body with: call `scripts/db-use.sh psql "$@"` (or equivalent) so existing invocations still work, or delete and update any references to use `db-use.sh`.  
- [ ] **scripts/db-local.sh**  
  - Same: delegate to `db-use.sh` or remove and point callers to `db-use.sh`.  
- [ ] **scripts/db-neon.sh**  
  - Same: delegate to `db-use.sh` or remove and point callers to `db-use.sh`.  
  - No separate “neon” vs “local” entry points; single entry point is `db-use.sh`.

---

## Phase 4: Node scripts (single DATABASE_URL)

### 4.1 Use config/db and env only

- [ ] **scripts/coverage-run.ts**  
  - Use `env.DATABASE_URL` (and `db` from config/db if needed). Remove `DATABASE_URL_POOLED` / `parseConnectionIdentity(env.DATABASE_URL_POOLED)`.  
- [ ] **scripts/coverage-queue.ts**  
  - Rely on config/db and env; remove POOLED/DIRECT.  
- [ ] **scripts/coverage-apply.ts**  
  - Same.  
- [ ] **scripts/coverage-apply-description.ts**  
  - Same.  
- [ ] **scripts/coverage-apply-tags.ts**  
  - Same.  
- [ ] **scripts/identity-audit.ts**  
  - Use `env.DATABASE_URL` (and db from config/db). Remove `env.DATABASE_URL_POOLED`.  
- [ ] **scripts/import-places-csv-to-neon.ts**  
  - Use `env.DATABASE_URL` or `db` from config/db. Remove `env.DATABASE_URL_DIRECT`.  
- [ ] **scripts/seed-prod-places.ts**  
  - Use `db` from config/db only. Remove raw `env.DATABASE_URL_DIRECT`. Add `requireProdConfirmation()` as in 1.4.

### 4.2 Header comments

- [ ] In every script that touches the DB, update the “Requires” comment to: “.env.local with DATABASE_URL and DB_ENV (dev|staging|prod).”  
- [ ] Ensure each such script prints a DB fingerprint before doing work (e.g. “Connected to: <DB_ENV>, Host: …, Database: …, User: …”). Either in script or via shared helper called at start.

---

## Phase 5: Python

### 5.1 Single env file and DATABASE_URL

- [ ] **scripts/gpid-resolution-dryrun.py**  
  - `load_dotenv('.env.local')` only (remove `load_dotenv()` with no path and `load_dotenv(".env.db.neon")`).  
  - `DATABASE_URL = os.getenv("DATABASE_URL")`.  
  - If not `DATABASE_URL`: `raise Exception("DATABASE_URL not set")` (no fallback).  
  - After `psycopg2.connect(DATABASE_URL)`: run `cursor.execute("SET search_path TO public")` (or equivalent) so schema is set in-session.  
  - No URL mutation, no appended options.

---

## Phase 6: Guardrails and docs

### 6.1 No alternate DB vars

- [ ] Grep codebase for `NEON_DATABASE_URL`, `DATABASE_URL_WITH_SCHEMA`, `DATABASE_URL_DIRECT`, `DATABASE_URL_POOLED` and remove or replace with `DATABASE_URL` / config/db.  
  - Exception: app runtime (e.g. Vercel) may set only `DATABASE_URL`; `lib/db.ts` and API routes can keep using `process.env.DATABASE_URL` for the app.  
  - Scripts and config/db must not use alternate names.

### 6.2 DB fingerprint

- [ ] Confirm every DB-touching script prints connection identity (DB_ENV, host, database, user) before doing work—either by calling a shared helper (e.g. from db-guard) or inline. No silent connections.

### 6.3 Docs

- [ ] **docs/DB_SETUP.md** (or equivalent)  
  - State: only `.env.local` is authoritative for local execution; required vars: `DATABASE_URL`, `DB_ENV` (dev|staging|prod).  
  - State: use `./scripts/db-use.sh whoami` and `./scripts/db-use.sh check` to verify connection and schema.  
  - State: no `.env.db.neon`; no direct sourcing of env files for DB—use `db-use.sh` only.  
  - Remove or update any instructions that reference POOLED/DIRECT or old shell scripts.

---

## Success criteria (binary)

- [ ] From repo root: `./scripts/db-use.sh whoami` → prints correct DB (DB_ENV, host, database, user, search_path).  
- [ ] From repo root: `./scripts/db-use.sh check` → confirms `places` table exists.  
- [ ] Node script (e.g. `npx tsx scripts/db-whoami.ts`) runs without manual export hacks.  
- [ ] Python script runs with only `.env.local` and `DATABASE_URL`; connects and sets search_path in-session.  
- [ ] No `.env.db.neon`; no `DATABASE_URL_WITH_SCHEMA`; no user-facing shell sourcing of env files for DB.  
- [ ] When `DB_ENV=prod`, destructive scripts exit unless `CONFIRM_PROD=1` (or equivalent) is set.

---

**End of checklist.** No architecture changes. No Prisma/Neon re-architecting. Cleanup and enforcement only.
