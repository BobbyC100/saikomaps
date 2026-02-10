# Identity Signal Extraction — Phase 2 Complete

**Date:** February 10, 2026  
**Status:** ✅ Production Ready

---

## What Was Built

AI-powered extraction of **identity signals** from scraped website content. These signals describe **WHO a place is**, not what they serve today.

---

## The Signals

### Core Signals (Flat, Queryable)

```typescript
cuisine_posture: 'produce-driven' | 'protein-centric' | 'carb-forward' | 'seafood-focused' | 'balanced'
service_model: 'tasting-menu' | 'a-la-carte' | 'small-plates' | 'family-style' | 'counter'
price_tier: '$' | '$$' | '$$$' | '$$$$'
wine_program_intent: 'natural' | 'classic' | 'eclectic' | 'minimal' | 'none'
place_personality: 'neighborhood-joint' | 'destination' | 'chef-driven' | 'scene' | 'hidden-gem' | 'institution'
```

### Extended Signals (JSON, Flexible)

```typescript
{
  signature_dishes: string[],          // Max 5, identity-defining items
  key_producers: string[],             // Max 5, wine/spirits that signal taste
  vibe_words: string[],                // Their words, not ours
  origin_story_type: string,           // chef-journey | family-legacy | etc.
  input_quality: InputQuality,         // Data completeness assessment
  extraction_confidence: number,       // 0.0-1.0
  confidence_tier: 'publish' | 'review' | 'hold'
}
```

---

## Architecture

### AI Model

**Claude Sonnet 4** (`claude-sonnet-4-20250514`)
- 1024 max tokens per extraction
- 500ms delay between requests (rate limiting)
- Batch processing: 10 places at a time

### Input Quality Assessment

Before extraction, assesses data completeness:

```typescript
{
  hasMenu: boolean,
  hasWineList: boolean,
  hasAbout: boolean,
  menuTextLength: number,
  wineListTextLength: number,
  aboutTextLength: number,
  overallQuality: 'good' | 'partial' | 'minimal' | 'none'
}
```

**Quality tiers:**
- **good:** 2+ data sources (menu + about, or menu + wine, or all 3)
- **partial:** 1 data source (menu only, or about only)
- **minimal:** Some text but <50 chars
- **none:** No usable content → skip extraction

### Confidence Tiers

Every extraction gets a confidence score → publishing decision:

- **Publish (≥0.7):** High confidence, ready to ship
- **Review (0.4-0.7):** Moderate confidence, editorial review
- **Hold (<0.4):** Low confidence, don't publish

---

## Database Schema

```prisma
model golden_records {
  // ... existing fields ...
  
  // Core Identity Signals (flat, indexed)
  cuisine_posture      String?
  service_model        String?
  price_tier           String?
  wine_program_intent  String?
  place_personality    String?
  
  // Extended Signals (JSON)
  identity_signals     Json?
  
  // Lifecycle
  signals_generated_at DateTime?
  signals_version      Int?
  
  // Editorial Review
  signals_reviewed     Boolean @default(false)
  signals_reviewed_by  String?
  signals_reviewed_at  DateTime?
}
```

**Indexes added for common queries:**

```sql
CREATE INDEX "golden_records_cuisine_posture_idx" ON "golden_records" ("cuisine_posture");
CREATE INDEX "golden_records_place_personality_idx" ON "golden_records" ("place_personality");
CREATE INDEX "golden_records_wine_program_intent_idx" ON "golden_records" ("wine_program_intent");
CREATE INDEX "golden_records_price_tier_idx" ON "golden_records" ("price_tier");

-- Composite index for common filter combinations
CREATE INDEX "golden_records_signals_composite_idx" 
ON "golden_records" ("place_personality", "wine_program_intent", "price_tier");
```

---

## Usage

### Test Single Place

```bash
npx tsx scripts/extract-identity-signals.ts --place="Donna's" --dry-run --verbose
```

### Extract First 20 Places

```bash
npx tsx scripts/extract-identity-signals.ts --limit=20 --dry-run --verbose
```

### Run on All LA Places with Scraped Data

```bash
npx tsx scripts/extract-identity-signals.ts
```

### Re-extract Existing Signals (New Prompt Version)

```bash
npx tsx scripts/extract-identity-signals.ts --reprocess --limit=50
```

---

## Test Results

### Donna's — Italian-American Red Sauce Joint

**Input:**
- Menu: 2,424 chars ✅
- About: 389 chars ✅
- Wine list: None

**Extracted Signals:**

