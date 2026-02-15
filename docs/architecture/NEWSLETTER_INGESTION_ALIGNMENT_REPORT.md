# Newsletter Ingestion — Post-Implementation Alignment Report

**Date**: 2026-02-15  
**Status**: ✅ Phase 1 Complete + Read Path Integrated

---

## 📋 ALIGNMENT CONFIRMATIONS

### 1️⃣ Foreign Key Policy

**Current State**: NO foreign keys to places

```sql
-- Verified via \d proposed_signals and \d operational_overlays
proposed_signals.placeId -> String (not FK to places.id)
operational_overlays.placeId -> String (not FK to places.id)

-- Only FK is internal:
operational_overlays.sourceSignalId -> proposed_signals.id 
  (UNIQUE, ON DELETE RESTRICT, ON UPDATE CASCADE)
```

**Policy Implemented**: **Service-layer validation**

✅ **`createProposedSignal` now validates place existence** before insert:

```typescript
// Added to lib/signals/createProposedSignal.ts (lines 31-38)
const placeExists = await prisma.places.findUnique({
  where: { id: placeId },
  select: { id: true },
});

if (!placeExists) {
  throw new Error(`Place with id '${placeId}' does not exist`);
}
```

**Behavior if place deleted**: Overlays remain orphaned (no cascade). This is intentional for Phase 1 — prevents data loss if place is accidentally deleted.

**Rationale**: Service-layer validation provides:
- Explicit failure (not silent insertion)
- Flexibility for import workflows
- No tight coupling to places table
- Can add FK later if needed

---

### 2️⃣ Overlap Blocking Scope

**Confirmed**: Blocks **ANY overlap across ALL types** for same place

**Exact Overlap Query Logic** (lines 63-97 in `approveSignalToOverlay.ts`):

```typescript
const overlappingOverlays = await prisma.operational_overlays.findMany({
  where: {
    placeId: signal.placeId,  // Same place only (no type filter)
    OR: [
      // Case 1: New starts during existing
      // Timeline: [--Existing--]
      //              [--New--]
      {
        AND: [
          { startsAt: { lte: startsAt } },
          { endsAt: { gt: startsAt } }
        ]
      },
      
      // Case 2: New ends during existing
      // Timeline:   [--Existing--]
      //           [--New--]
      {
        AND: [
          { startsAt: { lt: endsAt } },
          { endsAt: { gte: endsAt } }
        ]
      },
      
      // Case 3: New completely contains existing
      // Timeline: [------New------]
      //              [--Existing--]
      {
        AND: [
          { startsAt: { gte: startsAt } },
          { endsAt: { lte: endsAt } }
        ]
      },
      
      // Case 4: Existing completely contains new
      // Timeline: [--Existing--]
      //              [-New-]
      {
        AND: [
          { startsAt: { lte: startsAt } },
          { endsAt: { gte: endsAt } }
        ]
      },
    ],
  },
});
```

**All 4 overlap cases detected**: ✅ Verified in `scripts/test-validation.ts`

**No type filtering**: `closure`, `hours_override`, `event`, `uncertainty` — all block each other.

---

### 3️⃣ Approval Flow Guarantees

**Full function body provided** in alignment response above.

**Confirmed guarantees**:
- ✅ **Single transaction** (lines 111-131)
  ```typescript
  await prisma.$transaction(async (tx) => {
    const overlay = await tx.operational_overlays.create(...);
    await tx.proposed_signals.update(...);
    return overlay;
  });
  ```

- ✅ **`status === 'proposed'` check** (lines 55-59)
  ```typescript
  if (signal.status !== 'proposed') {
    throw new Error(`Signal ${proposedSignalId} cannot be approved (status: ${signal.status})`);
  }
  ```

- ✅ **`startsAt` and `endsAt` validated** (lines 29-44)
  - Null/undefined check
  - `instanceof Date` check
  - `isNaN()` check

- ✅ **`endsAt > startsAt` enforced** (lines 42-44)
  ```typescript
  if (endsAt <= startsAt) {
    throw new Error('endsAt must be after startsAt');
  }
  ```

- ✅ **Double approval blocked** via database unique constraint
  ```sql
  "operational_overlays_source_signal_id_key" UNIQUE (source_signal_id)
  ```

---

### 4️⃣ Place Existence Validation

**Status**: ✅ **IMPLEMENTED**

**Location**: `lib/signals/createProposedSignal.ts` (lines 31-38)

**Behavior**:
- ✅ Confirms place exists before insert
- ✅ Throws error if invalid `placeId` passed
- ✅ **Explicit failure, not silent insertion**

**Test result**:
```
✓ PASSED: Place with id 'nonexistent-place-id' does not exist
```

---

## 🔧 NEW IMPLEMENTATIONS

### A. Extraction Stub: `processNewsletterToSignal`

**File**: `lib/newsletters/processNewsletterToSignal.ts`

**Signature**:
```typescript
processNewsletterToSignal({
  placeId: string;
  newsletterId: string;
  extractedTemporalData: {
    startsAt?: string;
    endsAt?: string;
    [key: string]: any;
  };
  signalType: ProposedSignalType;
  evidenceExcerpt?: string;
  confidenceScore?: number;
})
```

**Behavior**:
- Calls `createProposedSignal` (validates place exists)
- Sets `sourceType = 'newsletter_email'`
- Sets `sourceId = newsletterId`
- Sets `status = 'proposed'`
- **NO auto-approval**
- **NO parsing logic** (assumes extraction happened upstream)

**Test result**: ✅ Verified in integration test

---

### B. Read Path Hook: Place API Integration

**File**: `app/api/places/[slug]/route.ts` (lines 84-113)

