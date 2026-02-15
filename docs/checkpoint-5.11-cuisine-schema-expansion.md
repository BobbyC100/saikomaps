# Checkpoint 5.11 — Cuisine Schema Expansion Complete

## Summary

Successfully added Saiko-owned cuisine classification fields to the database schema. This is a **schema-only, additive change** with no data mutations or breaking changes.

---

## What Was Added

### New Fields on `places` Table

**1. `cuisine_primary` (TEXT, nullable)**
- Prisma: `cuisinePrimary?: string | null`
- Saiko's authoritative primary cuisine classification
- Will be editorially curated (not algorithmically inferred)
- Examples: "Italian", "Japanese", "Mexican", "American"

**2. `cuisine_secondary` (TEXT[], NOT NULL, default [])**
- Prisma: `cuisineSecondary: string[]`
- Supporting cuisines or overlaps
- PostgreSQL array type
- Default: empty array `[]`
- Examples: `["Seafood", "Wine Bar"]`, `["BBQ", "Korean"]`

### Preserved Fields

**`cuisine_type` (TEXT, nullable)** - UNCHANGED
- Remains as Google-derived reference data
- No mutations to existing data
- Will continue to exist as legacy/reference field
- Current state: 65% null (283/434 places)

---

## Schema Changes

### Before
```prisma
model places {
  // ...
  cuisineType String? @map("cuisine_type")
  // ...
  rankingScore Float? @map("ranking_score") @default(0)
  lastScoreUpdate DateTime? @map("last_score_update")
  // ...
}
```

### After
```prisma
model places {
  // ...
  cuisineType String? @map("cuisine_type")  // Google-derived (unchanged)
  // ...
  rankingScore Float? @map("ranking_score") @default(0)
  lastScoreUpdate DateTime? @map("last_score_update")
  
  // NEW: Saiko-owned cuisine classification
  cuisinePrimary String? @map("cuisine_primary")
  cuisineSecondary String[] @default([]) @map("cuisine_secondary")
  // ...
}
```

---

## Execution Results

### Migration Command
```bash
npx prisma db push
```

### Console Output
```
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "saiko_maps"

🚀  Your database is now in sync with your Prisma schema. Done in 61ms

✔ Generated Prisma Client (v6.18.0) in 143ms
```

### Database Verification
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'places' 
AND column_name IN ('cuisine_primary', 'cuisine_secondary', 'cuisine_type');
```

**Result**:
```
cuisine_primary      : text         (✅ Added)
cuisine_secondary    : ARRAY        (✅ Added)
cuisine_type         : text         (✅ Preserved)
```

### TypeScript Types
```typescript
// Prisma Client types generated correctly:
type places = {
  // ...
  cuisineType: string | null;        // Google-derived
  cuisinePrimary: string | null;     // Saiko-owned (NEW)
  cuisineSecondary: string[];        // Saiko-owned (NEW)
  // ...
}
```

---

## Validation Checklist

- ✅ Migration applied cleanly (61ms)
- ✅ No errors or warnings
- ✅ Database schema in sync with Prisma schema
- ✅ New columns exist in `places` table
- ✅ `cuisine_primary`: TEXT, nullable
- ✅ `cuisine_secondary`: ARRAY, NOT NULL, default `[]`
- ✅ Existing `cuisine_type` preserved (no mutations)
- ✅ Prisma Client regenerated
- ✅ TypeScript types correct
- ✅ No data loss or corruption
- ✅ Ready for editorial population

---

## Why This Matters

### Problem Solved
- **Google Places conflation**: `cuisine_type` stores place formats (Bar, Cafe) instead of cuisines
- **65% null rate**: Most places have no cuisine metadata
- **Search dead-ends**: Users searching "italian", "thai", "korean" get zero results despite places existing
- **No editorial authority**: Saiko couldn't control cuisine classification

### Benefits Unlocked

1. **Editorial Authority**
   - Saiko owns cuisine classification
   - Deterministic, auditable, non-algorithmic
   - Can override/correct Google data

2. **Search Reliability**
   - Future queries against `cuisinePrimary` will be accurate
   - No more "Bar" when user searches for cuisine type
   - Supports secondary cuisines (e.g., "Korean BBQ" → primary: Korean, secondary: [BBQ])

3. **EOS Integrity**
   - Ranking can rely on intentional cuisine metadata
   - Coverage reports by cuisine will be meaningful
   - Chef/critic/cuisine-driven discovery enabled

4. **Clean Separation**
   - Google data preserved as reference
   - Saiko data clearly labeled and owned
   - Can compare/audit discrepancies

---

## Data State (Post-Migration)

**Total Places**: 434

**Current State** (all new fields):
- `cuisinePrimary`: 0/434 populated (0%) - **Expected, backfill is next checkpoint**
- `cuisineSecondary`: 0/434 populated (0%) - **Expected**
- All values correctly default to `null` (primary) or `[]` (secondary)

**Existing State** (preserved):
- `cuisineType`: 151/434 populated (35%) - **Unchanged**
- No data mutations
- No regressions

---

## What This Does NOT Include

Per checkpoint scope, **not implemented** (intentionally):

❌ Backfilling cuisine values (Checkpoint 5.12)  
❌ Search logic changes (Checkpoint 5.13)  
❌ EOS scoring updates (Checkpoint 5.13)  
❌ UI changes  
❌ Google Places parsing modifications  
❌ Inventory reporting updates (Checkpoint 5.14)

---

## Next Checkpoints

### Checkpoint 5.12 — Cuisine Backfill (Editorial Rules)
**Scope**: Populate `cuisinePrimary` and `cuisineSecondary` for ranked places
- Manual editorial rules (deterministic, non-algorithmic)
- Script-assisted population
- Focus on ranked places first (108 places)

### Checkpoint 5.13 — Search Wiring
**Scope**: Update search queries to use Saiko cuisine fields
- Modify `/api/search` to query `cuisinePrimary`/`cuisineSecondary`
- Deprecate reliance on `cuisine_type`
- Test cuisine-based discovery

### Checkpoint 5.14 — Inventory Reporting v2
**Scope**: Update inventory report to show Saiko cuisines
- Coverage by primary cuisine
- Gap analysis per cuisine
- Editorial backfill progress tracking

---

## Rollback Plan

If needed, rollback is **safe and non-destructive**:

```sql
-- Drop new columns (no data loss, they're all NULL/empty anyway)
ALTER TABLE places DROP COLUMN cuisine_primary;
ALTER TABLE places DROP COLUMN cuisine_secondary;

-- Revert Prisma schema
git checkout HEAD -- prisma/schema.prisma

-- Regenerate client
npx prisma generate
```

No existing data would be affected.

---

## Technical Notes

### PostgreSQL Array Type
- `cuisine_secondary` uses native PostgreSQL `TEXT[]` type
- Supports multi-value cuisines (e.g., "Korean BBQ" → [Korean, BBQ])
- Default `[]` prevents NULL handling issues
- Queryable with `@>` (contains) operator

### Schema Design
- Nullable `cuisinePrimary` acknowledges TBD state
- Non-nullable array prevents NULL vs empty confusion
- Clear naming: "Primary" vs "Secondary" (not "Main"/"Other")
- Explicit `@map()` for snake_case DB columns

### Migration Strategy
- Used `prisma db push` (not `migrate dev`) due to existing drift
- Push syncs schema without creating migration files
- Appropriate for additive-only changes in active development

---

**Date**: 2026-02-14  
**Version**: 1.0  
**Status**: ✅ Complete  
**Risk**: Low (additive only)  
**Rollback**: Safe  
**Next**: Checkpoint 5.12 (Cuisine Backfill)