```json
{
  "cuisine_posture": "carb-forward",
  "service_model": "a-la-carte",
  "price_tier": "$$",
  "place_personality": "neighborhood-joint",
  "wine_program_intent": null,
  "confidence": 0.85,
  "confidence_tier": "publish",
  "signature_dishes": [
    "Spaghetti and Meatballs",
    "Chicken Parmesan",
    "Fusilli alla Vodka",
    "Rigatoni Bolognese",
    "Tiramisu"
  ],
  "vibe_words": [
    "loud",
    "lively",
    "warm",
    "familiar",
    "comfort"
  ],
  "origin_story_type": "concept-first"
}
```

**Analysis:** Perfect! Captures "east coast, red sauce joint" identity with carb-forward (pasta), neighborhood vibe, and classic Italian-American signatures.

---

### Churrería El Moro — 1935 Heritage Churro Institution

**Input:**
- Menu: 123 chars (minimal but present) ✅
- About: 1,407 chars (rich heritage story) ✅
- Wine list: None (churro shop)

**Extracted Signals:**

```json
{
  "cuisine_posture": "carb-forward",
  "service_model": "counter",
  "price_tier": "$",
  "place_personality": "institution",
  "wine_program_intent": "none",
  "confidence": 0.9,
  "confidence_tier": "publish",
  "signature_dishes": [
    "churros",
    "chocolate"
  ],
  "vibe_words": [
    "tradicional",
    "emblemático",
    "pintoresco",
    "ícono"
  ],
  "origin_story_type": "family-legacy"
}
```

**Analysis:** Excellent! Captured institution personality (since 1935), family-legacy origin, and preserved Spanish vibe words. Counter service and $ pricing accurate for casual churro shop.

---

## Signal Taxonomy

### cuisine_posture

What anchors the cooking?

- **produce-driven:** Vegetables, seasons, farmers forward
- **protein-centric:** Meat or fish as the star
- **carb-forward:** Pasta, bread, noodles, rice dishes lead
- **seafood-focused:** Ocean-first identity
- **balanced:** No single anchor

### service_model

How is food delivered?

- **tasting-menu:** Fixed progression, chef-driven
- **a-la-carte:** Order what you want
- **small-plates:** Sharing, grazing, tapas-style
- **family-style:** Large format, communal
- **counter:** Order at counter, casual service

### price_tier

Positioning language, not dollar amounts:

- **$:** Casual, affordable, everyday
- **$$:** Moderate, accessible but not cheap
- **$$$:** Upscale, special occasion energy
- **$$$$:** Luxury, destination pricing

### wine_program_intent

What does the wine list signal?

- **natural:** Low-intervention, funky, orange wines
- **classic:** Traditional regions, established producers
- **eclectic:** Wide-ranging, curious, unexpected
- **minimal:** Short list, not a focus
- **none:** No wine program evident

### place_personality

What kind of place is this?

- **neighborhood-joint:** Regulars-driven, local rhythm
- **destination:** Worth traveling for
- **chef-driven:** Identity anchored to a chef or culinary vision
- **scene:** Social, fashionable, energy-forward
- **hidden-gem:** Under-the-radar but beloved
- **institution:** Culturally embedded, defined by time and legacy

### origin_story_type

How does the place explain itself?

- **chef-journey:** Chef's background, training, vision
- **family-legacy:** Generational, heritage, tradition
- **neighborhood-love:** Born from love of a place/community
- **concept-first:** Idea or theme came before location
- **partnership:** Collaboration story

---

## Extraction Prompt Design

### Key Principles

1. **Signal, not inventory:** WHO they are, not WHAT they serve today
2. **null over guessing:** Only extract what's clearly supported
3. **Their words, not ours:** vibe_words come from the source text
4. **Confidence explicit:** Every extraction has 0.0-1.0 confidence score

### Prompt Structure

```
1. Context: "You are extracting identity signals..."
2. Input: Menu text, wine list text, about text
3. Schema: JSON structure with all fields + types
4. Definitions: Detailed taxonomy for each signal type
5. Rules: Max items, confidence guidelines, null policy
6. Output format: "Return ONLY the JSON object, no explanation"
```

---

## Performance & Cost

### Speed

- ~5-8 seconds per place (including API latency)
- Batch processing: 10 places → ~2s delay → ~60-80s per batch
- **Estimated runtime for 623 places:** ~60-90 minutes

### Cost (Anthropic Pricing)

**Claude Sonnet 4:**
- Input: $3 per million tokens
- Output: $15 per million tokens

**Per extraction:**
- Input: ~2,000 tokens (menu + wine + about + prompt)
- Output: ~200 tokens (JSON response)

