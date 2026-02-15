# Newsletter Ingestion — Phase 1 Implementation Summary

## Overview

This implementation adds the Newsletter Ingestion Approval Framework v1 to saiko-maps, enabling the ingestion of verified operator newsletters as high-authority operational deltas (closures, events, temporary overrides) while preventing silent drift in canonical data.

**Status**: ✅ Complete (Phase 1: Manual Review Only)

---

## What Was Built

### 1. Documentation
- **`/docs/architecture/NEWSLETTER_INGESTION_APPROVAL_V1.md`**  
  Complete architectural specification including:
  - Two-table hybrid design rationale
  - Source authority rules
  - Canonical mutation rules (defensive)
  - Display model (confidence-first)
  - Approval framework (Phase 1: manual only)
  - Explicit exclusions and tricky edge cases

### 2. Database Schema

**Migration**: `20260215132000_newsletter_ingestion_approval_v1`

**New Enums**:
- `SignalSourceType`: `newsletter_email`
- `ProposedSignalType`: `closure | hours_override | event | recurring_program | uncertainty`
- `ProposedSignalStatus`: `proposed | approved | rejected | superseded`
- `OverlayType`: `closure | hours_override | event | uncertainty`
- `OverlayApprovalMethod`: `manual`

**New Tables**:

#### `proposed_signals`
Immutable extraction records from newsletters with provenance.

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | Primary key (cuid) |
| `place_id` | String | FK to places |
| `source_type` | SignalSourceType | Always `newsletter_email` in Phase 1 |
| `source_id` | String | Email message-id or stored email record id |
| `signal_type` | ProposedSignalType | Type of signal extracted |
| `extracted_data` | Json | Structured extraction (includes temporal markers) |
| `confidence_score` | Float? | Optional confidence (not used for auto-approval in v1) |
| `evidence_excerpt` | String? | Short excerpt from source |
| `status` | ProposedSignalStatus | Workflow state (default: `proposed`) |
| `created_at` | DateTime | Extraction timestamp |
| `updated_at` | DateTime | Last status change |

**Indexes**: `place_id`, `status`, `signal_type`, `created_at`

#### `operational_overlays`
Approved, time-bounded state used by render logic.

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | Primary key (cuid) |
| `place_id` | String | FK to places |
| `source_signal_id` | String | FK to `proposed_signals` (unique) |
| `overlay_type` | OverlayType | Type of overlay |
| `starts_at` | DateTime | Overlay activation time |
| `ends_at` | DateTime | Overlay expiration time (auto-expire) |
| `override_data` | Json? | Optional override state |
| `approval_method` | OverlayApprovalMethod | Always `manual` in Phase 1 |
| `created_at` | DateTime | Approval timestamp |

**Indexes**: `place_id`, `starts_at`, `ends_at`

### 3. Helper Functions

#### `/lib/signals/createProposedSignal.ts`
Creates a proposed signal from newsletter extraction.

**Features**:
- Validates temporal markers for operational signal types
- Sets status to `proposed` by default
- Preserves full extraction provenance

**Usage**:
```typescript
import { createProposedSignal } from '@/lib/signals/createProposedSignal';

const signal = await createProposedSignal({
  placeId: 'place-id-123',
  sourceId: 'email-message-id-456',
  signalType: 'hours_override',
  extractedData: {
    startsAt: '2026-02-20T18:00:00Z',
    endsAt: '2026-02-20T22:00:00Z',
    reason: 'Private event',
  },
  evidenceExcerpt: 'Closed for private event 6pm-10pm',
  confidenceScore: 0.95,
});
```

#### `/lib/overlays/approveSignalToOverlay.ts`
Approves a proposed signal and creates an operational overlay.

**Defensive checks**:
- Signal must be in `proposed` status
- `endsAt` must be after `startsAt`
- No overlapping overlays for the same place

**Features**:
- Transactional (overlay creation + signal status update)
- Prevents conflicting overlays

**Usage**:
```typescript
import { approveSignalToOverlay } from '@/lib/overlays/approveSignalToOverlay';

const overlay = await approveSignalToOverlay({
  proposedSignalId: signal.id,
  startsAt: new Date('2026-02-20T18:00:00Z'),
  endsAt: new Date('2026-02-20T22:00:00Z'),
  overlayType: 'hours_override',
  overrideData: { closedForEvent: true },
});
```

#### `/lib/overlays/getActiveOverlays.ts`
Queries active overlays for a place at a given time.

**Query logic**: `startsAt <= now AND endsAt > now`

**Usage**:
```typescript
import { getActiveOverlays } from '@/lib/overlays/getActiveOverlays';

const activeOverlays = await getActiveOverlays({
  placeId: 'place-id-123',
  now: new Date(), // optional, defaults to now
});
```

### 4. Demo Script

**`/scripts/demo-newsletter-overlays.ts`**

Demonstrates the complete Phase 1 workflow:
1. Create a proposed signal
2. Approve it to create an overlay
3. Query active overlays at different time points

**Run**:
```bash
# Use a specific place
PLACE_ID=your-place-id npx tsx scripts/demo-newsletter-overlays.ts

# Or let it pick the first available place
npx tsx scripts/demo-newsletter-overlays.ts
```

**Output**: Full trace with visual separators showing each step of the workflow.

---

## Phase 1 Constraints (By Design)

✅ **Included**:
- Manual approval workflow
- Two-table hybrid (proposed → approved → overlay)
- Defensive overlap checking
- Temporal bounds validation
- Provenance preservation

❌ **Explicitly NOT Included** (Deferred to Phase 2+):
- Auto-approval logic (no whitelists)
- UI for review queue
- Canonical mutation (overlays only supersede during active window)
- Recurring programming auto-approval
- Holiday ambiguity handling (require manual review)

---

## Verification

Demo output shows:
- ✅ Signal creation with provenance
- ✅ Approval with overlap checking
- ✅ Active overlay queries with correct temporal logic
- ✅ Auto-expiration behavior (no overlays outside time window)

---

## Next Steps (Future Phases)

**Phase 2 candidates** (not implemented):
- Narrow auto-approval whitelist for high-confidence closures
- Recurring programming revalidation cadence
- Conflicting source flagging (website vs newsletter)
- Uncertainty signal TTL implementation
- Review queue UI

---

## Files Created

```
docs/architecture/NEWSLETTER_INGESTION_APPROVAL_V1.md
prisma/migrations/20260215132000_newsletter_ingestion_approval_v1/migration.sql
lib/signals/createProposedSignal.ts
lib/overlays/approveSignalToOverlay.ts
lib/overlays/getActiveOverlays.ts
scripts/demo-newsletter-overlays.ts
docs/architecture/NEWSLETTER_INGESTION_IMPLEMENTATION_SUMMARY.md (this file)
```

## Prisma Schema Changes

Added to `/prisma/schema.prisma`:
- 5 enums
- 2 models (`proposed_signals`, `operational_overlays`)
- 8 indexes
- 1 foreign key constraint

---

## Installation

Already complete! The migration has been applied to the database.

To inspect data:
```bash
npx prisma studio
```

Navigate to `proposed_signals` and `operational_overlays` tables.

---

**Implementation complete**: Phase 1 manual approval workflow is fully functional and ready for integration with newsletter extraction pipeline.
