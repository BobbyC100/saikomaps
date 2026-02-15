# ✅ CHECKPOINT 5.10.2A - SOURCE NORMALIZATION COMPLETE

**Date:** February 14, 2026  
**Status:** ✅ COMPLETE

---

## 🎯 OBJECTIVE

Merge duplicate source entries to unify trust graph attribution under canonical publication names.

---

## 📊 RESULTS

### Before Normalization
```
Michelin Guide     77 coverages
MICHELIN Guide     36 coverages  (duplicate)
Los Angeles Times  17 coverages
LA Times           58 coverages  (duplicate)
```

**Issue:** Fragmented source counts, inaccurate weighting, confusing UI

---

### After Normalization
```
Michelin Guide     113 coverages  (77 + 36 merged)
Los Angeles Times   75 coverages  (17 + 58 merged)
```

**Result:** ✅ Unified canonical names, accurate attribution

---

## 🔧 IMPLEMENTATION

### Scripts Created

**1. `scripts/merge-sources.ts`**
- Transaction-safe source merging
- Dry-run support for testing
- Idempotent operation (safe to rerun)
- Updates `place_coverages.sourceId`
- Deletes duplicate source row

**2. `scripts/verify-sources.ts`**
- Pre/post verification helper
- Shows source IDs and coverage counts
- Quick sanity check

---

## ✅ VERIFICATION

### Pre-Merge State
```bash
$ npx tsx scripts/verify-sources.ts

Sources:
┌─────────┬─────────────────────────────┬─────────────────────┐
│ (index) │ id                          │ name                │
├─────────┼─────────────────────────────┼─────────────────────┤
│ 0       │ 'cmln9hn12000lkfxxidi4amq7' │ 'Michelin Guide'    │
│ 1       │ 'cmln9hn2g003okfxx28mk0e0j' │ 'LA Times'          │
│ 2       │ 'cmln9hn4y00bxkfxxrg0wt90x' │ 'Los Angeles Times' │
│ 3       │ 'cmlnacgzl0000kf7493w7c94x' │ 'MICHELIN Guide'    │
└─────────┴─────────────────────────────┴─────────────────────┘

Coverages by sourceId:
┌─────────┬──────────────┬─────────────────────────────┐
│ (index) │ _count       │ sourceId                    │
├─────────┼──────────────┼─────────────────────────────┤
│ 0       │ { _all: 77 } │ 'cmln9hn12000lkfxxidi4amq7' │
│ 1       │ { _all: 58 } │ 'cmln9hn2g003okfxx28mk0e0j' │
│ 2       │ { _all: 17 } │ 'cmln9hn4y00bxkfxxrg0wt90x' │
│ 3       │ { _all: 36 } │ 'cmlnacgzl0000kf7493w7c94x' │
└─────────┴──────────────┴─────────────────────────────┘
```

---

### Dry Run
```bash
$ npx tsx scripts/merge-sources.ts --dry-run

merge-sources.ts
dryRun=true

→ Merge "LA Times" → "Los Angeles Times"
   dupId=cmln9hn2g003okfxx28mk0e0j
   canonicalId=cmln9hn4y00bxkfxxrg0wt90x
   coverages_to_move=58

→ Merge "MICHELIN Guide" → "Michelin Guide"
   dupId=cmlnacgzl0000kf7493w7c94x
   canonicalId=cmln9hn12000lkfxxidi4amq7
   coverages_to_move=36

Done.

┌─────────┬──────────────────┬─────────────────────┬───────────┬───────────────┐
│ (index) │ from             │ to                  │ status    │ coverageCount │
├─────────┼──────────────────┼─────────────────────┼───────────┼───────────────┤
│ 0       │ 'LA Times'       │ 'Los Angeles Times' │ 'DRY_RUN' │ 58            │
│ 1       │ 'MICHELIN Guide' │ 'Michelin Guide'    │ 'DRY_RUN' │ 36            │
└─────────┴──────────────────┴─────────────────────┴───────────┴───────────────┘
```

---

### Actual Merge
```bash
$ npx tsx scripts/merge-sources.ts

merge-sources.ts
dryRun=false

→ Merge "LA Times" → "Los Angeles Times"
   dupId=cmln9hn2g003okfxx28mk0e0j
   canonicalId=cmln9hn4y00bxkfxxrg0wt90x
   coverages_to_move=58
   ✅ moved=58 (canonical now has 75)

→ Merge "MICHELIN Guide" → "Michelin Guide"
   dupId=cmlnacgzl0000kf7493w7c94x
   canonicalId=cmln9hn12000lkfxxidi4amq7
   coverages_to_move=36
   ✅ moved=36 (canonical now has 113)

Done.

┌─────────┬──────────────────┬─────────────────────┬──────────┬───────┐
│ (index) │ from             │ to                  │ status   │ moved │
├─────────┼──────────────────┼─────────────────────┼──────────┼───────┤
│ 0       │ 'LA Times'       │ 'Los Angeles Times' │ 'MERGED' │ 58    │
│ 1       │ 'MICHELIN Guide' │ 'Michelin Guide'    │ 'MERGED' │ 36    │
└─────────┴──────────────────┴─────────────────────┴──────────┴───────┘
```

---

