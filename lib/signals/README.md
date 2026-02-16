# Menu & Winelist Signal Extraction — V1

Structured AI analysis of `menu_raw_text` and `winelist_raw_text` from `golden_records`.

## Architecture

### Tables
- **`menu_signals`** — Structured menu analysis (1:1 with `golden_records`)
- **`winelist_signals`** — Structured winelist analysis (1:1 with `golden_records`)

### Schema v1

Both tables share the same structure:

```prisma
model menu_signals {
  id                String         @id @default(cuid())
  golden_record_id  String         @unique
  schema_version    Int            @default(1)
  model_version     String?
  source_scraped_at DateTime?
  analyzed_at       DateTime       @default(now())
  status            signal_status  @default(ok)
  error             String?
  payload           Json?          // Structured analysis
  evidence          Json?          // Citations/URLs
  confidence        Float?
  created_at        DateTime
  updated_at        DateTime
}

enum signal_status {
  ok
  partial
  failed
}
```

## Staleness Rule

**Fresh:** `signal.source_scraped_at === golden_record.scraped_at` AND `status === "ok"`

**Stale:** Anything else → re-run analysis

## Usage

### Library (Reusable)

```typescript
import { upsertMenuSignalsV1, upsertWinelistSignalsV1 } from '@/lib/signals';

// Menu analysis
const result = await upsertMenuSignalsV1({
  goldenRecordId: 'xyz',
  modelVersion: 'v1-menu-analyzer',
  analyze: async ({ menuRawText, menuUrl }) => {
    // Your analysis logic here
    return {
      status: 'ok',
      payload: { /* structured data */ },
      confidence: 0.85,
    };
  },
});

// Winelist analysis
const result = await upsertWinelistSignalsV1({
  goldenRecordId: 'xyz',
  modelVersion: 'v1-winelist-analyzer',
  analyze: async ({ winelistRawText, winelistUrl }) => {
    // Your analysis logic here
    return {
      status: 'ok',
      payload: { /* structured data */ },
      confidence: 0.9,
    };
  },
});
```

### Script (Batch Processing)

```bash
# Analyze all places with menu/winelist data
npx tsx scripts/analyze-menu-winelist-signals.ts

# Dry run with verbose output
npx tsx scripts/analyze-menu-winelist-signals.ts --dry-run --verbose --limit=10

# Process single place
npx tsx scripts/analyze-menu-winelist-signals.ts --place="Republique"

# Menu signals only
npx tsx scripts/analyze-menu-winelist-signals.ts --menu-only --limit=50

# Reprocess all (ignore freshness check)
npx tsx scripts/analyze-menu-winelist-signals.ts --reprocess
```

## Signal Payload Schema

### Menu Signals (`menu_signals.payload`)

```typescript
{
  categories: string[];          // "appetizers", "mains", "desserts"
  signature_items: string[];     // Key menu items
  price_signals: {
    tier: "$" | "$$" | "$$$" | "$$$$";
    sample_prices?: { item: string; price: number }[];
  };
  cuisine_indicators: string[];  // "handmade pasta", "wood-fired"
  service_model: "tasting-menu" | "a-la-carte" | "small-plates" | null;
  dietary_accommodations: string[];
  seasonal_rotation: boolean;
}
```

### Winelist Signals (`winelist_signals.payload`)

```typescript
{
  program_size: "extensive" | "curated" | "minimal" | "none";
  style_indicators: string[];    // "natural", "old-world", "biodynamic"
  regions_featured: string[];    // "Burgundy", "California"
  key_producers: string[];       // Notable wineries
  by_glass_count?: number;
  bottle_price_range?: { low: number; high: number };
  sommelier_notes: boolean;
}
```

## Implementation Pattern

### Fresh-Skip Logic
```typescript
// Skip if existing signal is fresh and ok
const isFresh = 
  existing?.status === 'ok' && 
  existing?.source_scraped_at === golden_record.scraped_at;

if (isFresh) {
  return { skipped: true, reason: 'fresh' };
}
```

### Error Handling
```typescript
// Missing raw text → write failed row
if (!menu_raw_text) {
  await upsert({
    status: 'failed',
    error: 'No menu_raw_text available to analyze',
  });
  return { skipped: false, status: 'failed', reason: 'missing_raw_text' };
}

// Analysis error → write failed row with error message
try {
  result = await analyze(...);
} catch (e) {
  result = { status: 'failed', error: e.message };
}
```

### Versioning
- **`schema_version`** — Incremented when table schema changes
- **`model_version`** — Set by caller (e.g., `'v1-menu-analyzer'`, `'claude-sonnet-4'`)
- Used to track what analysis produced each signal

## Migration

```bash
# Migration already applied
npx prisma migrate dev --name add_menu_winelist_signals
npx prisma generate
```

## Querying Signals

```typescript
// Get place with signals
const place = await prisma.golden_records.findUnique({
  where: { canonical_id: 'xyz' },
  include: {
    menu_signals: true,
    winelist_signals: true,
  },
});

// Check if signals are fresh
const needsRefresh = 
  !place.menu_signals || 
  place.menu_signals.source_scraped_at !== place.scraped_at ||
  place.menu_signals.status !== 'ok';

// Get all stale signals
const stale = await prisma.menu_signals.findMany({
  where: {
    OR: [
      { status: { not: 'ok' } },
      {
        source_scraped_at: {
          not: {
            equals: prisma.golden_records.scraped_at, // pseudocode
          },
        },
      },
    ],
  },
});
```

## Next Steps

1. **Test the analysis** on a few places:
   ```bash
   npx tsx scripts/analyze-menu-winelist-signals.ts --dry-run --limit=5 --verbose
   ```

2. **Refine prompts** based on output quality

3. **Tune payload schemas** to match your needs

4. **Add to CI/CD** for automated signal refresh after scrapes

5. **Build UI** to display signals on place pages
