/**
 * Saiko Maps — Menu & Winelist Signal Analysis
 * 
 * Analyzes menu_raw_text and winelist_raw_text from golden_records
 * and stores structured signals in menu_signals and winelist_signals tables.
 * 
 * Usage:
 *   npx tsx scripts/analyze-menu-winelist-signals.ts [options]
 * 
 * Options:
 *   --dry-run       Don't write to database
 *   --limit=N       Process only N records
 *   --verbose       Show detailed analysis info
 *   --place=NAME    Process single place by name
 *   --reprocess     Re-analyze even if signals are fresh
 *   --menu-only     Only process menu signals
 *   --winelist-only Only process winelist signals
 * 
 * Examples:
 *   npx tsx scripts/analyze-menu-winelist-signals.ts --dry-run --limit=10 --verbose
 *   npx tsx scripts/analyze-menu-winelist-signals.ts --place="Republique"
 *   npx tsx scripts/analyze-menu-winelist-signals.ts --menu-only --limit=50
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local explicitly
config({ path: resolve(process.cwd(), '.env.local') });

import Anthropic from '@anthropic-ai/sdk';
import { PrismaClient } from '@prisma/client';
import { upsertMenuSignalsV1 } from '../lib/signals/upsertMenuSignals';
import { upsertWinelistSignalsV1 } from '../lib/signals/upsertWinelistSignals';
import type { AnalyzeResult } from '../lib/signals/upsertMenuSignals';

// ============================================================================
// TYPES
// ============================================================================

interface MenuSignalPayload {
  categories: string[];          // "appetizers", "mains", "desserts"
  signature_items: string[];     // Key menu items that define the place
  price_signals: {
    tier: "$" | "$$" | "$$$" | "$$$$";
    sample_prices?: { item: string; price: number }[];
  };
  cuisine_indicators: string[];  // "handmade pasta", "wood-fired", "dry-aged"
  service_model: "tasting-menu" | "a-la-carte" | "small-plates" | "family-style" | "counter" | null;
  dietary_accommodations: string[]; // "vegan", "gluten-free", etc.
  seasonal_rotation: boolean;
}

interface WinelistSignalPayload {
  program_size: "extensive" | "curated" | "minimal" | "none";
  style_indicators: string[];    // "natural", "old-world", "new-world", "orange"
  regions_featured: string[];    // "Burgundy", "California", "Italy"
  key_producers: string[];       // Notable wineries/producers
  by_glass_count?: number;
  bottle_price_range?: { low: number; high: number };
  sommelier_notes: boolean;      // Does the list include tasting notes?
}

interface GoldenRecordInput {
  canonical_id: string;
  name: string;
  menu_raw_text: string | null;
  menu_url: string | null;
  winelist_raw_text: string | null;
  winelist_url: string | null;
  scraped_at: Date | null;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  model: 'claude-sonnet-4-20250514',
  maxTokens: 2048,
  requestDelayMs: 500,  // Rate limiting between API calls
  batchSize: 10,
  batchDelayMs: 2000,
  modelVersion: 'v1-menu-winelist-analyzer',
  maxInputChars: 50000,  // Hard limit on raw text input (≈12.5k tokens)
};

// ============================================================================
// PROMPTS
// ============================================================================

const MENU_ANALYSIS_PROMPT = `You are analyzing a restaurant menu to extract structured signals.

<menu_text>
{menu_raw_text}
</menu_text>

<menu_url>
{menu_url}
</menu_url>

Extract structured data about this menu and return a JSON object with these fields:

{
  "categories": [],              // Menu sections (e.g., "starters", "mains", "desserts")
  "signature_items": [],         // 3-5 items that seem signature/special
  "price_signals": {
    "tier": "$" | "$$" | "$$$" | "$$$$",  // Based on pricing patterns
    "sample_prices": []          // Array of {item: string, price: number}
  },
  "cuisine_indicators": [],      // Techniques or styles (e.g., "wood-fired", "handmade pasta")
  "service_model": "tasting-menu" | "a-la-carte" | "small-plates" | "family-style" | "counter" | null,
  "dietary_accommodations": [],  // "vegan", "gluten-free", etc. if explicitly offered
  "seasonal_rotation": true/false // Does menu indicate seasonal changes?
}

Rules:
- Extract only what is clearly present in the text
- Use null for unclear fields
- Keep signature_items to 3-5 most notable items
- Price tier: $ = <$15 avg, $$ = $15-30, $$$ = $30-60, $$$$ = $60+
- Return ONLY valid JSON, no explanation`;

const WINELIST_ANALYSIS_PROMPT = `You are analyzing a restaurant wine list to extract structured signals.

<winelist_text>
{winelist_raw_text}
</winelist_text>

<winelist_url>
{winelist_url}
</winelist_url>

Extract structured data about this wine program and return a JSON object with these fields:

{
  "program_size": "extensive" | "curated" | "minimal" | "none",
  "style_indicators": [],        // e.g., "natural", "old-world", "biodynamic", "orange"
  "regions_featured": [],        // Main wine regions present
  "key_producers": [],           // 3-5 notable producers/wineries mentioned
  "by_glass_count": 0,           // Number of by-the-glass options (if countable)
  "bottle_price_range": { "low": 0, "high": 0 },  // Price range if visible
  "sommelier_notes": true/false  // Are there tasting notes or descriptions?
}

Rules:
- Extract only what is clearly present in the text
- Use null for unclear fields
- program_size: extensive (100+), curated (20-100), minimal (<20), none (no list)
- Keep key_producers to 3-5 most prominent
- Return ONLY valid JSON, no explanation`;

// ============================================================================
// CLI ARGUMENT PARSING
// ============================================================================

interface CliArgs {
  dryRun: boolean;
  limit: number | null;
  verbose: boolean;
  placeName: string | null;
  reprocess: boolean;
  menuOnly: boolean;
  winelistOnly: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  
  return {
    dryRun: args.includes('--dry-run'),
    limit: args.find(a => a.startsWith('--limit='))
      ? parseInt(args.find(a => a.startsWith('--limit='))!.split('=')[1])
      : null,
    verbose: args.includes('--verbose'),
    placeName: args.find(a => a.startsWith('--place='))
      ? args.find(a => a.startsWith('--place='))!.split('=')[1].replace(/"/g, '')
      : null,
    reprocess: args.includes('--reprocess'),
    menuOnly: args.includes('--menu-only'),
    winelistOnly: args.includes('--winelist-only'),
  };
}

// ============================================================================
// UTILITIES
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  
  // Truncate deterministically at character boundary
  return text.slice(0, maxChars) + '\n\n[... truncated ...]';
}

/**
 * Preflight quality gate - ensures raw text is worth analyzing
 * Implements rule #3 from RERUN_GUARD_AND_DATA_INTEGRITY.md
 * 
 * Tiered approach: drop hard length threshold, focus on menu-ness signals
 */
