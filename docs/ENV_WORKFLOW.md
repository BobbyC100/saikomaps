# Env + Google Places + psql Workflow

One source of truth for local dev. No more "key not set" or "wrong DB" confusion.

## Env loading

- **Next.js / dev server**: Loads `.env` then `.env.local` automatically.
- **Scripts**: Use `node -r ./scripts/load-env.js ./node_modules/.bin/tsx` (or `npm run tsx:env --`) so they see the same vars.
- **load-env.js**: Loads `.env` then `.env.local` (override).

## Google Places

- **Canonical var**: `GOOGLE_PLACES_API_KEY` only.
- **Verify key**: `curl -s http://127.0.0.1:3000/api/debug/google-places-env` (requires `DEBUG_ROUTES_ENABLED=true`).

## psql → Neon

```bash
npm run psql:neon
```

Uses `DATABASE_URL` or `DATABASE_URL_DIRECT` from `.env.local`. Never connects to local Postgres by accident.

## Script runners

```bash
# Any script with env preloaded:
npm run tsx:env -- scripts/backfill-websites-from-google.ts --dry-run --la-only --limit 5

# Google websites wrappers:
npm run google:websites:dry
npm run google:websites
```

## DB probe (npm run dev)

If you see `relation "public.places" does not exist`, ensure `DATABASE_URL` in `.env.local` points at your Neon/project DB with the full schema.
