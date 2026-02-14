# Voice Engine v2.0 — Implementation Guide

**Date**: February 10, 2026  
**Status**: ✅ Implemented and ready for testing  
**Location**: `/lib/voice-engine-v2/`  
**Supersedes**: Voice Engine v1.1

---

## Overview

Voice Engine v2.0 generates taglines using **identity signals** extracted from scraped website content, rather than Google Places API data. This enables more specific, personality-driven taglines that reflect who a place is, not just what category they fall into.

---

## What Was Built

### Core Implementation (7 files)

```
lib/voice-engine-v2/
├── index.ts                    # Main exports
├── types.ts                    # Identity signal types + pattern weights
├── prompts.ts                  # v2.0 system/user prompts
├── generator.ts                # Tagline generation (Claude Haiku)
├── selector.ts                 # Auto-selection with pattern weights
├── orchestrator.ts             # End-to-end pipeline
├── signal-extraction.ts        # Extract signals from golden_records
└── README.md                   # User documentation
```

### Scripts (2 files)

```
scripts/
├── test-voice-engine-v2.ts     # Test with sample data
└── generate-taglines-v2.ts     # Batch generation script
```

### Documentation (1 file)

```
VOICE_ENGINE_V2_IMPLEMENTATION.md  # This file
```

---

## Key Changes from v1.1

| Feature | v1.1 | v2.0 |
|---------|------|------|
| **Input Signals** | Google Places API (outdoor_seating, price_level, etc.) | Identity signals (cuisine_posture, place_personality, signature_dishes, etc.) |
| **Pattern Selection** | Equal weighting | Signal-driven weights (institution → authority, chef-driven → food, etc.) |
| **Data Source** | Google Places API | `golden_records` table with scraped + extracted data |
| **Specificity** | Generic category-based | Personality-driven, uses their own words |
| **Vocabulary** | Shared word pools | **Same as v1.1** (reused) |
| **Validation** | Banned word filter | **Same as v1.1** (reused) |
| **Model** | Claude Haiku | **Same as v1.1** |

---

## Architecture

### Data Flow

```
golden_records (with identity_signals)
    ↓
[Signal Extraction]
    ↓
IdentitySignals + PlaceContext
    ↓
[Pattern Weight Calculation]
    ↓
[Tagline Generator] (Claude Haiku)
    ↓
4 Candidates (one per pattern)
    ↓
[Validation] (Banned Word Filter)
    ↓
Valid Candidates
    ↓
[Auto-Selector] (Claude Haiku + Weights)
    ↓
Best Tagline + Pattern
    ↓
Result (with ad unit type)
```

### Pattern Weight System

v2.0 introduces **pattern weights** based on `place_personality`:

```typescript
if place_personality == 'institution':
    weights = { authority: 3, neighborhood: 2, food: 1, vibe: 1 }
    
elif place_personality == 'neighborhood-spot':
    weights = { neighborhood: 3, vibe: 2, food: 1, authority: 1 }
    
elif place_personality == 'chef-driven':
    weights = { food: 3, neighborhood: 1, vibe: 1, authority: 1 }
    
elif place_personality == 'scene':
    weights = { vibe: 3, neighborhood: 1, food: 1, authority: 1 }
    
elif place_personality == 'hidden-gem':
    weights = { authority: 3, neighborhood: 1, vibe: 1, food: 1 }
    
elif place_personality == 'destination':
    weights = { food: 2, neighborhood: 2, vibe: 1, authority: 1 }
```

Weights influence selection, but **quality always wins**.

---

## Signal-to-Language Mapping

Voice Engine v2.0 uses identity signals to inform language choices:

### cuisine_posture → Food Language

| Signal | Language Cues |
|--------|---------------|
| `produce-driven` | vegetables, seasons, farmers, garden |
| `protein-centric` | meat, fish, the cut, the char |
| `carb-forward` | pasta, bread, noodles, the dough |
| `seafood-focused` | ocean, catch, oysters, the fish |
| `balanced` | Use signature_dishes, don't describe posture |

### wine_program_intent → Drink Language

| Signal | Language Cues |
|--------|---------------|
| `natural` | natural wine, orange wine, low-intervention, funky bottles |
| `classic` | proper wine list, old world, the cellar |
| `eclectic` | curious list, unexpected bottles |
| `minimal` | Don't mention wine |
| `none` | Don't mention wine |

### place_personality → Pattern Selection