function passesQualityGate(text: string): { passes: boolean; reason?: string } {
  const textLower = text.toLowerCase();

  // Fail-fast: truly tiny text (likely scraper error)
  if (text.length < 250) {
    return { passes: false, reason: 'insufficient_menu_text: length < 250 chars' };
  }

  // Fail-fast: boilerplate dominance
  const boilerplateTerms = ['privacy policy', 'copyright', 'javascript required', 'enable javascript',
                            'terms of service', 'cookie policy', 'all rights reserved'];
  const boilerplateCount = boilerplateTerms.filter(term => textLower.includes(term)).length;
  
  if (boilerplateCount >= 2) {
    return { passes: false, reason: 'insufficient_menu_text: dominated by boilerplate' };
  }

  // Pass tier 1: Menu-structured (line count)
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  if (lines.length >= 10) {
    return { passes: true };
  }

  // Pass tier 2: Food signal density
  const foodTokens = ['$', '€', '£', 'oz', 'lb', 'g', 'ml', 'salad', 'taco', 'pasta', 'rice', 
                      'chicken', 'beef', 'pork', 'fish', 'vegetable', 'soup', 'sandwich', 'burger',
                      'pizza', 'wine', 'beer', 'cocktail', 'appetizer', 'entrée', 'dessert',
                      'breakfast', 'lunch', 'dinner', 'bakery', 'pastry', 'coffee', 'tea'];
  const foundTokens = foodTokens.filter(token => textLower.includes(token));
  
  if (foundTokens.length >= 4) {
    return { passes: true };
  }

  // Pass tier 3: Price/menu patterns (at least 2 signals)
  const pricePatterns = [
    /[\$£€]/.test(text),                                    // Currency symbols
    /\d+\s?(oz|g|ml|pcs|ea|each)\b/i.test(text),           // Quantity patterns
    /\d{1,3}\.\d{2}/.test(text),                            // Price patterns (e.g., 12.99)
    /(starters?|mains?|entrees?|entrées?|desserts?|pastries?|sandwiches?|tacos?|sides?|drinks?|beverages?|appetizers?)/i.test(text) // Section headers
  ];
  const patternMatches = pricePatterns.filter(Boolean).length;
  
  if (patternMatches >= 2) {
    return { passes: true };
  }

  // If none of the above passed, it lacks menu characteristics
  return { passes: false, reason: 'insufficient_menu_text: lacks menu characteristics' };
}

