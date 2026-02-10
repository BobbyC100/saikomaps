# Saiko Maps - Provenance System

**Chain of Custody for Places**

Every place in Saiko Maps must have a provenance record proving it was added by Bobby, not AI.

## The Rule

```
AI cannot add places. AI can only process places that Bobby added.
```

## Quick Start

### Run an audit

```bash
npm run audit
```

Output:
```
🔍 SAIKO MAPS PROVENANCE AUDIT
════════════════════════════════════════════════════════════

📊 SUMMARY
────────────────────────────────────
  Total places:        1,320
  With provenance:     1,320
  Without provenance:  0

👤 ADDED BY (Chain of Custody)
────────────────────────────────────
  ✓ bobby_bulk_import: 1,320

════════════════════════════════════════════════════════════
✅ AUDIT PASSED
All places have provenance records with human approval.
════════════════════════════════════════════════════════════
```

### What triggers a failure

1. **Orphan places** - Places with no provenance record at all
2. **AI-added places** - Provenance with `addedBy` containing: claude, cursor, ai, auto, bot, etc.

## Daily Workflow

### Adding New Places via CSV

1. Claude researches and generates CSV (AI work)
2. CSV sits in `/data/` as a **suggestion**
3. Bobby reviews and runs `npm run ingest:csv` - **this is the approval stamp**
4. Import script creates provenance with `addedBy: 'bobby_bulk_import'`

Claude never writes directly to `golden_records`. The CSV is the handoff point.

## Commands

```bash
npm run audit                    # Quick audit check
npm run provenance:audit         # Full audit with details
npm run provenance:backfill      # Backfill provenance for new places
```

## Source Types

| Type | Use Case |
|------|----------|
| `editorial` | From a publication (Eater, Infatuation, LA Times) |
| `google_saves` | Bobby's personal Google Maps saves |
| `chef_rec` | Chef recommendation (link to interview/video if available) |
| `video` | From a video source |
| `personal` | Bobby's personal pick, no external source |
| `map_feature` | Added because it's on a curated Saiko map |

## Forbidden Actors

These values in `addedBy` will **fail the audit**:

- `claude`
- `cursor`
- `ai`
- `auto`
- `automated`
- `system`
- `bot`
- `script` (unless explicitly Bobby-approved)

## Database Schema

```prisma
model provenance {
  id            String    @id @default(cuid())
  place_id      String
  
  // WHO - Chain of custody
  added_by      String    // 'bobby', 'bobby_bulk_import' - NEVER AI
  
  // WHY - Source justification
  source_type   String?   // 'editorial', 'google_saves', 'chef_rec', etc.
  source_name   String?   // 'Eater LA', 'Bobby Google Saves', etc.
  source_url    String?   // article/video link if available
  source_date   DateTime? // when published
  
  // CONTEXT
  notes         String?   // freeform context
  import_batch  String?   // 'sfv_expansion', 'beach_cities', etc.
  
  created_at    DateTime  @default(now())
  
  golden_record golden_records @relation(...)
  
  @@index([place_id])
  @@index([added_by])
  @@index([import_batch])
}
```

## Troubleshooting

### "Found orphan places"

Run backfill:
```bash
npm run provenance:backfill
```

### "AI-added places found"

This is a serious issue. Investigate how it happened and either:
1. Delete the place if it shouldn't exist
2. Update provenance if Bobby actually approved it

```sql
-- Fix if Bobby actually approved it
UPDATE provenance 
SET added_by = 'bobby_manual_fix', 
    notes = 'Originally mis-tagged, Bobby confirmed approval'
WHERE place_id = 'xxx';
```

## Current Status

As of February 2026:
- ✅ 1,320 places with provenance
- ✅ 100% Bobby-approved
- ✅ Zero AI-added places
- ✅ Full audit trail

## Why This Matters

1. **Trust**: Users know every place is Bobby-curated, not AI slop
2. **Quality**: Human curation is the differentiator
3. **Accountability**: Clear audit trail for every place
4. **Compliance**: Proves editorial oversight if needed for partnerships/press