| Signal | Primary Pattern | Secondary Pattern |
|--------|-----------------|-------------------|
| `institution` | Local Authority | Neighborhood Anchor |
| `neighborhood-spot` | Neighborhood Anchor | Vibe Check |
| `chef-driven` | Food Forward | — |
| `scene` | Vibe Check | — |
| `hidden-gem` | Local Authority (withholding) | — |
| `destination` | Food Forward | Neighborhood Anchor |

### service_model → Vibe Language

| Signal | Language Cues |
|--------|---------------|
| `tasting-menu` | chef sets the pace, sit back, they decide |
| `a-la-carte` | order what you want, your call |
| `small-plates` | sharing, grazing, a few things for the table |
| `family-style` | big plates, pass it around, communal |
| `counter` | order at the window, grab a number, no table service |

### origin_story_type → Authority Language

| Signal | Language Cues |
|--------|---------------|
| `family-legacy` | generations, same family, handed down |
| `chef-journey` | Use Food Forward pattern instead |
| `neighborhood-love` | born here, from the neighborhood |
| `concept-first` | Use Vibe Check pattern instead |
| `partnership` | Don't reference directly |

---

## Usage Examples

### Test with Sample Data

```bash
npx tsx scripts/test-voice-engine-v2.ts
```

Runs 4 test cases:
1. Institution with signature dish (Langer's)
2. Chef-driven with natural wine (Bacetti)
3. Neighborhood spot with vibe words (Canyon Coffee)
4. Hidden gem with minimal signals (Sticky Rice)

### Generate Taglines for Database

```bash
# Dry run with first 10 places
npx tsx scripts/generate-taglines-v2.ts --dry-run --limit=10 --verbose

# Generate for specific place
npx tsx scripts/generate-taglines-v2.ts --place="Langer's" --verbose

# Generate for 50 places with concurrency
npx tsx scripts/generate-taglines-v2.ts --limit=50 --concurrency=10
```

### Programmatic Usage

```typescript
import {
  fetchRecordsForTaglineGeneration,
  buildTaglineInputFromGoldenRecord,
  enrichPlaceV2,
} from '@/lib/voice-engine-v2';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function generateTaglinesForPlace(placeId: string) {
  // Fetch record
  const record = await prisma.golden_records.findUnique({
    where: { canonical_id: placeId },
  });
  
  if (!record || !record.signals_generated_at) {
    throw new Error('Place does not have identity signals');
  }
  
  // Build input
  const input = buildTaglineInputFromGoldenRecord(record);
  
  // Generate tagline
  const result = await enrichPlaceV2(input);
  
  console.log('Selected:', result.tagline);
  console.log('Pattern:', result.taglinePattern);
  console.log('All candidates:', result.taglineCandidates);
  
  return result;
}
```

---

## Example Output

### Input: Langer's Deli

```json
{
  "signals": {
    "place_personality": "institution",
    "cuisine_posture": "protein-centric",
    "service_model": "counter",
    "price_tier": "$$",
    "wine_program_intent": "none",
    "signature_dishes": ["#19 pastrami sandwich"],
    "vibe_words": ["classic", "no-frills"],
    "origin_story_type": "family-legacy"
  },
  "context": {
    "name": "Langer's Delicatessen",
    "neighborhood": "Westlake",
    "street": "Alvarado St"
  }
}
```

### Output

```json
{
  "candidates": [
    "Pastrami on rye. The #19. That's the whole pitch.",
    "Still on Alvarado. Still the same. Ask around.",
    "Counter seat. No-frills room. The sandwich speaks for itself.",
    "The pastrami institution. Three generations. Ask anyone."
  ],
  "selected": "The pastrami institution. Three generations. Ask anyone.",
  "selectedPattern": "authority",
  "taglineVersion": 2
}
```

**Why this won:** `place_personality = institution` → authority pattern weighted 3x. Plus it uses both `family-legacy` origin and `institution` personality in a single confident statement.

---

## Database Schema

### Current State

- ✅ `golden_records` has identity signal fields
- ❌ `golden_records` does NOT have tagline fields

### Required Migration

Add tagline fields to `golden_records`:

```prisma
model golden_records {
  // ... existing fields
  
  // Voice Engine v2.0 — Tagline fields
  tagline              String?
  tagline_candidates   String[]  @default([])
  tagline_pattern      String?
  tagline_generated_at DateTime?
  tagline_signals      Json?     // Snapshot of identity signals used
  tagline_version      Int?      // Voice engine version (2)
}
```

**Alternative:** Store taglines in `places` table if linking golden_records → places via `google_place_id`.

---

## Quality Checks

### Signal Quality Assessment

The system assesses signal quality before generation:

```typescript
if (coreSignals >= 3 && (hasSignatureDishes || hasVibeWords)):
    quality = 'excellent'
    
elif (coreSignals >= 2):
    quality = 'good'
    
elif (coreSignals >= 1 || hasVibeWords):
    quality = 'minimal'
    
else:
    quality = 'insufficient'  // Skip generation
```

### Confidence Tiers

Signature dishes are only referenced if `confidence_tier = 'publish'`:

- **publish** (≥0.7 confidence) → Use signature dishes
- **review** (0.4-0.7 confidence) → Don't use signature dishes
- **hold** (<0.4 confidence) → Don't use signature dishes

### Fallback Behavior

1. **Insufficient signals** → Skip or use thin data fallbacks:
   - "Still here. That's enough."
   - "It does what it does. Ask around."
   - "Good place. You'll figure out why."

2. **Generation fails** → Static fallback:
   - "A fine establishment. Saiko approved."

---

## Cost Estimates

Same as v1.1 — uses Claude Haiku for both generation and selection:

- **Per place**: ~$0.002-0.004 (2 Haiku calls)
- **100 places**: ~$0.20-0.40
- **1,000 places**: ~$2-4

Extremely cost-effective.

---

## Testing Checklist

Before production use:

- [ ] Run test script: `npx tsx scripts/test-voice-engine-v2.ts`
- [ ] Review all 4 test cases for tone quality
- [ ] Run dry-run batch: `npx tsx scripts/generate-taglines-v2.ts --dry-run --limit=20 --verbose`
- [ ] Check pattern distribution (should vary based on signals)
- [ ] Verify banned words are caught
- [ ] Test fallback behavior with low-quality signals
- [ ] Add tagline fields to `golden_records` schema
- [ ] Apply database migration
- [ ] Run production batch on 50-100 places
- [ ] Review output quality
- [ ] Integrate into place enrichment pipeline

---

## Integration Points

### Where to Call Voice Engine v2.0

1. **After identity signal extraction**
   - Script: `scripts/extract-identity-signals.ts`
   - After extraction completes, run tagline generation

2. **On new place creation**
   - When a place is added with scraped content
   - Extract signals → Generate tagline

3. **Backfill existing places**
   - Run batch generation on all places with `signals_generated_at IS NOT NULL`

### Coexistence with v1.1

- **v1.1**: For places without scraped content (Google Places data only)
- **v2.0**: For places with identity signals (scraped + extracted)

Both can run side-by-side.

---

## Maintenance

### Vocabulary Updates

v2.0 **reuses** v1.1 vocabulary:

- Word pool changes in `/lib/voice-engine/vocabulary.ts` apply to both
- Banned words are centralized
- No separate maintenance needed

### Prompt Tuning

Signal-to-language mapping is in the **system prompt**. To tune:

1. Edit `/lib/voice-engine-v2/prompts.ts`
2. Update `TAGLINE_GENERATOR_SYSTEM_PROMPT_V2`
3. Increment `tagline_version` in database
4. Regenerate taglines to compare

### Pattern Weight Tuning

Pattern weights are in `/lib/voice-engine-v2/types.ts`:

```typescript
export function getPatternWeights(signals: IdentitySignals): PatternWeights {
  // Adjust weights here
}
```

Test changes with `--dry-run` before production.

---

## What's NOT in v2.0

- Pull quote integration (separate system)
- Tagline editing UI for curators
- A/B testing framework
- Non-restaurant categories (bars, shops, etc.)
- Regional vocabulary variants (non-SoCal)
- Integration with ad unit rendering

---

## Next Steps

### Immediate

1. ✅ Review implementation (complete)
2. ⏳ Run test script
3. ⏳ Add tagline fields to `golden_records` schema
4. ⏳ Apply database migration
5. ⏳ Run production batch (50 places)
6. ⏳ Review output quality

### Short-Term

- Integrate into place enrichment pipeline
- Backfill existing places with identity signals
- Add logging/monitoring
- Create admin UI to view taglines

### Long-Term

- Sync v2.0 taglines to `places` table for rendering
- Build curator editing interface
- Implement tagline regeneration API
- Add seasonal/regional vocabulary variants

---

## Summary

Voice Engine v2.0 is **complete and ready for testing**. The implementation:

✅ Uses identity signals from `golden_records`  
✅ Signal-driven pattern selection  
✅ Reuses v1.1 vocabulary and validation  
✅ Includes test script and batch generation script  
✅ Full documentation  
✅ Cost-effective (Claude Haiku)  
✅ Fallback handling for edge cases

**Ready for**: Testing → Schema migration → Production deployment

---

**Implementation by**: Claude Sonnet 4.5  
**Date**: February 10, 2026  
**Version**: 2.0
