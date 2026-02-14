# Saiko Voice Engine v1.1 — Implementation Spec

**Date**: February 5, 2026  
**Status**: Implemented  
**Location**: `/lib/voice-engine/`

## Overview

The Saiko Voice Engine is a modular vocabulary system that generates short, deadpan restaurant taglines using controlled word pools and merchant data from Google Places API.

## What Changed: v1.0 → v1.1

### Tone Shift

- **v1.0**: Warm, enthusiastic, inviting. "1957 surf-culture copywriter who loves the spot."
- **v1.1**: Cool, confident, deadpan. "The person who already knows and doesn't need to sell you."

### Structural Changes

- 4 candidates per restaurant (was 3 in v1.0)
- 4 distinct phrase patterns
- More merchant signals used (street name, drink program, outdoor seating, popularity tier, live music)
- Expanded banned words list
- Added deadpan closers vocabulary pool

### Model Selection

- Uses Claude Haiku (`claude-3-5-haiku-20250205`) for both generation and selection
- Optimized for cost and speed on short-form creative tasks

## Architecture

```
lib/voice-engine/
├── index.ts                    # Main exports
├── types.ts                    # TypeScript type definitions
├── vocabulary.ts               # Curated word pools
├── signal-extraction.ts        # Extract signals from Google Places data
├── validation.ts               # Banned word validator
├── prompts.ts                  # AI system/user prompts
├── generator.ts                # Generate 4 candidates (Claude Haiku)
├── selector.ts                 # Auto-select best (Claude Haiku)
├── ad-units.ts                 # Category → ad unit type mapping
├── orchestrator.ts             # End-to-end pipeline
└── README.md                   # Documentation
```

## Core Components

### 1. Signal Extraction (`signal-extraction.ts`)

Extracts merchant signals from Google Places API data:

- **Input**: Raw Google Places JSON
- **Output**: Structured `MerchantSignals` + `DerivedAttributes`

**Key Functions**:
- `extractMerchantSignals()` — Parse Google Places data
- `deriveAttributes()` — Compute popularity tier, vibe, time of day
- `extractSignalsAndAttributes()` — Combined extraction

### 2. Vocabulary System (`vocabulary.ts`)

Curated word pools for controlled generation:

- **Praise Words**: `primo`, `solid`, `choice`, `the real deal`, `top-shelf`, `good`, `right`
- **Place Words**: `spot`, `joint`, `place`, `corner`, `room`, `counter`, `patio`
- **Action Words**: `pull up to`, `settle in at`, `posted up at`, `duck into`, `line up at`, `roll through`
- **Deadpan Closers**: `Ask around.`, `You'll figure out why.`, `That's the point.`, etc.
- **Banned Words**: 40+ words/phrases to never use

### 3. Validation (`validation.ts`)

Post-generation filter to reject taglines with banned words:

- `validateTagline()` — Check single tagline
- `validateTaglineCandidates()` — Batch validation
- `filterValidTaglines()` — Return only valid candidates

### 4. Tagline Generator (`generator.ts`)

Generates 4 tagline candidates using Claude Haiku:

- **Model**: `claude-3-5-haiku-20250205`
- **Patterns**: Food forward, neighborhood anchor, vibe check, local authority
- **Retry Logic**: Regenerates once if validation fails
- **Fallback**: Uses safe fallback on generation failure

**Key Functions**:
- `generateTaglineCandidates()` — Single generation attempt
- `generateTaglineCandidatesWithRetry()` — With automatic retry on validation failure

### 5. Auto-Selector (`selector.ts`)

Picks best tagline from 4 candidates using Claude Haiku:

- **Model**: `claude-3-5-haiku-20250205`
- **Criteria**: Confidence, specificity, rhythm, length
- **Fallback**: Selects shortest candidate if AI selection fails

### 6. Ad Unit Assignment (`ad-units.ts`)

Category-based mapping to ad unit styles:

- **A** (Classic Print Ad) — Fine dining, steak, seafood, wine/cocktail bars
- **B** (Matchbook) — Fast food, cafes, coffee shops, takeaway
- **D** (Illustrated Stamp) — Breweries, wineries, distilleries
- **E** (Horizontal Banner) — Default / everything else

### 7. Orchestrator (`orchestrator.ts`)

End-to-end pipeline combining all components:

- `generateTagline()` — Full pipeline with retry
- `generateTaglineWithFallback()` — With safe fallback
- `enrichPlace()` — Complete enrichment (tagline + ad unit)
- `batchEnrichPlaces()` — Parallel batch processing with concurrency limit

## Database Schema

Added to `Place` model in `prisma/schema.prisma`:

```prisma
// Voice Engine v1.1 — Tagline fields
tagline            String?
taglineCandidates  String[]  @default([])
taglinePattern     String?   // "food" | "neighborhood" | "vibe" | "authority"
taglineGenerated   DateTime?
taglineSignals     Json?     // Snapshot of merchant signals

// Voice Engine v1.1 — Ad unit fields
adUnitType         String?   // "A" | "B" | "D" | "E"
adUnitOverride     Boolean   @default(false)

// Voice Engine v1.1 — Editorial pull quote fields
pullQuote          String?   @db.Text
pullQuoteSource    String?
pullQuoteAuthor    String?
pullQuoteUrl       String?   @db.Text
pullQuoteType      String?   // "editorial" | "owner" | "self"
```

## Usage Examples

### Basic Usage

