/**
 * Saiko Maps — Identity Signal Extraction
 * 
 * Extracts structured identity signals from scraped website content.
 * These signals describe WHO a place is, not WHAT they serve today.
 * 
 * Usage:
 *   npx tsx scripts/extract-identity-signals.ts [options]
 * 
 * Options:
 *   --dry-run       Don't write to database
 *   --limit=N       Process only N records
 *   --verbose       Show detailed extraction info
 *   --place=NAME    Process single place by name
 *   --reprocess     Re-extract even if signals exist
 * 
 * Examples:
 *   npx tsx scripts/extract-identity-signals.ts --dry-run --limit=20 --verbose
 *   npx tsx scripts/extract-identity-signals.ts --place="Langer's"
 */

import Anthropic from '@anthropic-ai/sdk';
import { PrismaClient } from '@prisma/client';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Core identity signals (flat, queryable)
 */
interface CoreSignals {
  cuisine_posture: 'produce-driven' | 'protein-centric' | 'carb-forward' | 'seafood-focused' | 'balanced' | null;
  service_model: 'tasting-menu' | 'a-la-carte' | 'small-plates' | 'family-style' | 'counter' | null;
  price_tier: '$' | '$$' | '$$$' | '$$$$' | null;
  wine_program_intent: 'natural' | 'classic' | 'eclectic' | 'minimal' | 'none' | null;
  place_personality: 'neighborhood-joint' | 'destination' | 'chef-driven' | 'scene' | 'hidden-gem' | 'institution' | null;
}

/**
 * Extended identity signals (flexible, stored as JSON)
 */
interface ExtendedSignals {
  signature_dishes: string[];
  key_producers: string[];
  vibe_words: string[];
  origin_story_type: 'chef-journey' | 'family-legacy' | 'neighborhood-love' | 'concept-first' | 'partnership' | null;
}

/**
 * Full extraction result from AI
 */
interface ExtractionResult extends CoreSignals, ExtendedSignals {
  confidence: number;
}

/**
 * Input quality assessment
 */
interface InputQuality {
  hasMenu: boolean;
  hasWineList: boolean;
  hasAbout: boolean;
  menuTextLength: number;
  wineListTextLength: number;
  aboutTextLength: number;
  overallQuality: 'good' | 'partial' | 'minimal' | 'none';
}

/**
 * Confidence tier for publishing decisions
 */
type ConfidenceTier = 'publish' | 'review' | 'hold';

function getConfidenceTier(confidence: number): ConfidenceTier {
  if (confidence >= 0.7) return 'publish';
  if (confidence >= 0.4) return 'review';
  return 'hold';
}

/**
 * Database record input
 */
interface GoldenRecordInput {
  canonical_id: string;
  name: string;
  menu_raw_text: string | null;
  winelist_raw_text: string | null;
  about_copy: string | null;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  model: 'claude-sonnet-4-20250514',
  maxTokens: 1024,
  requestDelayMs: 500,  // Rate limiting between API calls
  batchSize: 10,
  batchDelayMs: 2000,
};

// ============================================================================
// EXTRACTION PROMPT
// ============================================================================

