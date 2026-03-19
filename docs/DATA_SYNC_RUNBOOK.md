---
doc_id: SAIKO-DATA-SYNC-RUNBOOK
doc_type: runbook
status: active
owner: Bobby Ciccaglione
created: '2026-03-10'
last_updated: '2026-03-17'
project_id: SAIKO
summary: 'Copy-paste commands for verifying and syncing data across environments.'
---
# Data Sync Runbook

Copy-paste commands only. Single database provider: **Neon (PostgreSQL)**.

---

## 1. Check production state

Get your Neon URL from `.env.local` (the `DATABASE_URL` line). Then:

```bash
export NEON_URL="postgresql://..."   # paste from .env.local

psql "$NEON_URL" -c "SELECT count(*) AS entities FROM public.entities;"
psql "$NEON_URL" -c "SELECT count(*) AS lists FROM public.lists;"
psql "$NEON_URL" -c "SELECT count(*) AS map_places FROM public.map_places;"
psql "$NEON_URL" -c "SELECT count(*) AS place_coverage_status FROM public.place_coverage_status;"
psql "$NEON_URL" -c "SELECT count(*) AS place_tag_scores FROM public.place_tag_scores;"
psql "$NEON_URL" -c "SELECT count(*) AS energy_scores FROM public.energy_scores;"
psql "$NEON_URL" -c "SELECT slug FROM public.entities ORDER BY updated_at DESC NULLS LAST LIMIT 10;"
```

---

## 2. Sync source → production Neon

Once you know SOURCE and TARGET URLs, run:

### Dry-run (counts only; no writes)

```bash
npx tsx scripts/sync-db.ts --source "$SOURCE_URL" --target "$TARGET_URL"
```

### Apply (upserts into target)

```bash
npx tsx scripts/sync-db.ts --source "$SOURCE_URL" --target "$TARGET_URL" --apply
```

Sync order: `entities` → `energy_scores` → `place_tag_scores` → `place_coverage_status`. All upserts; no schema changes, no drops.

---

## 3. Dev: which DB the app uses

- **Default (Neon):**
  ```bash
  npm run dev
  ```
  Uses `.env` then `.env.local`; `DATABASE_URL` from `.env.local` wins. Banner shows DB classification.

- **Local DB:**
  ```bash
  npm run dev:local
  ```
  Uses `scripts/db-local.sh` to override `DATABASE_URL` with localhost.

- **Explicit Neon wrapper:**
  ```bash
  ./scripts/db-neon.sh node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/<your-script>.ts
  ```
  Reads `DATABASE_URL` from `.env.local`. Sets `SAIKO_DB_FROM_WRAPPER=1`.

The startup banner always shows which DB is in use. No ambiguity.

---

## 4. Sanity: dev-only DB identity endpoint

With the dev server running:

```bash
curl -sS http://localhost:3000/api/debug/db
```

Returns JSON: `classification`, `host`, `database`, `places_count`. Only available when `DEBUG_ROUTES_ENABLED=true`; 404 otherwise.

---

## 5. Health check (production)

```bash
curl -sS https://yourdomain.com/api/health
```

Returns `{ "status": "ok", "db": "connected", "latency_ms": ... }` or 503 if DB is unreachable.