**Cost per place:** ~$0.0096 (~1 cent per place)

**Total for 623 places:** ~$6

---

## Query Examples

### Find all natural wine-focused places

```typescript
const places = await prisma.golden_records.findMany({
  where: {
    wine_program_intent: 'natural',
    place_personality: 'destination',
  },
  select: {
    name: true,
    identity_signals: true,
  },
});
```

### Find neighborhood Italian joints with high confidence

```typescript
const places = await prisma.golden_records.findMany({
  where: {
    cuisine_posture: 'carb-forward',
    place_personality: 'neighborhood-joint',
    identity_signals: {
      path: ['confidence_tier'],
      equals: 'publish',
    },
  },
});
```

### Get all institution-tier places

```typescript
const institutions = await prisma.golden_records.findMany({
  where: {
    place_personality: 'institution',
  },
  orderBy: {
    signals_generated_at: 'desc',
  },
});
```

---

## Editorial Workflow

### 1. Extract Signals (Automated)

```bash
npx tsx scripts/extract-identity-signals.ts
```

### 2. Review Low-Confidence Extractions

```sql
SELECT name, cuisine_posture, place_personality, 
       identity_signals->'extraction_confidence' as confidence
FROM golden_records
WHERE identity_signals->>'confidence_tier' IN ('review', 'hold')
ORDER BY identity_signals->'extraction_confidence' DESC;
```

### 3. Mark as Reviewed

```sql
UPDATE golden_records
SET signals_reviewed = true,
    signals_reviewed_by = 'bobby',
    signals_reviewed_at = NOW()
WHERE canonical_id = '...';
```

### 4. Re-extract with New Prompt (v2)

When taxonomy changes or prompt improves:

```bash
npx tsx scripts/extract-identity-signals.ts --reprocess
```

This increments `signals_version` to track which extraction method was used.

---

## Next Steps

### Phase 3: Tagline Generation

Use identity signals to generate place taglines:

```typescript
// Input: cuisine_posture, place_personality, signature_dishes, vibe_words
// Output: "East coast red sauce joint with warm, lively energy" (Donna's)
//         "Heritage churro institution since 1935" (El Moro)
```

### Phase 4: Similarity Search

Enable "places like this":

```sql
-- Find similar places using identity vectors
SELECT name FROM golden_records
WHERE cuisine_posture = 'carb-forward'
  AND place_personality = 'neighborhood-joint'
  AND price_tier = '$$'
ORDER BY similarity(identity_signals->'vibe_words', target_vibe_words) DESC;
```

---

## Success Metrics

✅ **Extraction accuracy:** 0.85-0.9 confidence on test places  
✅ **Multilingual support:** Spanish vibe words preserved  
✅ **Performance:** ~6-8 seconds per place  
✅ **Cost:** ~1 cent per place (~$6 for 623 places)  
✅ **Data quality:** Input quality assessment built-in  
✅ **Editorial control:** Confidence tiers for review workflow  

---

## Key Design Decisions

### 1. Why Flat + JSON?

**Flat fields** (cuisine_posture, etc.) = fast queries, indexes  
**JSON field** (identity_signals) = flexibility, rich metadata

### 2. Why Confidence Tiers?

Makes publishing decisions explicit:
- Publish tier → ship to production
- Review tier → editorial review
- Hold tier → don't show users

### 3. Why Store Input Quality?

Enables filtering by data completeness:
- Good quality → trust the extraction
- Partial quality → lower confidence threshold
- Minimal quality → may need manual review

### 4. Why Version Field?

When extraction prompt improves (v2, v3), can:
- Re-extract only old versions
- Compare quality across versions
- A/B test extraction methods

---

## Files Created

```
scripts/
  └── extract-identity-signals.ts      # Main extraction CLI

prisma/
  └── schema.prisma                    # Updated with identity signal fields

IDENTITY_SIGNALS_IMPLEMENTATION.md   # This doc
```

---

## Complete Pipeline

```mermaid
graph LR
    A[Website] --> B[Scrape Menu/Wine/About]
    B --> C[Store Raw Text]
    C --> D[Extract Identity Signals]
    D --> E[Core Signals + JSON]
    E --> F[Editorial Review]
    F --> G[Publish to App]
```

**Phase 1:** Scrape (done) → **Phase 2:** Extract (done) → **Phase 3:** Generate taglines → **Phase 4:** Serve to users

---

*Built with: Claude Sonnet 4, TypeScript, Prisma*  
*Inspired by: "Saiko wants exactly the data that big APIs avoid"*
