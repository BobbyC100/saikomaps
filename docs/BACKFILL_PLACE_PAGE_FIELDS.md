# Backfill Place Page Fields

Safe, additive, idempotent backfill for `places` table fields: `thematicTags`, `contextualConnection`, `curatorAttribution`.

## Safety

- **Default: DRY RUN** — no writes unless `--apply` is passed
- **Additive only** — fills NULL/empty targets; never overwrites unless `--force`
- **Wrapper required** — refuses to run unless `SAIKO_DB_FROM_WRAPPER=1` (use `db-local.sh` or `db-neon.sh`)
- **Allowlist** — only `transitAccessible`, `thematicTags`, `contextualConnection`, `curatorAttribution` are writable

## Commands

```bash
# Dry run (local DB)
npm run backfill:place-page-fields:local

# Dry run (Neon)
npm run backfill:place-page-fields:neon

# Apply writes (local)
npm run backfill:place-page-fields:local -- --apply

# Apply writes (Neon)
npm run backfill:place-page-fields:neon -- --apply

# With options
npm run backfill:place-page-fields:neon -- --apply --limit 100 --verbose
npm run backfill:place-page-fields:neon -- --apply --ids id1,id2,id3
npm run backfill:place-page-fields:neon -- --apply --where '{"status":"OPEN"}'
npm run backfill:place-page-fields:neon -- --apply --force
```

## Flags

| Flag | Description |
|------|-------------|
| `--apply` | Persist updates (default is dry run) |
| `--force` | Overwrite non-empty target fields |
| `--limit N` | Max places to process |
| `--where '{"key":"value"}'` | Where filter (allowlisted keys: status, id, slug, neighborhood, primary_vertical) |
| `--ids a,b,c` | Comma-separated place IDs |
| `--verbose` | Log each place that would be updated |

## Extraction Rules (deterministic, no LLM)

- **thematicTags**: place_personality + vibeTags + significant words from curator descriptor + first source excerpt
- **contextualConnection**: `{neighborhood} {vertical} — {personality}. {tagline or description}`
- **curatorAttribution**: list owner name/email from first map_place with descriptor
