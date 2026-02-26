# Places CSV Import Runbook (Supabase → Neon)

Copy-paste commands only. Target is Neon (production). CSV must have place rows with headers matching the columns below.

---

## 1. Dry-run (no writes)

Ensures `DATABASE_URL` points at Neon, prints TARGET DB and would-insert / would-update counts.

```bash
npm run import:places:dry -- --file "/path/to/your-places.csv"
```

Example:

```bash
npm run import:places:dry -- --file "./Supabase Snippet Row Counts Summary.csv"
```

Expected output includes:
- `TARGET DB: <host>/<db> places_count=<n>`
- `CSV rows: X → would insert: A, would update: B`
- `Dry run. Re-run with --apply to write to Neon.`

---

## 2. Apply (write to Neon)

Upserts all CSV rows into `public.places` (by `slug`). New rows get `id` from CSV or a new UUID; existing rows are updated and **id/created_at are not changed**.

```bash
npm run import:places:apply -- --file "/path/to/your-places.csv"
```

Ensure `DATABASE_URL` is Neon (e.g. from `.env` or run with `SAIKO_DB=neon` so load-env uses Neon). If the script refuses (host does not contain `neon.tech`), use the underlying command with `--force` only when you intend to target a non-Neon DB:

```bash
node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/import-places-csv-to-neon.ts --file "/path/to/your-places.csv" --apply --force
```

---

## 3. Verify counts in Neon

After import, confirm row counts and recency in Neon.

```bash
# Set Neon URL from .env or .env.vercel.prod, then:
export NEON_URL="postgresql://..."   # paste your Neon DATABASE_URL

psql "$NEON_URL" -c "SELECT count(*) FROM public.places;"
psql "$NEON_URL" -c "SELECT slug FROM public.places ORDER BY updated_at DESC NULLS LAST LIMIT 10;"
```

Or use the db-neon helper if you use `.env.db.neon`:

```bash
./scripts/db-neon.sh psql -c "SELECT count(*) FROM public.places;"
./scripts/db-neon.sh psql -c "SELECT slug FROM public.places ORDER BY updated_at DESC NULLS LAST LIMIT 10;"
```

---

## CSV columns used

The script maps these CSV headers (snake_case or camelCase) into `public.places`:

- `id` (optional; only for new rows; if blank, a UUID is generated)
- `slug`, `google_place_id`, `name`, `address`, `latitude`, `longitude`
- `phone`, `website`, `instagram`, `hours`, `description`
- `google_photos`, `google_types`, `price_level`, `neighborhood`, `category`
- `places_data_cached_at`, `created_at`, `updated_at`

For **existing** rows (same `slug`), `id` and `created_at` are never overwritten. All other listed fields are updated from the CSV.
