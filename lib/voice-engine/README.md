# Saiko Voice Engine v1.1

A modular vocabulary system that generates short, charming restaurant taglines by combining curated word pools with merchant-specific data from the Google Places API.

## Overview

Instead of asking an AI to "write like a 1957 surf copywriter" and hoping, the Voice Engine gives it a controlled palette of words, phrase structures, and merchant signals to draw from.

The system produces **4 taglines per restaurant**, each using a different phrase pattern, then auto-selects the best one.

## Tone: v1.1

**Cool, confident, deadpan.** The person who already knows and doesn't need to sell you.

- Deadpan over enthusiastic
- Withhold more than you share
- State quality as fact, not excitement
- Three-beat rhythm: "X. Y. Z."

### Example Output

```
"If you know Sunset, you already know Guisados."
"The Thai spot. Ask around."
"Good coffee. Nice light. Don't be in a hurry."
"Posted up at the bar. Burger's in. Everything's fine."
```

## Architecture

```
lib/voice-engine/
├── index.ts                    # Main exports
├── types.ts                    # TypeScript types
├── vocabulary.ts               # Curated word pools
├── signal-extraction.ts        # Extract data from Google Places
├── validation.ts               # Banned word validator
├── prompts.ts                  # AI system/user prompts
├── generator.ts                # Generate 4 candidates (Claude Haiku)
├── selector.ts                 # Auto-select best (Claude Haiku)
├── ad-units.ts                 # Category → ad unit mapping
├── orchestrator.ts             # End-to-end pipeline
└── README.md                   # This file
```

## Usage

### Basic: Generate a Tagline

```typescript
import { enrichPlace, extractSignalsAndAttributes } from '@/lib/voice-engine';

// Extract signals from Google Places data
const { signals, derived } = extractSignalsAndAttributes(googlePlaceData);

// Generate tagline + assign ad unit
const result = await enrichPlace({
  signals,
  derived,
  mapNeighborhood: 'Echo Park', // Optional: use street name if map title already has neighborhood
});

// result contains:
// - tagline: "The selected tagline"
// - taglineCandidates: ["Candidate 1", "Candidate 2", "Candidate 3", "Candidate 4"]
// - taglinePattern: "food" | "neighborhood" | "vibe" | "authority"
// - taglineSignals: { ...snapshot of merchant signals }
// - adUnitType: "A" | "B" | "D" | "E"
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

### Individual Components

```typescript
import {
  generateTaglineCandidates,
  selectBestTagline,
  assignAdUnitType,
  validateTagline,
} from '@/lib/voice-engine';

// Generate 4 candidates
const generation = await generateTaglineCandidates({ signals, derived });

// Validate candidates
const valid = generation.allValid;

// Select best
const selection = await selectBestTagline(signals, generation.candidates);

// Assign ad unit
const adUnit = assignAdUnitType(signals.category);
```

## Phrase Patterns

The system generates one tagline per pattern:

1. **FOOD FORWARD** — Lead with what they serve
   - "Primo fish tacos and cold ones right on the boardwalk."

2. **NEIGHBORHOOD ANCHOR** — Lead with where they are
   - "Where National City lines up when it's taco time."

3. **VIBE CHECK** — Put the reader in the scene
   - "The kind of patio where Tuesday feels like Saturday."

4. **LOCAL AUTHORITY** — Maximum confidence, minimum words
   - "The real deal. Tacos worth the drive, every time."

## Merchant Signals

Data pulled from Google Places API:

| Signal | Google Places Field | Example |
|--------|---------------------|---------|
| Name | `displayName` | "Tacos El Gordo" |
| Category | `primaryType` | "mexican_restaurant" |
| Neighborhood | `addressComponents` | "Silver Lake" |
| Street | `formattedAddress` | "Sunset" |
| Price Tier | `priceLevel` | INEXPENSIVE |
| Drink Program | `servesBeer`, `servesWine`, `servesCocktails` | boolean flags |
| Outdoor Seating | `outdoorSeating` | boolean |
| Meal Period | `servesBreakfast`, `servesBrunch`, etc. | boolean flags |
| Service Style | `dineIn`, `takeout`, `delivery` | boolean flags |
| Popularity | `userRatingCount` | 2400 |

## Derived Attributes

Computed from raw signals:

- **Popularity Tier**: `institution` (>1000 reviews) / `known` (200-1000) / `discovery` (<200)
- **Vibe**: `hang` (outdoor + drinks) / `occasion` (expensive) / `quick` (takeout) / `neighborhood`
- **Time of Day**: `morning` / `midday` / `evening` / `anytime`

## Vocabulary System

### Praise Words (Confident, not cheerful)
`primo`, `solid`, `choice`, `the real deal`, `top-shelf`, `good`, `right`

### Place Words
`spot`, `joint`, `place`, `corner`, `room`, `counter`, `patio`

### Action Words
`pull up to`, `settle in at`, `posted up at`, `duck into`, `line up at`, `roll through`

### Deadpan Closers
`Ask around.` / `You'll figure out why.` / `That's the point.` / `No complaints.` / `Doesn't need to.` / `Everything's fine.` / `That's the whole pitch.` / `Good luck finding it.` / `So should you.`

