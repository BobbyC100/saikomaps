# Refactoring Assessment — Saiko Maps

**Date:** Feb 7, 2026  
**Status:** Code review after major feature additions

---

## 📊 Current State

### What We Built (This Session)
- **Chef Recs System** - 62 recs across 36 places
- **People Model** - Person, PersonPlace with full attribution
- **Restaurant Groups** - 17 groups with 24 linked places
- **Place Status** - open/closed/permanently-closed enum
- **10+ new scripts** - CLI tools for all new features

### File Count
- **63 scripts** in `/scripts` directory
- **18 lib files** in `/lib` directory
- **Multiple batch importers** for different data sources

---

## 🔍 Refactoring Opportunities

### ✅ **LOW PRIORITY** (Code is clean, works well)

#### 1. CLI Argument Parsing
**Pattern:** 11 scripts have `parseArgs()` functions with manual argument parsing

**Current state:** ✅ **GOOD** - Each script has custom args for its specific use case
- Simple, readable, no dependencies
- Easy to understand what each script does
- No external CLI library needed

**Refactoring?** ❌ **Not recommended**
- Would add complexity without clear benefit
- Each script has unique argument needs
- Current approach is explicit and maintainable

---

#### 2. Case Conversion (toUpperCase/toLowerCase)
**Pattern:** 32 instances across scripts for Prisma enum handling

**Current state:** ✅ **ACCEPTABLE** - Required for Prisma enum mapping
- Prisma stores enums as UPPERCASE
- TypeScript types use lowercase
- Conversion is necessary at boundaries

**Refactoring?** ⚠️ **OPTIONAL** - Could create helper in `lib/people-groups.ts`
```typescript
// Potential helper
export function toPrismaEnum<T>(value: string): T {
  return value.toUpperCase() as T
}

export function fromPrismaEnum(value: string): string {
  return value.toLowerCase()
}
```

**Recommendation:** Only if it becomes painful. Current code is clear.

---

#### 3. Fuzzy Search Pattern
**Pattern:** Many scripts use same pattern:
```typescript
const place = await db.place.findFirst({
  where: {
    OR: [
      { name: { contains: search, mode: 'insensitive' } },
      { slug: search.toLowerCase() }
    ]
  }
})
```

**Current state:** ✅ **GOOD** - Explicit and readable
- Pattern is consistent
- Easy to understand what it does
- No abstraction needed for ~10 lines

**Refactoring?** ⚠️ **OPTIONAL** - Could create `lib/queries.ts`
```typescript
export async function findPlaceByNameOrSlug(search: string) {
  return db.place.findFirst({
    where: {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: search.toLowerCase() }
      ]
    }
  })
}

export async function findPersonByNameOrSlug(search: string) { ... }
export async function findGroupByNameOrSlug(search: string) { ... }
```

**Benefit:** DRY, easier to update search logic globally
**Cost:** Less explicit, one more file to maintain

**Recommendation:** ⭐ **WORTH DOING** - This pattern repeats frequently

---

### ✅ **MEDIUM PRIORITY** (Would improve maintainability)

#### 4. Validation Helpers - Case Handling
**Issue:** `lib/people-groups.ts` validation accepts both cases:
```typescript
const validRoles: string[] = ['chef', 'owner', 'CHEF', 'OWNER']
```

**Current state:** ⚠️ **BRITTLE** - Manually listing all case variations

**Refactoring:** ⭐ **RECOMMENDED**
```typescript
// Better approach
export function validatePersonRole(role: string): boolean {
  const validRoles: PersonRole[] = ['chef', 'owner', 'operator', 'founder', 'partner']
  return validRoles.includes(role.toLowerCase() as PersonRole)
}

export function toPrismaPersonRole(role: PersonRole | string): string {
  return role.toUpperCase()
}
```

**Benefit:** Single source of truth, easier to extend
**Effort:** 30 minutes

---

#### 5. Script Organization
**Current:** 63 scripts in flat `/scripts` directory

**Refactoring:** ⭐ **RECOMMENDED** - Organize by domain
```
scripts/
  ├── people/
  │   ├── add-person.ts
  │   ├── view-person.ts
  │   └── link-person-place.ts
  ├── groups/
  │   ├── add-restaurant-group.ts
  │   ├── view-restaurant-group.ts
  │   ├── batch-import-la-groups.ts
  │   └── link-groups-to-places.ts
  ├── chef-recs/
  │   ├── add-chef-rec.ts
  │   ├── view-chef-recs.ts
  │   ├── analyze-chef-recs-vs-awards.ts
  │   └── batch-add-*.ts
  ├── import/
  │   └── import-*.ts (29 files)
  ├── coverage/
  │   ├── coverage-report.ts
  │   └── la-county-coverage.ts
  └── utils/
      ├── find-*.ts
      └── cleanup-*.ts
```