```typescript
import { enrichPlace, extractSignalsAndAttributes } from '@/lib/voice-engine';

// Extract signals from Google Places data
const { signals, derived } = extractSignalsAndAttributes(googlePlaceData);

// Generate tagline + assign ad unit
const result = await enrichPlace({
  signals,
  derived,
  mapNeighborhood: 'Echo Park', // Optional
});

console.log(result.tagline);
console.log(result.adUnitType);
```

### Batch Processing

```typescript
import { batchEnrichPlaces } from '@/lib/voice-engine';

const inputs = places.map((place) => {
  const { signals, derived } = extractSignalsAndAttributes(place.googleData);
  return { signals, derived };
});

const results = await batchEnrichPlaces(inputs, 10); // Concurrency: 10
```

## Phrase Patterns

Four distinct patterns ensure variety:

1. **FOOD FORWARD** — Lead with what they serve
   - Example: "Primo fish tacos and cold ones right on the boardwalk."

2. **NEIGHBORHOOD ANCHOR** — Lead with location
   - Example: "Where National City lines up when it's taco time."

3. **VIBE CHECK** — Put reader in the scene
   - Example: "The kind of patio where Tuesday feels like Saturday."

4. **LOCAL AUTHORITY** — Maximum confidence, minimum words
   - Example: "The real deal. Tacos worth the drive, every time."

## Quality Bar

Approved v1.1 examples (tone reference):

✅ "If you know Sunset, you already know Guisados."  
✅ "The Thai spot. Ask around."  
✅ "Good coffee. Nice light. Don't be in a hurry."  
✅ "Posted up at the bar. Burger's in. Everything's fine."  
✅ "They take their time here. So should you."  
✅ "We'd tell you more, but that's not really how this works."

If output sounds warmer or more enthusiastic than these, the tone is wrong.

## Testing

Run the test script to verify implementation:

```bash
npm run test:voice-engine
```

Or manually:

```bash
npx tsx scripts/test-voice-engine.ts
```

## Migration

To apply database schema changes:

```bash
npm run db:push
```

Or create a formal migration:

```bash
npx prisma migrate dev --name add_voice_engine_fields
```

## Integration Points

### On Place/Restaurant Creation

```typescript
import { enrichPlace, extractSignalsAndAttributes } from '@/lib/voice-engine';

async function onPlaceAdded(place: Place) {
  // Check if it's a restaurant type
  const isRestaurant = place.googleTypes.some(type => 
    type.includes('restaurant') || type.includes('cafe') || type.includes('bar')
  );
  
  if (!isRestaurant) return;
  
  // Extract signals from cached Google Places data
  const { signals, derived } = extractSignalsAndAttributes({
    displayName: place.name,
    formattedAddress: place.address,
    primaryType: place.googleTypes[0],
    priceLevel: place.priceLevel,
    // ... other fields
  });
  
  // Generate tagline + ad unit
  const result = await enrichPlace({ signals, derived });
  
  // Update place in database
  await prisma.place.update({
    where: { id: place.id },
    data: {
      tagline: result.tagline,
      taglineCandidates: result.taglineCandidates,
      taglinePattern: result.taglinePattern,
      taglineSignals: result.taglineSignals,
      adUnitType: result.adUnitType,
      taglineGenerated: new Date(),
    },
  });
}
```

### CSV Import (Batch Processing)

```typescript
import { batchEnrichPlaces } from '@/lib/voice-engine';

async function onCsvImport(places: Place[]) {
  const restaurantPlaces = places.filter(/* isRestaurant */);
  
  const inputs = restaurantPlaces.map((place) => {
    const { signals, derived } = extractSignalsAndAttributes(place.googleData);
    return { signals, derived };
  });
  
  // Process with concurrency limit
  const results = await batchEnrichPlaces(inputs, 10);
  
  // Update all places in database
  await Promise.all(
    results.map(({ input, result }, i) =>
      prisma.place.update({
        where: { id: restaurantPlaces[i].id },
        data: {
          tagline: result.tagline,
          taglineCandidates: result.taglineCandidates,
          taglinePattern: result.taglinePattern,
          taglineSignals: result.taglineSignals,
          adUnitType: result.adUnitType,
          taglineGenerated: new Date(),
        },
      })
    )
  );
}
```

## Cost Estimates

Based on Claude Haiku pricing ($0.80/$4.00 per million tokens):

- **Per restaurant**: ~$0.002-0.004 (2 Haiku calls)
- **100 restaurants**: ~$0.20-0.40
- **1000 restaurants**: ~$2-4

Extremely cost-effective for production use.

## Future Enhancements

Not in v1.1:

- Map creator tagline editing UI
- "Regenerate taglines" button
- Pull quote sourcing/scraping pipeline
- Non-restaurant merchant support
- Ad unit rendering / visual designs
- A/B testing individual word pool changes

## Maintenance Guidelines

The vocabulary system is designed to evolve:

### Adding Words

1. Test mentally against 3-4 restaurants
2. Add to appropriate pool in `vocabulary.ts`
3. Tag with energy level and best-for context (in comments)
4. Monitor output for overuse

### Removing Words

- Cut words that appear in too many taglines (losing specificity)
- Cut words that feel dated in wrong way (cringe vs. charming)

### Adding Phrase Patterns

- New patterns should cover genuinely different angle
- Each pattern should pull from different primary signals
- Max 6 patterns before system gets unwieldy

### Tuning Signals

- Promote reliable signals that consistently produce better taglines
- Demote unreliable signals (e.g., `outdoorSeating` often missing from API)
- Mark unreliable signals as "nice to have" rather than pattern drivers

---

**Implementation Complete**: All core components built and ready for integration.  
**Next Steps**: Apply database migration, integrate into place creation flow, test with real data.