const EXTRACTION_PROMPT = `You are extracting identity signals for a restaurant.
These signals describe WHO this place is, not WHAT they serve today.

Given the following text from a restaurant's website, extract structured identity signals.

<menu_text>
{menu_raw_text}
</menu_text>

<wine_list_text>
{winelist_raw_text}
</wine_list_text>

<about_text>
{about_copy}
</about_text>

Return a JSON object with these fields:

{
  "cuisine_posture": "produce-driven" | "protein-centric" | "carb-forward" | "seafood-focused" | "balanced" | null,
  "service_model": "tasting-menu" | "a-la-carte" | "small-plates" | "family-style" | "counter" | null,
  "price_tier": "$" | "$$" | "$$$" | "$$$$" | null,
  "wine_program_intent": "natural" | "classic" | "eclectic" | "minimal" | "none" | null,
  "place_personality": "neighborhood-joint" | "destination" | "chef-driven" | "scene" | "hidden-gem" | "institution" | null,
  "signature_dishes": [],
  "key_producers": [],
  "vibe_words": [],
  "origin_story_type": "chef-journey" | "family-legacy" | "neighborhood-love" | "concept-first" | "partnership" | null,
  "confidence": 0.0
}

Definitions:

cuisine_posture — What anchors the cooking?
- produce-driven: Vegetables, seasons, farmers forward
- protein-centric: Meat or fish as the star
- carb-forward: Pasta, bread, noodles, rice dishes lead
- seafood-focused: Ocean-first identity
- balanced: No single anchor

service_model — How is food delivered?
- tasting-menu: Fixed progression, chef-driven
- a-la-carte: Order what you want
- small-plates: Sharing, grazing, tapas-style
- family-style: Large format, communal
- counter: Order at counter, casual service

price_tier — Positioning language, not dollar amounts
- $: Casual, affordable, everyday
- $$: Moderate, accessible but not cheap
- $$$: Upscale, special occasion energy
- $$$$: Luxury, destination pricing

wine_program_intent — What does the wine list signal?
- natural: Low-intervention, funky, orange wines
- classic: Traditional regions, established producers
- eclectic: Wide-ranging, curious, unexpected
- minimal: Short list, not a focus
- none: No wine program evident

place_personality — What kind of place is this?
- neighborhood-joint: Regulars-driven, local rhythm
- destination: Worth traveling for
- chef-driven: Identity anchored to a chef or culinary vision
- scene: Social, fashionable, energy-forward
- hidden-gem: Under-the-radar but beloved
- institution: Culturally embedded, defined by time and legacy

origin_story_type — How does the place explain itself?
- chef-journey: Chef's background, training, vision
- family-legacy: Generational, heritage, tradition
- neighborhood-love: Born from love of a place/community
- concept-first: Idea or theme came before location
- partnership: Collaboration story

Rules:
- Only extract what is clearly supported by the text
- null is better than guessing
- signature_dishes: Max 5, identity-defining items only
- key_producers: Max 5, wine/spirits producers that signal taste
- vibe_words: Their words, not yours — adjectives they use about themselves
- confidence: 0.0-1.0, your confidence in the overall extraction quality

Return ONLY the JSON object, no explanation.`;

// ============================================================================
// CLI ARGUMENT PARSING
// ============================================================================

interface CliArgs {
  dryRun: boolean;
  limit: number | null;
  verbose: boolean;
  placeName: string | null;
  reprocess: boolean;
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
  };
}

// ============================================================================
// UTILITIES
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function assessInputQuality(record: GoldenRecordInput): InputQuality {
  const hasMenu = !!record.menu_raw_text && record.menu_raw_text.length > 50;
  const hasWineList = !!record.winelist_raw_text && record.winelist_raw_text.length > 50;
  const hasAbout = !!record.about_copy && record.about_copy.length > 50;
  
  const menuTextLength = record.menu_raw_text?.length || 0;
  const wineListTextLength = record.winelist_raw_text?.length || 0;
  const aboutTextLength = record.about_copy?.length || 0;
  
  let overallQuality: InputQuality['overallQuality'];
  const signalCount = [hasMenu, hasWineList, hasAbout].filter(Boolean).length;
  
  if (signalCount >= 2) overallQuality = 'good';
  else if (signalCount === 1) overallQuality = 'partial';
  else if (menuTextLength > 0 || aboutTextLength > 0) overallQuality = 'minimal';
  else overallQuality = 'none';
  
  return {
    hasMenu,
    hasWineList,
    hasAbout,
    menuTextLength,
    wineListTextLength,
    aboutTextLength,
    overallQuality,
  };
}

