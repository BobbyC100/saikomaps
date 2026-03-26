# Collections Contract v1

This contract defines how curated collections are configured, materialized, and served to Traces Explore.

## Source of Truth

- Regions: `lib/collections/config/regions.ts` (locked to 13)
- Verticals: `lib/collections/config/verticals.ts` (locked to 12)
- Collections: `lib/collections/config/collections.ts` (locked to 85)

## Data Model

Collections are persisted in `lists` and linked entities in `map_places`.

Additive metadata columns on `lists`:

- `collection_scope`
- `collection_region_key`
- `collection_neighborhood`
- `collection_vertical_key`
- `collection_city`
- `source_neighborhoods`
- `is_editorial_collection`
- `sort_rank`
- `max_entities`

## Materialization Workflow

1. Validate schema before changes:
   - `node scripts/check-schema.js`
2. Run preview:
   - `node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/sync-collections.ts`
3. Apply (requires owner):
   - `node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/sync-collections.ts --apply --user-id=<owner-id>`

## Serving Workflow

- List endpoint: `GET /api/collections`
- Facets endpoint: `GET /api/collections/facets`
- Explore route: `/explore`
- Collection detail handoff: `/map/[slug]`

## Guardrails

- Only additive schema changes.
- Collection metadata should never be inferred from slug shape.
- API filters must use metadata columns, not title parsing.