### Banned Words
See `vocabulary.ts` for full list. Never use: `hidden gem`, `must-try`, `elevated`, `curated`, `amazing`, `unique`, `vibes`, `slaps`, etc.

## Ad Unit Assignment

Category-based mapping:

- **A** (Classic Print Ad) — Fine dining, steak, seafood, French, wine bars, cocktail bars
- **B** (Matchbook) — Fast food, pizza, burgers, sandwiches, cafes, coffee shops, takeaway
- **D** (Illustrated Stamp) — Breweries, wineries, distilleries, bars
- **E** (Horizontal Banner) — Default / everything else

## Database Schema

Voice Engine fields in `Place` model:

```prisma
model Place {
  // ... existing fields ...
  
  // Voice Engine v1.1 — Tagline fields
  tagline            String?
  taglineCandidates  String[]
  taglinePattern     String?    // "food" | "neighborhood" | "vibe" | "authority"
  taglineGenerated   DateTime?
  taglineSignals     Json?      // Snapshot of merchant signals

  // Voice Engine v1.1 — Ad unit fields
  adUnitType         String?    // "A" | "B" | "D" | "E"
  adUnitOverride     Boolean    @default(false)

  // Voice Engine v1.1 — Editorial pull quote fields
  pullQuote          String?
  pullQuoteSource    String?
  pullQuoteAuthor    String?
  pullQuoteUrl       String?
  pullQuoteType      String?    // "editorial" | "owner" | "self"
}
```

## Generation Pipeline

```
[Restaurant added to map]
  ↓
Is it a restaurant type? (check primaryType)
  ↓
Assign ad_unit_type via CATEGORY_MAP
  ↓
Gather merchant signals from Google Places
  ↓
Derive popularityTier, vibe, timeOfDay
  ↓
Call tagline generator (Claude Haiku)
  ↓
Validate all 4 against banned words
  ↓
If invalid: retry once
  ↓
Call auto-selector on valid candidates
  ↓
Store tagline + candidates + signals + ad_unit_type
  ↓
Render on merchant page
```

## Model Usage

- **Generation**: Claude Haiku (`claude-3-5-haiku-20250205`) — cheap, fast
- **Selection**: Claude Haiku — lightweight editorial filter

## Quality Bar

If generated output sounds warmer, friendlier, or more enthusiastic than these approved examples, the tone is wrong:

✅ "If you know Sunset, you already know Guisados."
✅ "The Thai spot. Ask around."
✅ "Good coffee. Nice light. Don't be in a hurry."
✅ "Posted up at the bar. Burger's in. Everything's fine."
✅ "They take their time here. So should you."
✅ "We'd tell you more, but that's not really how this works."

❌ "A must-try hidden gem!"
❌ "Amazing authentic tacos you'll love!"
❌ "The perfect spot for a delicious meal!"

## Future Enhancements

Not in v1.1:

- Map creator tagline editing UI
- "Regenerate" button
- Pull quote sourcing pipeline
- Non-restaurant merchants
- Ad unit rendering / visual designs

## Maintenance

This is a living system. Word pools and phrase patterns should evolve:

- **Adding Words**: Test against 3-4 restaurants mentally before adding
- **Removing Words**: Cut words that appear in too many taglines or feel dated
- **Tuning Signals**: Promote reliable signals, demote unreliable ones
- **New Patterns**: Max 6 patterns before unwieldy

---

**Version**: v1.1  
**Date**: February 5, 2026  
**Status**: Living document, will evolve