**Benefit:** Easier to find scripts, clearer organization
**Cost:** Need to update any documentation with script paths
**Effort:** 1 hour

---

### ❌ **LOW/NO PRIORITY** (Already good)

#### 6. Batch Import Scripts
**Current:** Multiple batch importers (LA Times, Resy, Timeout, etc.)

**Should we consolidate?** ❌ **NO**
- Each has unique data structure
- Each has unique source attribution
- Separate scripts = clear audit trail
- Easy to re-run specific imports

**Verdict:** Keep as-is ✅

---

#### 7. Type Definitions
**Current:** Types in `lib/people-groups.ts` and `lib/chef-recs.ts`

**Should we consolidate?** ❌ **NO**
- Types are domain-specific
- Separation matches mental model
- No circular dependencies

**Verdict:** Structure is good ✅

---

#### 8. Database Queries
**Current:** Queries inline in scripts

**Should we extract to repository layer?** ❌ **NOT YET**
- Scripts are one-off tools, not application code
- Prisma client is already well-abstracted
- No complex query logic to reuse

**Verdict:** Wait until UI needs shared queries ✅

---

## 🎯 Recommended Refactoring Priority

### 1. ⭐ Create Query Helpers (HIGH VALUE, LOW EFFORT)
**File:** `lib/queries.ts`
**Functions:**
- `findPlaceByNameOrSlug(search)`
- `findPersonByNameOrSlug(search)`
- `findGroupByNameOrSlug(search)`

**Impact:** Reduces duplication in ~15 scripts
**Effort:** 30 minutes
**Risk:** Low

---

### 2. ⭐ Improve Enum Validation (MEDIUM VALUE, LOW EFFORT)
**File:** `lib/people-groups.ts`
**Changes:**
- Extract validation functions
- Use `.toLowerCase()` normalization
- Single source of truth for valid values

**Impact:** More maintainable validation
**Effort:** 30 minutes
**Risk:** Low

---

### 3. ⭐ Organize Scripts by Domain (MEDIUM VALUE, MEDIUM EFFORT)
**Move scripts into folders:**
- `scripts/people/`
- `scripts/groups/`
- `scripts/chef-recs/`
- `scripts/import/`

**Impact:** Easier navigation, clearer structure
**Effort:** 1 hour
**Risk:** Medium (update docs, package.json scripts)

---

### 4. ⚠️ Optional: Enum Conversion Helpers (LOW VALUE)
**File:** `lib/enums.ts` or add to `lib/people-groups.ts`

Only do if enum handling becomes painful.

---

## 📝 Things That Are Fine

### ✅ No Refactoring Needed

1. **Manual argument parsing** - Simple, explicit, works well
2. **Separate batch importers** - Clear audit trail, good separation
3. **Type organization** - Domain-specific, no circular deps
4. **Inline queries in scripts** - Scripts are tools, not app code
5. **Validation with sources** - Attribution is working correctly
6. **CLI output formatting** - Consistent, readable, helpful

---

## 🚦 Decision: Refactor or Not?

### Recommended Approach: **Incremental Improvements**

**Do now (30-60 min total):**
1. Create `lib/queries.ts` with find helpers
2. Improve enum validation in `lib/people-groups.ts`

**Do later (when adding more scripts):**
3. Organize scripts into folders
4. Add enum conversion helpers if needed

**Don't do:**
- Consolidate batch importers
- Extract repository layer
- Replace manual arg parsing
- Over-abstract validation

---

## 🎯 Verdict

**Current code quality: 8/10** ✅

The codebase is **well-structured and maintainable**. The suggested refactorings are **nice-to-haves**, not critical issues.

### Key Strengths
- ✅ Clear separation of concerns
- ✅ Consistent patterns
- ✅ Good attribution/documentation
- ✅ Each script has single responsibility
- ✅ No premature abstraction

### Minor Improvements Available
- Query helper functions (DRY)
- Script organization (navigation)
- Enum validation (maintainability)

---

## 💡 Recommendation

**Ship it as-is** ✅

The refactorings identified are incremental improvements, not blockers. The current structure is solid and maintainable.

**Only refactor if:**
1. You're adding 10+ more scripts (then organize folders)
2. Query patterns become painful (then add helpers)
3. Enum handling gets complex (then add utilities)

Otherwise, **keep building features**. The foundation is good.

---

**tl;dr: Code is clean. Minor improvements available. Not urgent. Keep shipping. 🚀**
