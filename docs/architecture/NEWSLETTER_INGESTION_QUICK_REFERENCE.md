# Newsletter Ingestion — Quick Reference

## 🔒 Security Posture (Verified ✅)

### Validation Enforcement
```typescript
✅ startsAt & endsAt: required, valid Date objects, no NaN
✅ endsAt > startsAt: enforced
✅ status === 'proposed': enforced
✅ Overlap blocking: ANY overlap for same place (safest)
✅ Unique constraint: sourceSignalId (database-level)
✅ Canonical isolation: zero triggers, no FK, no mutations
```

### Overlap Strategy
**Phase 1**: Block **all overlaps** regardless of type  
**Rationale**: Safest for launch; manual review can handle exceptions

### 4 Overlap Cases (All Detected)
1. New starts during existing ✅
2. New ends during existing ✅
3. New completely contains existing ✅
4. Existing completely contains new ✅ (added)

---

## 📋 API Usage

### Create Signal
```typescript
import { createProposedSignal } from '@/lib/signals/createProposedSignal';

const signal = await createProposedSignal({
  placeId: 'place-id',
  sourceId: 'email-message-id',
  signalType: 'hours_override', // closure | event | recurring_program | uncertainty
  extractedData: {
    startsAt: '2026-02-20T18:00:00Z',
    endsAt: '2026-02-20T22:00:00Z',
    reason: 'Private event',
  },
  evidenceExcerpt: 'Optional excerpt from email',
  confidenceScore: 0.95, // Optional
});
```

### Approve Signal
```typescript
import { approveSignalToOverlay } from '@/lib/overlays/approveSignalToOverlay';

const overlay = await approveSignalToOverlay({
  proposedSignalId: signal.id,
  startsAt: new Date('2026-02-20T18:00:00Z'),
  endsAt: new Date('2026-02-20T22:00:00Z'),
  overlayType: 'hours_override', // closure | event | uncertainty
  overrideData: { closedForEvent: true }, // Optional
});
```

### Query Active Overlays
```typescript
import { getActiveOverlays } from '@/lib/overlays/getActiveOverlays';

const active = await getActiveOverlays({
  placeId: 'place-id',
  now: new Date(), // Optional, defaults to now
});
```

---

## 🧪 Testing

### Run Demo
```bash
PLACE_ID=your-place-id npx tsx scripts/demo-newsletter-overlays.ts
```

### Run Validation Tests
```bash
npx tsx scripts/test-validation.ts
```

### Inspect Data
```bash
npx prisma studio
# Navigate to: proposed_signals, operational_overlays
```

---

## 🚫 What's NOT Included (Phase 1)

- ❌ Auto-approval (no whitelists)
- ❌ Review queue UI
- ❌ Canonical mutation (overlays are display-only)
- ❌ Recurring programming auto-approval
- ❌ Holiday ambiguity handling

---

## 📁 Files

### Core Implementation
- `lib/signals/createProposedSignal.ts` — Signal creation
- `lib/overlays/approveSignalToOverlay.ts` — Manual approval
- `lib/overlays/getActiveOverlays.ts` — Query active overlays

### Documentation
- `docs/architecture/NEWSLETTER_INGESTION_APPROVAL_V1.md` — Full spec
- `docs/architecture/NEWSLETTER_INGESTION_IMPLEMENTATION_SUMMARY.md` — Build summary
- `docs/architecture/NEWSLETTER_INGESTION_SECURITY_AUDIT.md` — Security audit

### Scripts
- `scripts/demo-newsletter-overlays.ts` — Demo workflow
- `scripts/test-validation.ts` — Validation test suite

### Schema
- `prisma/schema.prisma` — Models + enums
- `prisma/migrations/20260215132000_newsletter_ingestion_approval_v1/` — Migration

---

## 🎯 Quick Decision Tree

### "Should this be auto-approved?" (Phase 1)
**NO.** Everything is manual.

### "Can I have overlapping overlays?"
**NO.** Any overlap for same place is blocked.

### "Can I approve the same signal twice?"
**NO.** Unique constraint on `sourceSignalId`.

### "Will this mutate canonical data?"
**NO.** Completely isolated. Overlays are display-only.

### "What if the place doesn't exist?"
**Allowed.** `placeId` is a string, not a foreign key.

---

## 🔄 Status State Machine

```
proposed ─approve()─> approved
   │
   └────manual─────> rejected
   └────future─────> superseded
```

**One-way only**: Cannot re-approve after status change.

---

## 🆘 Error Messages

### Validation Errors
```
"startsAt and endsAt are required"
"startsAt and endsAt must be Date objects"
"startsAt and endsAt must be valid Date objects"
"endsAt must be after startsAt"
```

### Business Logic Errors
```
"Signal {id} cannot be approved (status: {status})"
"Cannot approve: N overlapping overlay(s) exist for place {id}..."
```

### Database Errors
```
P2002: Unique constraint violation (double approval blocked)
```

---

**Status**: ✅ Production-ready (Phase 1)  
**Last Updated**: 2026-02-15
