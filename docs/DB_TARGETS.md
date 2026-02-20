# Database Target Selection (Neon vs Local)

**Default DB target is Neon.** Node/Prisma and most scripts use `DATABASE_URL` from `.env` + `.env.local`. Your shell may have a different `DATABASE_URL`, causing `psql` or ad-hoc commands to hit the wrong DB.

**Never trust your shell env.** Always use the wrappers when running DB commands or scripts that depend on `DATABASE_URL`. The wrappers inject `DATABASE_URL` for `psql` automatically; you never need to pass it manually.

## Setup

```bash
cp .env.db.example .env.db.neon
cp .env.db.example .env.db.local
```

Edit each file and set `DATABASE_URL` appropriately (Neon URL in `.env.db.neon`, localhost URL in `.env.db.local`).

These files are gitignored.

**Apply migration (to Neon or whichever DB you target)**

```bash
./scripts/db-neon.sh npx prisma migrate deploy
```

## Running Commands Explicitly

| Target | Command |
|--------|---------|
| **Neon** | `./scripts/db-neon.sh <cmd> [args...]` or `npm run db:neon -- <cmd> [args...]` |
| **Local** | `./scripts/db-local.sh <cmd> [args...]` or `npm run db:local -- <cmd> [args...]` |

Examples:

```bash
# psql on Neon
./scripts/db-neon.sh psql -c "SELECT 1"

# coverage census on Neon
./scripts/db-neon.sh npm run coverage:census

# psql on local
./scripts/db-local.sh psql
```

## LA-Only Views

| View | Definition | Use case |
|------|------------|----------|
| `public.v_places_la_bbox` | Places with `places.latitude` / `places.longitude` in LA bbox (33.70–34.85, -118.95–-117.60) | Places-only LA queries |
| `public.v_places_la_bbox_golden` | Places joined to `golden_records` filtered by `gr.lat` / `gr.lng` in LA bbox | LA places that have a golden record |

Both views exist via Prisma migrations. Run `prisma migrate deploy` to ensure they exist in the target DB.

## Smoke Test

Run both local and neon checks (whoami + places count + LA view count). Exit non-zero if any fail.

```bash
npm run db:smoke
```

## Verification Commands

Every wrapper run prints `[SAIKO DB] target=... host=... db=... user=...` plus a lightweight DB probe when the command is `psql`, `prisma`, `node`, or `npm`.

**Which DB am I on?** (reflex command)

```bash
npm run db:whoami:neon
npm run db:whoami:local
```

Or directly:

```bash
./scripts/db-neon.sh psql -f scripts/db-whoami.sql
```

**LA views exist?**

```bash
./scripts/db-neon.sh psql -c "SELECT schemaname, viewname FROM pg_views WHERE schemaname='public' AND viewname LIKE 'v_places_la%';"
```

**LA view counts**

```bash
./scripts/db-neon.sh psql -c "SELECT count(*) FROM public.v_places_la_bbox;"
./scripts/db-neon.sh psql -c "SELECT count(*) FROM public.v_places_la_bbox_golden;"
```

## Backfill Google Place IDs (places table)

Fills `places.google_place_id` via Google Places Text Search. Required before `v_places_la_bbox_golden` can link to golden_records.

**Verification (count missing in LA bbox):**

```bash
./scripts/db-neon.sh psql -Atc "SELECT count(*) FROM public.v_places_la_bbox WHERE google_place_id IS NULL OR btrim(COALESCE(google_place_id,''))='';"
```

**Sample rows after apply:**

```bash
./scripts/db-neon.sh psql -c "SELECT slug, google_place_id FROM public.v_places_la_bbox LIMIT 10;"
```

**Backfill golden_records from places** (so v_places_la_bbox_golden returns rows):

```bash
npm run backfill:golden-from-places:neon -- --la-only --apply
./scripts/db-neon.sh psql -c "SELECT count(*) FROM public.v_places_la_bbox_golden;"
```

## LA-Scoped Gold and Eval

See [GOLD_EVAL.md](./GOLD_EVAL.md) for generating LA gold files and running eval. Quick commands:

```bash
npm run gold:la:neon -- --gold=data/gold_sets/vibe_tags_v1.csv --out=data/gold_sets/vibe_tags_v1__la.csv
npm run eval:tag-scores:neon:la -- --gold=data/gold_sets/vibe_tags_v1__la.csv --threshold=0.5
```

## Backfill Place Page Fields

See [BACKFILL_PLACE_PAGE_FIELDS.md](./BACKFILL_PLACE_PAGE_FIELDS.md) for the place page fields backfill (thematicTags, contextualConnection, curatorAttribution). Use:

```bash
npm run backfill:place-page-fields:local    # Dry run against local
npm run backfill:place-page-fields:neon     # Dry run against Neon
npm run backfill:place-page-fields:neon -- --apply   # Persist to Neon
```