function buildPrompt(record: GoldenRecordInput): string {
  return EXTRACTION_PROMPT
    .replace('{menu_raw_text}', record.menu_raw_text || '(not available)')
    .replace('{winelist_raw_text}', record.winelist_raw_text || '(not available)')
    .replace('{about_copy}', record.about_copy || '(not available)');
}

function parseExtractionResult(text: string): ExtractionResult | null {
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
    
    const parsed = JSON.parse(jsonText);
    
    // Validate required fields exist
    if (typeof parsed.confidence !== 'number') {
      parsed.confidence = 0.5; // Default if missing
    }
    
    // Ensure arrays are arrays
    parsed.signature_dishes = Array.isArray(parsed.signature_dishes) ? parsed.signature_dishes : [];
    parsed.key_producers = Array.isArray(parsed.key_producers) ? parsed.key_producers : [];
    parsed.vibe_words = Array.isArray(parsed.vibe_words) ? parsed.vibe_words : [];
    
    return parsed as ExtractionResult;
  } catch (error) {
    console.error('Failed to parse extraction result:', error);
    console.error('Raw text:', text);
    return null;
  }
}

// ============================================================================
// EXTRACTION CORE
// ============================================================================

const prisma = new PrismaClient();
const anthropic = new Anthropic();

async function extractSignals(
  record: GoldenRecordInput,
  verbose: boolean
): Promise<{ result: ExtractionResult | null; inputQuality: InputQuality }> {
  const inputQuality = assessInputQuality(record);
  
  // Skip if no meaningful input
  if (inputQuality.overallQuality === 'none') {
    if (verbose) {
      console.log(`    Skipping: No usable content`);
    }
    return { result: null, inputQuality };
  }
  
  const prompt = buildPrompt(record);
  
  try {
    const response = await anthropic.messages.create({
      model: CONFIG.model,
      max_tokens: CONFIG.maxTokens,
      messages: [
        { role: 'user', content: prompt }
      ],
    });
    
    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      console.error('No text content in response');
      return { result: null, inputQuality };
    }
    
    const result = parseExtractionResult(textContent.text);
    
    if (verbose && result) {
      console.log(`    Cuisine: ${result.cuisine_posture || 'null'}`);
      console.log(`    Service: ${result.service_model || 'null'}`);
      console.log(`    Price: ${result.price_tier || 'null'}`);
      console.log(`    Wine: ${result.wine_program_intent || 'null'}`);
      console.log(`    Personality: ${result.place_personality || 'null'}`);
      console.log(`    Confidence: ${result.confidence} (${getConfidenceTier(result.confidence)})`);
      if (result.signature_dishes.length > 0) {
        console.log(`    Signatures: ${result.signature_dishes.join(', ')}`);
      }
      if (result.vibe_words.length > 0) {
        console.log(`    Vibe words: ${result.vibe_words.join(', ')}`);
      }
    }
    
    return { result, inputQuality };
  } catch (error) {
    console.error('API error:', error);
    return { result: null, inputQuality };
  }
}

