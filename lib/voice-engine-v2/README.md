# Saiko Voice Engine v2.0

**Status**: Implemented  
**Date**: February 10, 2026  
**Supersedes**: Voice Engine v1.1

## Overview

Voice Engine v2.0 generates short-form taglines for place cards using **identity signals** extracted from scraped website content, rather than Google Places API fields.

### Key Changes from v1.1

| v1.1 | v2.0 |
|------|------|
| Google Places signals (outdoor seating, price level, etc.) | Identity signals (cuisine_posture, place_personality, signature_dishes, etc.) |
| Generic category-based generation | Personality-driven pattern selection |
| Basic popularity tiers | Signal-weighted pattern selection |
| Works for any place with Google data | Works for places with scraped content + extracted signals |

## Architecture

```
lib/voice-engine-v2/
├── index.ts                    # Main exports
├── types.ts                    # Identity signal types
├── prompts.ts                  # v2.0 system/user prompts
├── generator.ts                # Tagline generation (Claude Haiku)
├── selector.ts                 # Auto-selection with pattern weights
├── orchestrator.ts             # End-to-end pipeline
├── signal-extraction.ts        # Extract signals from golden_records
└── README.md                   # This file
```

## Input Signals

Voice Engine v2.0 uses identity signals from the `golden_records` table:

### Core Signals (flat fields)
- `cuisine_posture` — What anchors the cooking
- `service_model` — How food is delivered
- `price_tier` — Positioning language
- `wine_program_intent` — Wine list signal
- `place_personality` — What kind of place this is

### Extended Signals (identity_signals JSON)
- `signature_dishes[]` — Identity-defining items
- `key_producers[]` — Wine/spirits producers
- `vibe_words[]` — Their words about themselves
- `origin_story_type` — How they explain themselves

### Context (supplemental)
- `name`, `neighborhood`, `street`
- `outdoor_seating` (if available)
- `popularity_tier` (derived)

## Pattern Selection Logic

v2.0 uses **pattern weights** based on identity signals:

```typescript
if place_personality == 'institution':
    → Authority (weight 3) or Neighborhood (weight 2)
    
elif place_personality == 'neighborhood-spot':
    → Neighborhood (weight 3) or Vibe (weight 2)
    
elif place_personality == 'chef-driven':
    → Food Forward (weight 3)
    
elif place_personality == 'scene':
    → Vibe Check (weight 3)
    
elif place_personality == 'hidden-gem':
    → Authority (weight 3)
    
elif place_personality == 'destination':
    → Food Forward (weight 2) or Neighborhood (weight 2)
```

Weights influence auto-selection, but quality always wins.

## Usage

### Basic Usage

```typescript
import {
  buildTaglineInputFromGoldenRecord,
  enrichPlaceV2,
} from '@/lib/voice-engine-v2';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Fetch a golden record with identity signals
const record = await prisma.golden_records.findFirst({
  where: { signals_generated_at: { not: null } }
});

// Build input from record
const input = buildTaglineInputFromGoldenRecord(record);

// Generate tagline + ad unit
const result = await enrichPlaceV2(input);

console.log(result.tagline);
console.log(result.taglineCandidates);
console.log(result.taglinePattern);
console.log(result.adUnitType);
```

### Batch Processing

```typescript
import {
  fetchRecordsForTaglineGeneration,
  buildTaglineInputFromGoldenRecord,
  batchEnrichPlacesV2,
} from '@/lib/voice-engine-v2';

// Fetch records ready for tagline generation
const records = await fetchRecordsForTaglineGeneration({
  county: 'Los Angeles',
  limit: 100,
  reprocess: false,
});

// Build inputs
const inputs = records.map(r => buildTaglineInputFromGoldenRecord(r));

// Generate taglines in parallel (concurrency = 10)
const results = await batchEnrichPlacesV2(inputs, 10);

// Update database
for (const { input, result } of results) {
  await prisma.golden_records.update({
    where: { canonical_id: input.context.canonical_id },
    data: {
      // Store tagline in appropriate field
      // (golden_records doesn't have tagline fields yet)
    },
  });
}
```

## Quality Bar

The tone is **confident, understated, and cool** — not warm or enthusiastic.

### ✅ Good Examples

- "Braised tacos done right. Cold beer if you're smart."
- "If you know Sunset, you already know Guisados."
- "Pasta and natural wine. They take their time here."
- "The Thai spot. Ask around."
- "Good coffee. Nice light. Don't be in a hurry."

### Signal Usage Examples

**Input:**
```json
{
  "place_personality": "institution",
  "cuisine_posture": "protein-centric",
  "signature_dishes": ["#19 pastrami sandwich"],
  "origin_story_type": "family-legacy"
}
```

**Output:**
```
"The pastrami institution. Three generations. Ask anyone."
```

## Fallback Behavior

1. **Insufficient signals** → Thin data fallbacks:
   - "Still here. That's enough."
   - "It does what it does. Ask around."
   - "Good place. You'll figure out why."

2. **Generation failure** → Static fallback:
   - "A fine establishment. Saiko approved."

3. **Low confidence dishes** → Don't reference signature_dishes if `confidence_tier != 'publish'`

## Database Schema

Voice Engine v2.0 generates data for the `places` table (or could be added to `golden_records`):

```prisma
model places {
  // ... existing fields
  
  tagline              String?
  tagline_candidates   String[]  @default([])
  tagline_pattern      String?
  tagline_generated    DateTime?
  tagline_signals      Json?     // Snapshot of identity signals used
  tagline_version      Int?      // Voice engine version (2)
}
```

If storing on `golden_records`, add similar fields.

## Cost Estimates

Based on Claude Haiku pricing ($0.80/$4.00 per million tokens):

- **Per place**: ~$0.002-0.004 (2 Haiku calls)
- **100 places**: ~$0.20-0.40
- **1,000 places**: ~$2-4

Identical to v1.1 — extremely cost-effective.

## Testing

```bash
# Test v2.0 with sample data
npx tsx scripts/test-voice-engine-v2.ts
```

## Migration from v1.1

Voice Engine v2.0 is **independent** of v1.1. You can:

1. **Run v2.0 on places with identity signals** (new pipeline)
2. **Keep v1.1 for places without scraped content** (fallback)
3. **Gradually migrate** as more places get identity signals extracted

## What's NOT in v2.0

- Pull quote integration (separate system)
- Tagline editing UI
- A/B testing framework
- Non-restaurant categories
- Regional vocabulary variants

## Next Steps

1. ✅ Apply database migration (if storing taglines on `golden_records`)
2. ⏳ Test with real data
3. ⏳ Create batch generation script
4. ⏳ Integrate into place enrichment pipeline
5. ⏳ Backfill existing places with identity signals

## Maintenance

Voice Engine v2.0 shares vocabulary with v1.1:

- Word pool updates apply to both versions
- Banned words are centralized
- Ad unit assignment logic is shared

Signal-to-language mapping is defined in the prompts and can be tuned based on output quality.

---

**Implementation**: Complete  
**Version**: 2.0  
**Ready for**: Integration and testing
