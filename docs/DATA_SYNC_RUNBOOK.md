# Data Sync Runbook

Copy-paste commands only. No branching instructions.

---

## 1. Identify source of truth (run on BOTH Neon and Supabase)

Set the URL for the DB you are querying, then run the same block for the other DB.

### Neon (production)

Get your Neon URL from `.env` or `.env.vercel.prod` (the `DATABASE_URL` line). Then:

```bash
export NEON_URL="postgresql://..."   # paste from .env or .env.vercel.prod

psql "$NEON_URL" -c "SELECT count(*) AS places FROM public.places;"
psql "$NEON_URL" -c "SELECT count(*) AS lists FROM public.lists;"
psql "$NEON_URL" -c "SELECT count(*) AS map_places FROM public.map_places;"
psql "$NEON_URL" -c "SELECT count(*) AS entity_coverage_status FROM public.entity_coverage_status;"
psql "$NEON_URL" -c "SELECT count(*) AS place_tag_scores FROM public.place_tag_scores;"
psql "$NEON_URL" -c "SELECT count(*) AS energy_scores FROM public.energy_scores;"
psql "$NEON_URL" -c "SELECT slug FROM public.places ORDER BY updated_at DESC NULLS LAST LIMIT 10;"
```

### Supabase

Get your Supabase URL from `.env.vercel` (the `DATABASE_URL` line). Then:

```bash
export SUPABASE_URL="postgresql://..."   # paste from .env.vercel

psql "$SUPABASE_URL" -c "SELECT count(*) AS places FROM public.places;"
psql "$SUPABASE_URL" -c "SELECT count(*) AS lists FROM public.lists;"
psql "$SUPABASE_URL" -c "SELECT count(*) AS map_places FROM public.map_places;"
psql "$SUPABASE_URL" -c "SELECT count(*) AS entity_coverage_status FROM public.entity_coverage_status;"
psql "$SUPABASE_URL" -c "SELECT count(*) AS place_tag_scores FROM public.place_tag_scores;"
psql "$SUPABASE_URL" -c "SELECT count(*) AS energy_scores FROM public.energy_scores;"
psql "$SUPABASE_URL" -c "SELECT slug FROM public.places ORDER BY updated_at DESC NULLS LAST LIMIT 10;"
```

Compare counts and recency. The DB with more places and more recent updates is the source of truth. Production is Neon; typically Neon is the source of truth.

---

## 2. Sync source → production Neon

Once you know SOURCE (e.g. Neon staging or Supabase) and TARGET (production Neon), run:

### Dry-run (counts only; no writes)

```bash
npx tsx scripts/sync-db.ts --source "$SOURCE_URL" --target "$TARGET_URL"
```

Example with real URLs (replace with your values):

```bash
npx tsx scripts/sync-db.ts --source "postgresql://user:pass@source-host/db" --target "postgresql://user:pass@neon-host/neondb"
```

### Apply (upserts into target)

```bash
npx tsx scripts/sync-db.ts --source "$SOURCE_URL" --target "$TARGET_URL" --apply
```

Sync order: `places` → `energy_scores` → `place_tag_scores` → `entity_coverage_status`. All upserts; no schema changes, no drops.

---

## 3. Dev: which DB the app uses

- **Local DB (localhost):**
  ```bash
  npm run dev:local
  ```
  Uses `.env` then `.env.local`; DATABASE_URL from `.env.local` wins. Banner shows CLASSIFICATION: LOCAL.

- **Neon DB:**
  ```bash
  npm run dev:neon
  ```
  Uses `.env` (and optionally `.env.vercel.prod` for DATABASE_URL). Banner shows CLASSIFICATION: NEON.

The startup banner always shows which DB is in use. No ambiguity.

---

## 4. Sanity: dev-only DB identity endpoint

With the dev server running (e.g. `npm run dev:neon`):

```bash
curl -sS http://localhost:3000/api/debug/db
```

Returns JSON: `classification`, `host`, `database`, `places_count`. Only available when `NODE_ENV=development`; 404 in production.

---

## 5. One-liner summary

- **Counts (Neon vs Supabase):** Set `NEON_URL` or `SUPABASE_URL`, run the `psql ... -c "SELECT count(*) ..."` blocks above.
- **Sync to prod Neon:** `npx tsx scripts/sync-db.ts --source <url> --target <prod-neon-url>` then add `--apply` to write.
- **Dev DB choice:** `npm run dev:local` or `npm run dev:neon`; banner confirms which DB.

---

## 6. Canonical drift KPI — promote orphan entities → golden_records

One KPI, one decision tree, one loop. No spelunking.

### Command

```bash
./scripts/db-neon.sh psql -c "
SELECT
  COUNT(*) AS entities_without_golden,
  COUNT(*) FILTER (
    WHERE e.google_place_id IS NOT NULL
      AND btrim(COALESCE(e.google_place_id,'')) != ''
  ) AS promotable_with_gpid,
  COUNT(*) FILTER (
    WHERE e.google_place_id IS NULL
      OR btrim(COALESCE(e.google_place_id,'')) = ''
  ) AS need_gpid_first
FROM entities e
LEFT JOIN golden_records g ON g.slug = e.slug
WHERE g.canonical_id IS NULL;
"
```

### Output columns

| Column | Meaning |
|-------|---------|
| **entities_without_golden** | Total orphan entities (canonical drift KPI). |
| **promotable_with_gpid** | Orphans that already have a google_place_id. Can be promoted immediately. |
| **need_gpid_first** | Orphans missing google_place_id. Must run GPID backfill first. |

### What to do based on the numbers

**If promotable_with_gpid > 0**

Run the automated loop:

```bash
npm run promote:orphans:neon -- --apply --limit 20
```

Repeat until promotable_with_gpid = 0.

**If need_gpid_first > 0**

Run:

```bash
npm run backfill:golden-gpid-from-places:neon -- --apply
```

Then re-run the KPI and return to promotion.

### Done condition

You're done when:

- **entities_without_golden = 0**, or
- All remaining orphans are intentionally excluded (no GPID, low confidence, manual review bucket).

### Manual fallback (zsh-safe)

```bash
npm run backfill:golden-from-places:neon -- --apply --ids 'id1,id2,id3'
```
