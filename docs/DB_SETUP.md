# Database Environment Management (v3.0)

## Overview

Saiko Maps uses a typed config layer to enforce pooled vs direct connections and eliminate wrong-database errors. Purpose-specific Prisma client instances are wired to the correct connection type (pooled vs direct URLs).

## Local Configuration (.env.local)

config/env.ts loads **only** `.env.local` explicitly — no .env fallback to avoid DB config ambiguity.

Add these to `.env.local`:

```bash
# Required for scripts using config/db (v3.0)
DATABASE_URL_POOLED=postgresql://...@ep-xxx-pooler....neon.tech/neondb?sslmode=require
DATABASE_URL_DIRECT=postgresql://...@ep-xxx....neon.tech/neondb?sslmode=require
DB_ENV=local_dev
```

- **DATABASE_URL_POOLED** — Neon pooled connection (host contains `-pooler`). Use for app runtime and ingestion scripts.
- **DATABASE_URL_DIRECT** — Neon direct connection (host does NOT contain `-pooler`). Use for migrations and admin scripts.
- **DB_ENV** — One of: `local_dev` | `staging` | `production`

### Deriving URLs from Neon

- Pooled: Dashboard → Connection string → "Pooled connection" (host ends with `-pooler`)
- Direct: Same credentials, host without `-pooler` (e.g. `ep-spring-sun-aiht1nns.c-4.us-east-1.aws.neon.tech`)

## Purpose-Based Connections

| Purpose      | Connection | Use case                        |
|--------------|------------|----------------------------------|
| `migration`  | Direct     | Prisma migrate, schema changes   |
| `admin`      | Direct     | Admin scripts                    |
| `app`        | Pooled     | Next.js runtime                  |
| `ingestion`  | Pooled     | Backfill, import scripts         |

## Usage

```typescript
// Scripts that need purpose-based connection
import { db } from '@/config/db';

const rows = await db.ingestion.entities.findMany({ where: { ... } });
await db.admin.entities.update({ where: { id }, data: { ... } });
```

```typescript
// App runtime (unchanged)
import { db } from '@/lib/db';
```

## Migrations

For migrations, ensure `DATABASE_URL` points at the direct connection:

```bash
DATABASE_URL=$DATABASE_URL_DIRECT npx prisma migrate deploy
```

Or add to `package.json`:

```json
"db:migrate:deploy": "node -r ./scripts/load-env.js -e \"require('./config/env');\" && DATABASE_URL=$DATABASE_URL_DIRECT npx prisma migrate deploy"
```

## Validation

Config fails immediately at import if:

- `DATABASE_URL_POOLED` is missing or does not contain `-pooler`
- `DATABASE_URL_DIRECT` is missing or contains `-pooler`
- `DB_ENV` is not one of the allowed values
