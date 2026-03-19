---
doc_id: SAIKO-DATABASE-SETUP
doc_type: reference
status: active
owner: Bobby Ciccaglione
created: '2026-03-10'
last_updated: '2026-03-17'
project_id: SAIKO
systems:
  - database
summary: 'Database setup: Neon (production), local Postgres (dev), Prisma ORM.'
---
# Database Setup

## Production: Neon (PostgreSQL)

Saiko uses **Neon** as its single production database with connection pooling.

- **Provider:** Neon (PostgreSQL, managed)
- **Region:** US-East-1 (AWS)
- **Connection:** Pooler endpoint (`-pooler.` subdomain)
- **ORM:** Prisma 6.0
- **Schema:** 57 models, 63+ migrations

The `DATABASE_URL` in `.env.local` should point to the Neon pooler endpoint:
```
DATABASE_URL="postgresql://neondb_owner:<password>@ep-<id>-pooler.<region>.neon.tech/neondb?sslmode=require&channel_binding=require"
```

Production `DATABASE_URL` is also set in Vercel Environment Variables (dashboard).

---

## Local Development: Postgres

For local dev without hitting Neon:

### Option A: Postgres.app (easiest on Mac)

1. Download [Postgres.app](https://postgresapp.com/)
2. Open it and click "Initialize"
3. Add to PATH: `sudo mkdir -p /etc/paths.d && echo /Applications/Postgres.app/Contents/Versions/latest/bin | sudo tee /etc/paths.d/postgresapp`

### Option B: Homebrew

```bash
brew install postgresql@16
brew services start postgresql@16
```

### Create the database

```bash
createdb saiko_maps
```

### Use local DB with dev server

```bash
npm run dev:local
```

This runs `scripts/db-local.sh`, which overrides `DATABASE_URL` to `postgresql://youruser@localhost:5432/saiko_maps`.

---

## Migrations

```bash
npx prisma migrate dev       # Dev: create + apply migrations
npx prisma migrate deploy    # Prod: apply pending migrations only
npx prisma generate          # Regenerate Prisma client after schema changes
```

Migrations live in `prisma/migrations/`. The codebase favors **additive migrations**. Destructive migrations (column drops, table drops) are deferred and require manual pre-flight checks — see `docs/DEFERRED_MIGRATION_GATES.md`.

---

## Verify Connection

```bash
npm run db:whoami             # Show which DB you're connected to
curl localhost:3000/api/health  # Health check (dev server running)
npx prisma db pull            # Pull schema from DB (confirms connection)
```

---

## Troubleshooting

### "User was denied access on the database"
- PostgreSQL isn't running, or `DATABASE_URL` has wrong credentials
- Check: `psql $DATABASE_URL -c "SELECT 1"` — does it connect?

### Wrong database
- The dev server banner shows which DB classification (NEON / LOCAL) is in use
- `npm run db:whoami` confirms the connection
- If using wrapper scripts, `SAIKO_DB_FROM_WRAPPER=1` ensures the wrapper's URL wins
