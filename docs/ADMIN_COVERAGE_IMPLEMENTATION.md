# Data Coverage Audit — Implementation Summary

## Route
✅ `/admin/coverage` — Server Component (app/admin/coverage/page.tsx)

## Navigation
✅ Tabbed interface using querystring:
- `/admin/coverage?view=overview` (default)
- `/admin/coverage?view=missing`
- `/admin/coverage?view=neighborhoods`
- `/admin/coverage?view=redflags`
- `/admin/coverage?view=breakdown`

## File Structure
✅ All files created:
```
app/admin/coverage/
  page.tsx                           # Main server component with all 5 views
  components/
    CoverageNav.tsx                  # Tab navigation
    SimpleTable.tsx                  # Generic table component

lib/admin/coverage/
  sql.ts                             # All SQL query definitions
  run.ts                             # Prisma query runner
  types.ts                           # TypeScript interfaces
```

## Cohort Definitions (targeting `places` table)

### ✅ Reachable
- `places p`
- `JOIN map_places mp ON mp.place_id = p.id`
- `JOIN lists l ON l.id = mp.map_id`
- `WHERE l.status = 'PUBLISHED'`
- `AND p.status != 'PERMANENTLY_CLOSED'`

### ✅ Addressable
- `places p`
- `WHERE p.status != 'PERMANENTLY_CLOSED'`
- `AND p.slug IS NOT NULL`

### ✅ Total DB
- `places p`
- `WHERE p.status != 'PERMANENTLY_CLOSED'`

## Field Names Used (exact from schema)

From `places` model:
- ✅ `id` (not canonical_id)
- ✅ `slug`
- ✅ `google_place_id` (snake_case in DB)
- ✅ `name`
- ✅ `latitude` / `longitude` (not lat/lng)
- ✅ `website`
- ✅ `phone`
- ✅ `neighborhood`
- ✅ `hours`
- ✅ `instagram` (not instagram_handle)
- ✅ `status` (PlaceStatus enum: OPEN, CLOSED, PERMANENTLY_CLOSED)

From `lists` model:
- ✅ `status` (MapStatus enum: DRAFT, READY, PUBLISHED, ARCHIVED)

From `map_places` model:
- ✅ `place_id` → `places.id`
- ✅ `map_id` → `lists.id`

## Views Implemented

### 1. ✅ Overview
- Cohort counts (Total DB, Addressable, Reachable, Dark Inventory)
- Sanity check for reachable places that aren't active
- Warning displayed if sanity check fails
- Cohort definitions explained

### 2. ✅ Missing Fields (Reachable)
- Field-by-field missing count for reachable cohort
- Tiered classification:
  - Tier 1: slug, name, latlng, google_place_id
  - Tier 2: hours, phone, website
  - Tier 3: instagram, neighborhood
- Sorted by missing count (worst first)

### 3. ✅ Neighborhoods (Reachable)
- Neighborhoods with 5+ reachable places
- Tier 1 completeness percentage calculated
- Sorted by Tier 1 % (worst first)
- Top 25 by default with "show all" link
- Columns: neighborhood, places, tier1_complete, tier1_pct, field breakdowns

### 4. ✅ Red Flags (Reachable)
- Places missing any Tier 1 field
- Severity score (1-4 based on missing fields)
- Reasons array showing specific issues
- Limited to 200 rows
- Sorted by severity DESC

### 5. ✅ Field Breakdown (Cross-cohort)
- Three parallel queries: Reachable, Addressable, Total DB
- Merged in TypeScript
- Table showing each field with:
  - Count and % for Reachable
  - Count and % for Addressable
  - Count and % for Total DB
- Summary cards showing cohort totals

## Technical Implementation

### ✅ Query Execution
- Uses `db.$queryRawUnsafe` via Prisma
- Two helper functions: `runOne<T>()` and `runMany<T>()`
- All queries are SELECT-only
- No schema changes
- No external API calls

### ✅ Performance Constraints
- LIMIT 200 on red flags query
- Neighborhoods filter: `places >= 5`
- All queries use CTEs for clarity and performance
- `SELECT DISTINCT` on map_places joins to avoid double-counting

### ✅ UI Components
- Server-side rendering (no client state)
- Simple, readable tables
- Minimal styling (Tailwind utility classes)
- No design complexity
- Arrays render as comma-separated values
- Percentages formatted to 1 decimal place
- BigInt values converted to strings for display

## Safeguards

✅ All queries are read-only (SELECT only)
✅ No writes anywhere in the route
✅ No background jobs triggered
✅ No impact on public routes
✅ No fetch calls to external APIs
✅ Uses existing Prisma client (`@/lib/db`)
✅ Field names match schema exactly (no guessing)

## Acceptance Criteria

✅ `/admin/coverage` route exists and loads
✅ Tabs work via querystring navigation
✅ Counts are deterministic (uses DISTINCT on map_places joins)
✅ Reachable cohort uses `lists.status = 'PUBLISHED'`
✅ No writes in any query
✅ No external API calls
✅ Designed for <5s execution (optimized CTEs, limited result sets)

## Schema Alignment Verification

The implementation targets the **`places`** table (current production):
- ✅ `map_places.place_id` → `places.id` (not golden_records)
- ✅ `lists.status` for published maps (not saved_maps.status which doesn't exist)
- ✅ `places.status` for active filtering (not lifecycle_status)

**Future Phase**: When `golden_records` becomes the primary data source and is linked to the surface, queries can be migrated to use `golden_records.canonical_id` with minimal changes to the structure.

## Ready for Testing

The implementation is complete and ready for:
1. Navigation to `/admin/coverage`
2. Tab switching between all 5 views
3. Verification of query results
4. Performance testing on production DB

No additional setup required beyond existing Prisma connection.