### Post-Merge State
```bash
$ npx tsx scripts/verify-sources.ts

Sources:
┌─────────┬─────────────────────────────┬─────────────────────┐
│ (index) │ id                          │ name                │
├─────────┼─────────────────────────────┼─────────────────────┤
│ 0       │ 'cmln9hn12000lkfxxidi4amq7' │ 'Michelin Guide'    │
│ 1       │ 'cmln9hn4y00bxkfxxrg0wt90x' │ 'Los Angeles Times' │
└─────────┴─────────────────────────────┴─────────────────────┘

Coverages by sourceId:
┌─────────┬───────────────┬─────────────────────────────┐
│ (index) │ _count        │ sourceId                    │
├─────────┼───────────────┼─────────────────────────────┤
│ 0       │ { _all: 113 } │ 'cmln9hn12000lkfxxidi4amq7' │
│ 1       │ { _all: 75 }  │ 'cmln9hn4y00bxkfxxrg0wt90x' │
└─────────┴───────────────┴─────────────────────────────┘
```

✅ **Verification:** Only 2 sources remain (duplicates deleted)

---

### Coverage Stats Unchanged
```bash
$ npx tsx scripts/verify-coverage.ts

=== LA Coverage Status ===
Total places: 434
Places with coverage: 369
Coverage: 85%

=== Top Coverage Sources ===
The Infatuation: 153
Michelin Guide: 113      (was 77 + 36)
Eater LA: 105
Time Out LA: 78
Los Angeles Times: 75    (was 58 + 17)
LA Magazine: 9
LAist: 6
Resy: 6
The Eastsider LA: 4
KCRW Good Food: 4
```

✅ **Verification:** Coverage total unchanged, source counts unified

---

## 🏆 IMPACT

### Trust Graph
- ✅ Unified attribution under canonical names
- ✅ Accurate source weighting for algorithms
- ✅ Cleaner UI display (no duplicate entries)
- ✅ Correct coverage counts

### Data Quality
- ✅ Michelin Guide now shows true authority (113 vs 77)
- ✅ Los Angeles Times properly credited (75 vs 17)
- ✅ No fragmentation in source analytics
- ✅ Single source of truth per publication

### Developer Experience
- ✅ Transaction-safe merge script (reusable)
- ✅ Dry-run capability (safe testing)
- ✅ Verification script (quick checks)
- ✅ Idempotent operations (safe to rerun)

---

## 📝 TECHNICAL DETAILS

### Merge Logic
1. **Ensure Canonical Source Exists**
   - Find or create canonical source with approved status
   
2. **Find Duplicate Source**
   - Locate duplicate by name
   - Skip if not found (idempotent)
   
3. **Count Affected Coverages**
   - Query `place_coverages` pointing to duplicate
   
4. **Transaction-Safe Migration**
   - Update all `place_coverages.sourceId` → canonical ID
   - Delete duplicate `sources` row
   - Both operations in single transaction

5. **Verify Result**
   - Count coverages now pointing to canonical
   - Confirm merge successful

### Safety Features
- **Transaction wrapping:** All-or-nothing updates
- **Idempotent:** Safe to rerun if interrupted
- **Dry-run mode:** Preview changes without writes
- **Verification script:** Quick pre/post checks
- **FK constraint protection:** Will fail if other tables reference sources

---

## 📦 FILES

**Scripts:**
- `scripts/merge-sources.ts` (141 lines)
- `scripts/verify-sources.ts` (verification helper)

**Commit:** `7d91fb7`

---

## 🎯 FUTURE CONSIDERATIONS

### Additional Normalizations (If Needed)
Current source distribution shows no other obvious duplicates:
```
The Infatuation: 153
Eater LA: 105
Time Out LA: 78
LA Magazine: 9
LAist: 6
KCRW Good Food: 4
```

All names appear canonical. No further merging needed at this time.

### Reusability
The `merge-sources.ts` script is generic and reusable:
- Add new merge pairs to `MERGES` array
- Run dry-run to preview
- Execute merge
- Verify with `verify-sources.ts`

Example for future use:
```typescript
const MERGES: MergePair[] = [
  { from: "TimeOut LA", to: "Time Out LA" },
  { from: "LA Mag", to: "LA Magazine" },
];
```

---

## ✅ CERTIFICATION

I certify that as of commit `7d91fb7`:

1. ✅ **LA Times variants merged:** 58 + 17 = 75 total under "Los Angeles Times"
2. ✅ **Michelin variants merged:** 36 + 77 = 113 total under "Michelin Guide"
3. ✅ **Duplicate sources deleted:** 4 sources → 2 sources (for these publications)
4. ✅ **Coverages preserved:** All 94 coverages successfully repointed
5. ✅ **Coverage total unchanged:** 369/434 (85%) maintained
6. ✅ **Transaction safety:** All updates completed atomically
7. ✅ **Verification confirmed:** No duplicate source names remain

**Status:** Source normalization complete. Trust graph unified under canonical names.

---

**Certified by:** Cursor AI (Checkpoint 5.10.2A)  
**Date:** February 14, 2026  
**Method:** Transaction-safe merge with dry-run testing  
**Evidence:** Pre/post verification via `verify-sources.ts`

---

*This normalization establishes clean foundation for source-based trust weighting and analytics.*
