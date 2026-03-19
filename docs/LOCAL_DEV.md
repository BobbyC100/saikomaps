---
doc_id: SAIKO-LOCAL-DEV
doc_type: runbook
status: active
owner: Bobby Ciccaglione
created: '2026-03-10'
last_updated: '2026-03-17'
project_id: SAIKO
summary: 'Local development setup: install, configure, run.'
---
# Local Development

Saiko runs on Next.js 16 + Prisma + Neon (PostgreSQL).

---

## Setup

```bash
# Install dependencies
npm install

# Copy env template and fill in your secrets
cp .env.example .env.local
# Edit .env.local — add DATABASE_URL, ANTHROPIC_API_KEY, NEXTAUTH_SECRET, etc.

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy
```

---

## Environment Files

| File | What goes here |
|---|---|
| `.env` | Non-sensitive defaults (already committed). Feature flags, app URL, bucket name. |
| `.env.local` | **All secrets.** DB URL, API keys, tokens. See `.env.example` for the full list. |

Production secrets live in Vercel Environment Variables, not in files.

---

## Run

```bash
npm run dev           # Start dev server (default: Neon DB from .env.local)
npm run dev:local     # Start dev server against local Postgres
```

The startup banner shows which DB is in use.

---

## Database

```bash
npx prisma migrate dev     # Create + apply migrations locally
npx prisma migrate deploy  # Apply pending migrations (no generation)
npx prisma studio          # Database GUI
npm run db:whoami           # Check which DB you're connected to
```

### Wrapper scripts (for pipeline scripts)

```bash
./scripts/db-neon.sh <cmd>    # Run command against Neon (reads .env.local)
./scripts/db-local.sh <cmd>   # Run command against localhost:5432
```

These set `SAIKO_DB_FROM_WRAPPER=1`, which pipeline scripts check as a safety guard.

---

## Commands

```bash
npm run dev            # Start dev server
npm run build          # prisma generate && next build
npm run type-check     # TypeScript check (needs NODE_OPTIONS="--max-old-space-size=3072")
npx prisma studio      # Database GUI
```

---

## Health Check

Dev server running? Check the DB connection:

```bash
curl -sS http://localhost:3000/api/health
```

Returns `{ "status": "ok", "db": "connected" }` or 503 if unreachable.