/**
 * Validates that analysis result has meaningful content
 * Implements rule #4 from RERUN_GUARD_AND_DATA_INTEGRITY.md
 */
function hasEmptyPayload(payload: any): boolean {
  if (!payload) return true;
  
  const hasCategories = Array.isArray(payload.categories) && payload.categories.length > 0;
  const hasPriceTier = payload.price_signals?.tier != null;
  const hasSignatureItems = Array.isArray(payload.signature_items) && payload.signature_items.length > 0;
  const hasServiceModel = payload.service_model != null;
  
  // If ALL key fields are empty/null, it's an empty payload
  return !hasCategories && !hasPriceTier && !hasSignatureItems && !hasServiceModel;
}

function parseJsonResult(text: string): any {
  try {
    // Strip markdown code blocks if present
    let jsonText = text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.slice(7);
    }
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.slice(3);
    }
    if (jsonText.endsWith('```')) {
      jsonText = jsonText.slice(0, -3);
    }
    jsonText = jsonText.trim();
    
    return JSON.parse(jsonText);
  } catch (error) {
    console.error('Failed to parse JSON result:', error);
    console.error('Raw text:', text);
    return null;
  }
}

// ============================================================================
// ANALYSIS FUNCTIONS
// ============================================================================

const prisma = new PrismaClient();
const anthropic = new Anthropic();

async function analyzeMenu(
  menuRawText: string,
  menuUrl?: string | null
): Promise<AnalyzeResult> {
  // Preflight quality gate
  const qualityCheck = passesQualityGate(menuRawText);
  if (!qualityCheck.passes) {
    return {
      status: 'failed',
      error: qualityCheck.reason || 'insufficient_menu_text',
      confidence: null, // Preflight skip, not model evaluation
    };
  }

  // Truncate input deterministically to prevent token overflow
  const truncatedText = truncateText(menuRawText, CONFIG.maxInputChars);
  
  const prompt = MENU_ANALYSIS_PROMPT
    .replace('{menu_raw_text}', truncatedText)
    .replace('{menu_url}', menuUrl || '(not provided)');

  try {
    const response = await anthropic.messages.create({
      model: CONFIG.model,
      max_tokens: CONFIG.maxTokens,
      messages: [{ role: 'user', content: prompt }],
    });

    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return {
        status: 'failed',
        error: 'No text content in API response',
      };
    }

    const payload = parseJsonResult(textContent.text);
    if (!payload) {
      return {
        status: 'failed',
        error: 'Failed to parse menu analysis result',
      };
    }

    // Empty payload protection
    if (hasEmptyPayload(payload)) {
      return {
        status: 'failed',
        error: 'analysis_returned_empty_payload',
      };
    }

    // Calculate confidence based on data completeness
    const fieldsPresent = [
      payload.categories?.length > 0,
      payload.signature_items?.length > 0,
      payload.price_signals?.tier,
      payload.service_model,
    ].filter(Boolean).length;
    
    const confidence = fieldsPresent / 4;

    return {
      status: confidence >= 0.5 ? 'ok' : 'partial',
      payload,
      evidence: { source_url: menuUrl },
      confidence,
    };
  } catch (error: any) {
    return {
      status: 'failed',
      error: error?.message ?? 'Unknown API error',
    };
  }
}