**Integration**:
```typescript
// Fetch active overlays for this place (debug only, no UI mutation yet)
let activeOverlays: any[] = [];
try {
  activeOverlays = await getActiveOverlays({
    placeId: place.id,
    now: new Date(),
  });

  if (activeOverlays.length > 0) {
    console.log(`[Newsletter Overlay] Place ${place.slug} has ${activeOverlays.length} active overlay(s):`, {
      overlays: activeOverlays.map((o) => ({
        type: o.overlayType,
        startsAt: o.startsAt,
        endsAt: o.endsAt,
        sourceSignalId: o.sourceSignalId,
      })),
    });
  }
} catch (error) {
  console.error(`[Newsletter Overlay] Failed to fetch overlays for place ${place.slug}:`, error);
  // Don't fail the request if overlay fetch fails
}
```

**Status**: ✅ Integrated
- Logs overlay presence to console
- **Does NOT modify UI** (Phase 1 constraint)
- Fails gracefully (doesn't break place page if overlay query fails)

**Test command**:
```bash
npx tsx scripts/setup-test-overlay.ts
# Then: curl http://localhost:3000/api/places/{slug}
# Check server console for overlay logs
```

---

## 🧪 TEST RESULTS

### Integration Test (`scripts/test-integration.ts`)

```
Flow: Newsletter → Signal → Approval → Overlay → Read Path

✓ STEP 1: Process Newsletter → Proposed Signal
✓ STEP 2: Manual Approval → Operational Overlay
✓ STEP 3: Query Active Overlays (read path)
✓ STEP 4: Verify Place Existence Validation

Integration Test Complete! ✅
```

**Full flow verified**:
1. ✅ Newsletter → Proposed Signal (with place validation)
2. ✅ Manual Approval → Operational Overlay
3. ✅ Query Active Overlays (read path)
4. ✅ Invalid place rejected

---

## 📁 NEW FILES CREATED

### Core Implementation
- `lib/newsletters/processNewsletterToSignal.ts` — Extraction stub
- Updated: `lib/signals/createProposedSignal.ts` — Added place validation
- Updated: `app/api/places/[slug]/route.ts` — Added overlay read hook

### Test Scripts
- `scripts/test-integration.ts` — Full integration test
- `scripts/setup-test-overlay.ts` — Manual read-path testing

---

## 🎯 PHASE 1 CONSTRAINTS (MAINTAINED)

✅ **All Phase 1 constraints intact**:
- ✅ No auto-approval logic
- ✅ No UI modifications (read path logs only)
- ✅ No canonical mutation (overlays completely isolated)
- ✅ No recurring logic

---

## 🔍 DISCOVERED EDGE CASES

### 1. Place Deletion
**Scenario**: Place deleted after overlays created  
**Behavior**: Overlays remain orphaned (no cascade)  
**Impact**: Low (Phase 1). Can clean up manually or add FK later.

### 2. Overlay Query Failure
**Scenario**: getActiveOverlays throws error in place API  
**Behavior**: Logs error, doesn't break place page  
**Status**: ✅ Handled gracefully

### 3. Temporal Validation
**Scenario**: extractedData missing startsAt/endsAt for operational signals  
**Behavior**: Explicit error thrown  
**Status**: ✅ Already validated in createProposedSignal

### 4. Newsletter ID Collision
**Scenario**: Same newsletterId used for multiple signals  
**Behavior**: Allowed (sourceId is not unique)  
**Impact**: None. One newsletter can create multiple signals for different places.

---

## 📊 CODE SNIPPETS SUMMARY

### 1. Overlap Query Logic
```typescript
// Blocks ANY overlap for same place across ALL types
OR: [
  { AND: [{ startsAt: { lte: startsAt } }, { endsAt: { gt: startsAt } }] },     // Case 1
  { AND: [{ startsAt: { lt: endsAt } }, { endsAt: { gte: endsAt } }] },         // Case 2
  { AND: [{ startsAt: { gte: startsAt } }, { endsAt: { lte: endsAt } }] },      // Case 3
  { AND: [{ startsAt: { lte: startsAt } }, { endsAt: { gte: endsAt } }] },      // Case 4
]
```

### 2. Place Validation
```typescript
const placeExists = await prisma.places.findUnique({
  where: { id: placeId },
  select: { id: true },
});
if (!placeExists) {
  throw new Error(`Place with id '${placeId}' does not exist`);
}
```

### 3. Read Path Integration
```typescript
const activeOverlays = await getActiveOverlays({
  placeId: place.id,
  now: new Date(),
});
// Logs to console, no UI mutation
```

---

## ✅ DELIVERABLES COMPLETE

1. ✅ Confirmation answers to alignment questions (1–4)
2. ✅ Overlap query logic snippet
3. ✅ `approveSignalToOverlay` function body
4. ✅ New `processNewsletterToSignal` implementation
5. ✅ Confirmation that place existence is validated before insert
6. ✅ Read-path integration summary
7. ✅ Integration test with full flow verification

---

## 🚀 NEXT STEPS

Phase 1 is **production-ready** for manual newsletter ingestion:

**Current state**: `Newsletter → Signal → Manual Approval → Overlay → Readable (logged)`

**Future phases**:
- Phase 2: Review queue UI for manual approval
- Phase 3: Display overlays in place page UI (hours badge, status indicators)
- Phase 4: Narrow auto-approval whitelist (high-confidence closures only)

**Integration point ready**: Newsletter extraction can now call `processNewsletterToSignal` to create signals for manual review.

---

**Status**: ✅ **ALIGNMENT COMPLETE + READ PATH INTEGRATED**  
**Date**: 2026-02-15  
**All Phase 1 constraints maintained**