async function writeSignals(
  canonicalId: string,
  result: ExtractionResult,
  inputQuality: InputQuality,
  dryRun: boolean
): Promise<void> {
  if (dryRun) return;
  
  const identitySignals = {
    signature_dishes: result.signature_dishes,
    key_producers: result.key_producers,
    vibe_words: result.vibe_words,
    origin_story_type: result.origin_story_type,
    input_quality: inputQuality,
    extraction_confidence: result.confidence,
    confidence_tier: getConfidenceTier(result.confidence),
  };
  
  await prisma.golden_records.update({
    where: { canonical_id: canonicalId },
    data: {
      cuisine_posture: result.cuisine_posture,
      service_model: result.service_model,
      price_tier: result.price_tier,
      wine_program_intent: result.wine_program_intent,
      place_personality: result.place_personality,
      identity_signals: identitySignals,
      signals_generated_at: new Date(),
      signals_version: 1,
      updated_at: new Date(),
    },
  });
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  const args = parseArgs();
  
  console.log('\n🔮 Saiko Maps — Identity Signal Extraction');
  console.log('==========================================');
  if (args.dryRun) console.log('🔸 DRY RUN MODE — no database writes');
  if (args.limit) console.log(`🔸 Limit: ${args.limit} records`);
  if (args.placeName) console.log(`🔸 Single place: "${args.placeName}"`);
  if (args.reprocess) console.log('🔸 Reprocessing existing signals');
  if (args.verbose) console.log('🔸 Verbose mode enabled');
  console.log('');

  // Build query
  const whereClause: any = {
    county: 'Los Angeles',
    // Must have at least some scraped content
    OR: [
      { menu_raw_text: { not: null } },
      { about_copy: { not: null } },
    ],
  };

  // Filter to specific place if requested
  if (args.placeName) {
    whereClause.name = { contains: args.placeName, mode: 'insensitive' };
  }

  // Skip already-processed unless reprocessing
  if (!args.reprocess) {
    whereClause.signals_generated_at = null;
  }

  const records = await prisma.golden_records.findMany({
    where: whereClause,
    select: {
      canonical_id: true,
      name: true,
      menu_raw_text: true,
      winelist_raw_text: true,
      about_copy: true,
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
    extracted: 0,
    skipped: 0,
    failed: 0,
    byConfidenceTier: {
      publish: 0,
      review: 0,
      hold: 0,
    },
    byInputQuality: {
      good: 0,
      partial: 0,
      minimal: 0,
      none: 0,
    },
  };

  // Process records
  for (let i = 0; i < records.length; i++) {
    const record = records[i] as GoldenRecordInput;
    const prefix = `[${i + 1}/${records.length}]`;
    console.log(`${prefix} ${record.name}`);

    const { result, inputQuality } = await extractSignals(record, args.verbose);
    
    stats.processed++;
    stats.byInputQuality[inputQuality.overallQuality]++;
    
    if (result) {
      await writeSignals(record.canonical_id, result, inputQuality, args.dryRun);
      stats.extracted++;
      stats.byConfidenceTier[getConfidenceTier(result.confidence)]++;
    } else if (inputQuality.overallQuality === 'none') {
      stats.skipped++;
    } else {
      stats.failed++;
    }

    // Rate limiting
    if (i < records.length - 1) {
      await sleep(CONFIG.requestDelayMs);
    }
    
    // Batch delay
    if ((i + 1) % CONFIG.batchSize === 0 && i < records.length - 1) {
      if (args.verbose) console.log(`    [Batch pause: ${CONFIG.batchDelayMs}ms]`);
      await sleep(CONFIG.batchDelayMs);
    }
  }

  // Print summary
  console.log('\n==========================================');
  console.log('📊 EXTRACTION SUMMARY');
  console.log('==========================================');
  console.log(`Total processed:  ${stats.processed}`);
  console.log(`Extracted:        ${stats.extracted}`);
  console.log(`Skipped (no data): ${stats.skipped}`);
  console.log(`Failed:           ${stats.failed}`);
  console.log('');
  console.log('By Confidence Tier:');
  console.log(`  Publish (≥0.7):  ${stats.byConfidenceTier.publish}`);
  console.log(`  Review (0.4-0.7): ${stats.byConfidenceTier.review}`);
  console.log(`  Hold (<0.4):     ${stats.byConfidenceTier.hold}`);
  console.log('');
  console.log('By Input Quality:');
  console.log(`  Good (2+ sources): ${stats.byInputQuality.good}`);
  console.log(`  Partial (1 source): ${stats.byInputQuality.partial}`);
  console.log(`  Minimal:          ${stats.byInputQuality.minimal}`);
  console.log(`  None:             ${stats.byInputQuality.none}`);
  console.log('==========================================\n');

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