async function analyzeWinelist(
  winelistRawText: string,
  winelistUrl?: string | null
): Promise<AnalyzeResult> {
  // Preflight quality gate (smaller floor for winelists - BTG lists can be short)
  if (winelistRawText.length < 200) {
    return {
      status: 'failed',
      error: 'insufficient_winelist_text: length < 200 chars',
      confidence: null, // Preflight skip, not model evaluation
    };
  }

  // Check for wine-related signals
  const textLower = winelistRawText.toLowerCase();
  const wineSignals = ['wine', 'red', 'white', 'sparkling', 'champagne', 'bottle', 'glass', 
                       'cabernet', 'chardonnay', 'pinot', 'merlot', 'sauvignon', 'rosé'];
  const foundSignals = wineSignals.filter(signal => textLower.includes(signal));
  
  if (foundSignals.length < 2) {
    return {
      status: 'failed',
      error: 'insufficient_winelist_text: lacks wine-related content',
      confidence: null,
    };
  }

  // Truncate input deterministically to prevent token overflow
  const truncatedText = truncateText(winelistRawText, CONFIG.maxInputChars);
  
  const prompt = WINELIST_ANALYSIS_PROMPT
    .replace('{winelist_raw_text}', truncatedText)
    .replace('{winelist_url}', winelistUrl || '(not provided)');

  try {
    const response = await anthropic.messages.create({
      model: CONFIG.model,
      max_tokens: CONFIG.maxTokens,
      messages: [{ role: 'user', content: prompt }],
    });

    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return {
        status: 'failed',
        error: 'No text content in API response',
      };
    }

    const payload = parseJsonResult(textContent.text);
    if (!payload) {
      return {
        status: 'failed',
        error: 'Failed to parse winelist analysis result',
      };
    }

    // Empty payload protection
    if (!payload.program_size && (!payload.style_indicators || payload.style_indicators.length === 0)) {
      return {
        status: 'failed',
        error: 'analysis_returned_empty_payload',
      };
    }

    // Calculate confidence based on data completeness
    const fieldsPresent = [
      payload.program_size,
      payload.style_indicators?.length > 0,
      payload.regions_featured?.length > 0,
      payload.key_producers?.length > 0,
    ].filter(Boolean).length;
    
    const confidence = fieldsPresent / 4;

    return {
      status: confidence >= 0.5 ? 'ok' : 'partial',
      payload,
      evidence: { source_url: winelistUrl },
      confidence,
    };
  } catch (error: any) {
    return {
      status: 'failed',
      error: error?.message ?? 'Unknown API error',
    };
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  const args = parseArgs();
  
  console.log('\n🔮 Saiko Maps — Menu & Winelist Signal Analysis');
  console.log('=================================================');
  if (args.dryRun) console.log('🔸 DRY RUN MODE — no database writes');
  if (args.limit) console.log(`🔸 Limit: ${args.limit} records`);
  if (args.placeName) console.log(`🔸 Single place: "${args.placeName}"`);
  if (args.reprocess) console.log('🔸 Reprocessing existing signals');
  if (args.verbose) console.log('🔸 Verbose mode enabled');
  if (args.menuOnly) console.log('🔸 Menu signals only');
  if (args.winelistOnly) console.log('🔸 Winelist signals only');
  console.log('');

  // Build query
  const whereClause: any = {};

  // Filter to places with scraped content
  const orConditions: any[] = [];
  if (!args.winelistOnly) {
    orConditions.push({ menu_raw_text: { not: null } });
  }
  if (!args.menuOnly) {
    orConditions.push({ winelist_raw_text: { not: null } });
  }
  
  if (orConditions.length > 0) {
    whereClause.OR = orConditions;
  }

  // Filter to specific place if requested
  if (args.placeName) {
    whereClause.name = { contains: args.placeName, mode: 'insensitive' };
  }

  const records = await prisma.golden_records.findMany({
    where: whereClause,
    select: {
      canonical_id: true,
      name: true,
      menu_raw_text: true,
      menu_url: true,
      winelist_raw_text: true,
      winelist_url: true,
      scraped_at: true,
    },
    orderBy: { name: 'asc' },
    take: args.limit ?? undefined,
  });

  console.log(`📍 Found ${records.length} places to process\n`);

  if (records.length === 0) {
    console.log('No records to process. Exiting.');
    return;
  }

  // Stats tracking
  const stats = {
    processed: 0,
    menu: {
      analyzed: 0,
      skipped: 0,
      failed: 0,
      fresh: 0,
    },
    winelist: {
      analyzed: 0,
      skipped: 0,
      failed: 0,
      fresh: 0,
    },
  };

  // Process records
  for (let i = 0; i < records.length; i++) {
    const record = records[i] as GoldenRecordInput;
    const prefix = `[${i + 1}/${records.length}]`;
    console.log(`${prefix} ${record.name}`);

    stats.processed++;

    // Process menu signals
    if (!args.winelistOnly && record.menu_raw_text) {
      if (args.dryRun) {
        console.log('  [DRY RUN] Would analyze menu');
        stats.menu.skipped++;
      } else {
        const result = await upsertMenuSignalsV1({
          goldenRecordId: record.canonical_id,
          modelVersion: CONFIG.modelVersion,
          forceReprocess: args.reprocess,
          analyze: async ({ menuRawText, menuUrl }) => 
            analyzeMenu(menuRawText, menuUrl),
        });

        if (result.skipped && result.reason === 'fresh') {
          stats.menu.fresh++;
          if (args.verbose) console.log('  ✓ Menu signals fresh (skipped)');
        } else if (result.status === 'ok') {
          stats.menu.analyzed++;
          if (args.verbose) console.log('  ✓ Menu signals analyzed (ok)');
        } else if (result.status === 'partial') {
          stats.menu.analyzed++;
          if (args.verbose) console.log('  ⚠ Menu signals analyzed (partial)');
        } else if (result.status === 'failed') {
          stats.menu.failed++;
          if (args.verbose) console.log('  ✗ Menu analysis failed');
        }
        
        // Rate limiting
        await sleep(CONFIG.requestDelayMs);
      }
    } else if (!args.winelistOnly) {
      stats.menu.skipped++;
    }

    // Process winelist signals
    if (!args.menuOnly && record.winelist_raw_text) {
      if (args.dryRun) {
        console.log('  [DRY RUN] Would analyze winelist');
        stats.winelist.skipped++;
      } else {
        const result = await upsertWinelistSignalsV1({
          goldenRecordId: record.canonical_id,
          modelVersion: CONFIG.modelVersion,
          forceReprocess: args.reprocess,
          analyze: async ({ winelistRawText, winelistUrl }) => 
            analyzeWinelist(winelistRawText, winelistUrl),
        });

        if (result.skipped && result.reason === 'fresh') {
          stats.winelist.fresh++;
          if (args.verbose) console.log('  ✓ Winelist signals fresh (skipped)');
        } else if (result.status === 'ok') {
          stats.winelist.analyzed++;
          if (args.verbose) console.log('  ✓ Winelist signals analyzed (ok)');
        } else if (result.status === 'partial') {
          stats.winelist.analyzed++;
          if (args.verbose) console.log('  ⚠ Winelist signals analyzed (partial)');
        } else if (result.status === 'failed') {
          stats.winelist.failed++;
          if (args.verbose) console.log('  ✗ Winelist analysis failed');
        }
        
        // Rate limiting
        await sleep(CONFIG.requestDelayMs);
      }
    } else if (!args.menuOnly) {
      stats.winelist.skipped++;
    }

    // Batch delay
    if ((i + 1) % CONFIG.batchSize === 0 && i < records.length - 1) {
      if (args.verbose) console.log(`    [Batch pause: ${CONFIG.batchDelayMs}ms]`);
      await sleep(CONFIG.batchDelayMs);
    }
  }

  // Print summary
  console.log('\n=================================================');
  console.log('📊 ANALYSIS SUMMARY');
  console.log('=================================================');
  console.log(`Total places processed: ${stats.processed}`);
  console.log('');
  console.log('Menu Signals:');
  console.log(`  Analyzed:       ${stats.menu.analyzed}`);
  console.log(`  Fresh (skipped): ${stats.menu.fresh}`);
  console.log(`  No data:        ${stats.menu.skipped}`);
  console.log(`  Failed:         ${stats.menu.failed}`);
  console.log('');
  console.log('Winelist Signals:');
  console.log(`  Analyzed:       ${stats.winelist.analyzed}`);
  console.log(`  Fresh (skipped): ${stats.winelist.fresh}`);
  console.log(`  No data:        ${stats.winelist.skipped}`);
  console.log(`  Failed:         ${stats.winelist.failed}`);
  console.log('=================================================\n');

  if (args.dryRun) {
    console.log('🔸 DRY RUN — no changes written to database');
  } else {
    console.log('✅ Database updated');
  }
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
