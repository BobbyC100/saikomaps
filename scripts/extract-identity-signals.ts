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
 *   --concurrency=N Parallel extraction (default: 5)
 *
 * Examples:
 *   npx tsx scripts/extract-identity-signals.ts --dry-run --limit=20 --verbose
 *   npx tsx scripts/extract-identity-signals.ts --place="Langer's"
 *   npx tsx scripts/extract-identity-signals.ts --limit=50 --concurrency=10
 */

import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env' });
if (!process.env.SAIKO_DB_FROM_WRAPPER) {
  loadEnv({ path: '.env.local', override: true });
}

import Anthropic from '@anthropic-ai/sdk';
import { PrismaClient, Prisma } from '@prisma/client';
import { writeDerivedSignal } from '../lib/fields-v2/write-claim';
import { materializeCoverageEvidence, type CoverageEvidence } from '../lib/coverage/normalize-evidence';

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
  language_signals: string[];
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
  model: 'claude-haiku-4-5-20251001',
  maxTokens: 1024,
  requestDelayMs: 500,  // Rate limiting between API calls
  batchSize: 10,
  batchDelayMs: 2000,
  // Minimum character length for a content field to count as usable.
  // Below this threshold the AI consistently returns null fields with
  // hold-tier confidence — not worth the API call and not worth writing.
  minContentChars: 50,
};

// Geographic scope: Greater Los Angeles area bounding box.
// Covers City/County of Los Angeles, Santa Monica, Burbank, Pasadena,
// Long Beach, and surrounding cities.  Excludes international research
// entities (France, Spain, Denmark, Hawaii, etc.) that are in the entities
// table but are not part of the current Saiko Maps product scope.
// Entities with null canonical coordinates are also excluded — they require
// geocoding before signals can be extracted with confidence.
const LA_BBOX = {
  latMin: 33.6,
  latMax: 34.5,
  lonMin: -118.9,
  lonMax: -117.6,
} as const;

// ============================================================================
// EXTRACTION PROMPT
// ============================================================================

const EXTRACTION_PROMPT = `You are extracting identity signals for a restaurant.
These signals describe WHO this place is, not WHAT they serve today.

Given the following text from a restaurant's website (and optional editorial coverage context), extract structured identity signals.
The website text is the primary source. If a <coverage_context> block is present, use it to supplement and cross-validate — but do not let editorial interpretation override clear menu/website evidence.

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
  "language_signals": [],
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
- language_signals: Their words, not yours — adjectives they use about themselves
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
  concurrency: number;
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
    concurrency: args.find(a => a.startsWith('--concurrency='))
      ? parseInt(args.find(a => a.startsWith('--concurrency='))!.split('=')[1])
      : 5,
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

function buildPrompt(record: GoldenRecordInput, coverageEvidence?: CoverageEvidence | null): string {
  let prompt = EXTRACTION_PROMPT
    .replace('{menu_raw_text}', record.menu_raw_text || '(not available)')
    .replace('{winelist_raw_text}', record.winelist_raw_text || '(not available)')
    .replace('{about_copy}', record.about_copy || '(not available)');

  // Append coverage context if available
  const coverageBlock = buildCoverageContext(coverageEvidence);
  if (coverageBlock) {
    prompt += '\n\n' + coverageBlock;
  }

  return prompt;
}

/**
 * Build a coverage context block from normalized coverage evidence.
 * This is labeled as editorial evidence so the AI treats it as
 * supporting signal, not authoritative fact.
 */
function buildCoverageContext(evidence: CoverageEvidence | null | undefined): string | null {
  if (!evidence || evidence.sourceCount === 0) return null;

  const lines: string[] = [];
  lines.push('<coverage_context>');
  lines.push('The following is editorial evidence from published coverage sources.');
  lines.push('Use it to SUPPLEMENT and CROSS-VALIDATE the menu/website signals above.');
  lines.push('Coverage evidence is editorial interpretation — not authoritative fact.');
  lines.push(`Source count: ${evidence.sourceCount} articles (${evidence.provenance.tier1Sources} tier-1, ${evidence.provenance.tier2Sources} tier-2)`);
  lines.push('');

  // People
  const currentPeople = evidence.facts.people.filter(p => p.stalenessBand === 'current');
  const agingPeople = evidence.facts.people.filter(p => p.stalenessBand === 'aging');
  if (currentPeople.length > 0 || agingPeople.length > 0) {
    lines.push('Named people (editorial):');
    for (const p of currentPeople) {
      lines.push(`  - ${p.name}, ${p.role} (${p.sourceCount} sources, current)`);
    }
    for (const p of agingPeople) {
      lines.push(`  - ${p.name}, ${p.role} (${p.sourceCount} sources, aging — may be outdated)`);
    }
    lines.push('');
  }

  // Cuisine
  if (evidence.interpretations.food.cuisinePosture) {
    lines.push(`Cuisine posture (editorial): ${evidence.interpretations.food.cuisinePosture} (agreement: ${evidence.interpretations.food.cuisinePostureAgreement})`);
  }
  if (evidence.interpretations.food.cookingApproaches.length > 0) {
    lines.push(`Cooking approaches: ${evidence.interpretations.food.cookingApproaches.join(', ')}`);
  }
  if (evidence.interpretations.food.menuFormats.length > 0) {
    lines.push(`Menu formats: ${evidence.interpretations.food.menuFormats.join(', ')}`);
  }

  // Specialty signals
  const activeSpecialties = Object.entries(evidence.interpretations.food.specialtySignals)
    .filter(([, v]) => v)
    .map(([k]) => k);
  if (activeSpecialties.length > 0) {
    lines.push(`Specialty signals: ${activeSpecialties.join(', ')}`);
  }

  // Beverage
  const bev = evidence.interpretations.beverage;
  const bevSignals: string[] = [];
  if (bev.wine.mentioned) {
    let wineDesc = 'wine program';
    if (bev.wine.naturalFocus) wineDesc += ' (natural focus)';
    if (bev.wine.listDepth) wineDesc += `, ${bev.wine.listDepth} list`;
    if (bev.wine.sommelierMentioned) wineDesc += ', sommelier noted';
    bevSignals.push(wineDesc);
  }
  if (bev.cocktail.mentioned) bevSignals.push(bev.cocktail.programExists ? 'cocktail program' : 'cocktails mentioned');
  if (bev.beer.mentioned) bevSignals.push(bev.beer.craftSelection ? 'craft beer selection' : 'beer');
  if (bev.nonAlcoholic.mentioned) bevSignals.push(bev.nonAlcoholic.zeroproof ? 'zero-proof program' : 'non-alcoholic options');
  if (bev.coffeeTea.mentioned) bevSignals.push(bev.coffeeTea.specialtyProgram ? 'specialty coffee/tea' : 'coffee/tea');
  if (bevSignals.length > 0) {
    lines.push(`Beverage signals: ${bevSignals.join('; ')}`);
  }

  // Service
  const svc = evidence.interpretations.service;
  if (svc.serviceModel) lines.push(`Service model (editorial): ${svc.serviceModel}`);
  if (svc.reservationPosture) lines.push(`Reservation posture: ${svc.reservationPosture}`);

  // Atmosphere
  const atm = evidence.interpretations.atmosphere;
  if (atm.descriptors.length > 0) lines.push(`Atmosphere descriptors: ${atm.descriptors.join(', ')}`);
  if (atm.energyLevel) lines.push(`Energy level: ${atm.energyLevel}`);
  if (atm.formality) lines.push(`Formality: ${atm.formality}`);

  // Origin story
  if (evidence.facts.originStoryInterpretation?.archetype) {
    lines.push(`Origin story archetype: ${evidence.facts.originStoryInterpretation.archetype} (consensus: ${evidence.facts.originStoryInterpretation.consensus})`);
  }
  if (evidence.facts.originStoryFacts?.foundingYear) {
    lines.push(`Founding year: ${evidence.facts.originStoryFacts.foundingYear}`);
  }

  // Accolades (brief)
  if (evidence.facts.accolades.length > 0) {
    const top = evidence.facts.accolades.slice(0, 3);
    lines.push(`Accolades: ${top.map(a => a.name + (a.year ? ` (${a.year})` : '')).join('; ')}`);
  }

  // Sentiment
  lines.push(`Editorial sentiment: ${evidence.interpretations.sentiment.dominant}`);

  lines.push('</coverage_context>');

  return lines.join('\n');
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
    parsed.language_signals = Array.isArray(parsed.language_signals) ? parsed.language_signals : [];

    // Coerce core signal fields — Haiku sometimes returns arrays instead of strings
    for (const field of ['cuisine_posture', 'service_model', 'price_tier', 'wine_program_intent', 'place_personality', 'origin_story_type'] as const) {
      if (Array.isArray(parsed[field])) {
        parsed[field] = parsed[field][0] ?? null;
      }
    }

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
  verbose: boolean,
  coverageEvidence?: CoverageEvidence | null,
): Promise<{ result: ExtractionResult | null; inputQuality: InputQuality }> {
  const inputQuality = assessInputQuality(record);

  // Skip if no meaningful input AND no coverage evidence
  if (inputQuality.overallQuality === 'none' && !coverageEvidence) {
    if (verbose) {
      console.log(`    Skipping: No usable content and no coverage evidence`);
    }
    return { result: null, inputQuality };
  }

  // If no merchant content but coverage exists, upgrade quality to 'partial'
  // so we still run extraction with coverage as the signal source
  if (inputQuality.overallQuality === 'none' && coverageEvidence) {
    inputQuality.overallQuality = 'partial';
    if (verbose) {
      console.log(`    No merchant content — using coverage evidence as primary signal`);
    }
  }

  const prompt = buildPrompt(record, coverageEvidence);
  
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
      if (result.language_signals.length > 0) {
        console.log(`    Language signals: ${result.language_signals.join(', ')}`);
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

  // Comprehensive blob: flat fields embedded alongside extended signals so downstream
  // consumers (Voice Engine, SceneSense) can read everything from a single derived_signal row.
  const identitySignals = {
    // Flat signal fields (embedded for single-query reads)
    cuisine_posture: result.cuisine_posture,
    service_model: result.service_model,
    price_tier: result.price_tier,
    wine_program_intent: result.wine_program_intent,
    place_personality: result.place_personality,
    // Extended JSON signals
    signature_dishes: result.signature_dishes,
    key_producers: result.key_producers,
    language_signals: result.language_signals,
    origin_story_type: result.origin_story_type,
    input_quality: inputQuality,
    extraction_confidence: result.confidence,
    confidence_tier: getConfidenceTier(result.confidence),
  };
  
  // Fields v2: write derived_signals.
  // canonical_id === entity_id (same UUID), so use it directly — no lookup needed.
  const entityId = canonicalId;
  const signalVersion = 'extract-identity-v1';

  // One comprehensive identity_signals row for single-query reads by Voice/SceneSense,
  // plus individual rows for each flat field for targeted filtering/querying.
  const signalWrites: { key: string; value: unknown }[] = [
    { key: 'identity_signals', value: identitySignals },
    { key: 'cuisine_posture', value: result.cuisine_posture },
    { key: 'service_model', value: result.service_model },
    { key: 'price_tier', value: result.price_tier },
    { key: 'wine_program_intent', value: result.wine_program_intent },
    { key: 'place_personality', value: result.place_personality },
  ];

  for (const { key, value } of signalWrites) {
    if (value != null) {
      await writeDerivedSignal(prisma, {
        entityId,
        signalKey: key,
        signalValue: value,
        signalVersion,
      }).catch((err) => {
        console.warn(`[Fields v2] derived_signal write failed for ${key}:`, err);
      });
    }
  }
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
  console.log(`🔸 Concurrency: ${args.concurrency}`);
  console.log('');

  // ── v2 Selection: drive from canonical_entity_state ──────────────────────────
  // Eligibility source : entities that have a canonical_entity_state row AND
  //                      whose canonical lat/lon falls within the LA_BBOX.
  //                      This enforces the current product scope (Los Angeles
  //                      market) and excludes international reference entities
  //                      that are in the entities table but are not Saiko Maps
  //                      product entities.
  // "Already processed": derived_signals WHERE signal_key = 'identity_signals'.
  // Content source     : entities.description (v2-native) and/or merchant_surface_artifacts
  //                      bridge for menu_raw_text / winelist_raw_text / about_copy.

  // 1. All entities in canonical scope within the LA product bounding box.
  //    When --place is specified the bbox is bypassed: naming a place explicitly
  //    asserts scope intent, and the entity may not have coordinates yet
  //    (e.g. freshly created entities pending a Google Places geocode pass).
  const entityWhere: Prisma.entitiesWhereInput = args.placeName
    ? {
        name: { contains: args.placeName, mode: 'insensitive' },
        canonical_state: { isNot: null },
      }
    : {
        canonical_state: {
          is: {
            latitude:  { gte: LA_BBOX.latMin, lte: LA_BBOX.latMax },
            longitude: { gte: LA_BBOX.lonMin, lte: LA_BBOX.lonMax },
          },
        },
      };

  const candidates = await prisma.entities.findMany({
    where: entityWhere,
    select: { id: true, name: true, googlePlaceId: true, description: true },
    orderBy: { name: 'asc' },
  });

  // 2. Exclude entities that already have identity_signals in derived_signals.
  let processedIds = new Set<string>();
  if (!args.reprocess) {
    const done = await prisma.derived_signals.findMany({
      where: { signal_key: 'identity_signals' },
      select: { entityId: true },
    });
    processedIds = new Set(done.map(d => d.entityId));
  }

  const unprocessed = candidates.filter(e => !processedIds.has(e.id));

  // 3. Batch-fetch parsed surface artifacts from the merchant_surfaces pipeline (stages 2-4).
  //    artifact_json.text_blocks is a string[]; join them into a single string.
  const entityIdsForArtifacts = unprocessed.map(e => e.id);

  type ArtifactRow = {
    merchant_surface: { entityId: string; surface_type: string };
    artifact_json: unknown;
  };
  const surfaceArtifacts: ArtifactRow[] = entityIdsForArtifacts.length
    ? await prisma.merchant_surface_artifacts.findMany({
        where: {
          merchant_surface: {
            entityId: { in: entityIdsForArtifacts },
            surface_type: { in: ['menu', 'about', 'homepage'] },
            parse_status: 'parse_success',
          },
        },
        select: {
          artifact_json: true,
          merchant_surface: { select: { entityId: true, surface_type: true } },
        },
      })
    : [];

  // Index by entityId → { menu_text, about_text }
  function textBlocksToString(artifact_json: unknown): string {
    const j = artifact_json as Record<string, unknown>;
    const blocks = Array.isArray(j?.text_blocks) ? (j.text_blocks as string[]) : [];
    return blocks.join('\n').trim();
  }

  const surfaceTextByEntity = new Map<string, { menu_text: string; about_text: string }>();
  for (const row of surfaceArtifacts) {
    const eid = row.merchant_surface.entityId;
    const st  = row.merchant_surface.surface_type;
    if (!surfaceTextByEntity.has(eid)) surfaceTextByEntity.set(eid, { menu_text: '', about_text: '' });
    const entry = surfaceTextByEntity.get(eid)!;
    const text = textBlocksToString(row.artifact_json);
    if (st === 'menu' && text.length > entry.menu_text.length) entry.menu_text = text;
    if ((st === 'about' || st === 'homepage') && text.length > entry.about_text.length) entry.about_text = text;
  }

  // 4. Build records — require at least one content field above the minimum
  //    useful length, OR coverage evidence (Phase 5 wiring: entities with
  //    coverage can be extracted even without merchant surface content).
  //    Priority: merchant_surface_artifacts text first, then entities.description as last resort.
  const { minContentChars } = CONFIG;

  // Batch-check which entities have current coverage extractions
  const entitiesWithCoverage = new Set<string>();
  if (entityIdsForArtifacts.length > 0) {
    const coverageRows = await prisma.coverage_source_extractions.groupBy({
      by: ['entityId'],
      where: { entityId: { in: entityIdsForArtifacts }, isCurrent: true },
    });
    for (const row of coverageRows) entitiesWithCoverage.add(row.entityId);
  }

  const allRecords: GoldenRecordInput[] = unprocessed.flatMap(e => {
    const sa  = surfaceTextByEntity.get(e.id);
    const menu_raw_text     = sa?.menu_text  || null;
    const winelist_raw_text = null; // future: wire from surface artifacts when winelist parsing exists
    const about_copy        = (sa?.about_text || null) ?? e.description ?? null;
    const hasUsableMenu  = (menu_raw_text?.length  ?? 0) >= minContentChars;
    const hasUsableAbout = (about_copy?.length     ?? 0) >= minContentChars;
    const hasCoverage    = entitiesWithCoverage.has(e.id);
    if (!hasUsableMenu && !hasUsableAbout && !hasCoverage) return [];
    return [{ canonical_id: e.id, name: e.name, menu_raw_text, winelist_raw_text, about_copy }];
  });

  const records = args.limit ? allRecords.slice(0, args.limit) : allRecords;

  console.log(`📍 Found ${records.length} places to process`);
  console.log(`   (${candidates.length} in canonical scope · ${unprocessed.length} unprocessed · ${allRecords.length} with extractable content)\n`);

  if (records.length === 0) {
    console.log('No records to process. Exiting.');
    return;
  }

  // Stats tracking
  const stats = {
    processed: 0,
    extracted: 0,
    held: 0,      // result produced but below confidence threshold — write skipped
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

  // Process records in concurrent batches
  for (let i = 0; i < records.length; i += args.concurrency) {
    const batch = records.slice(i, i + args.concurrency);
    const batchNum = Math.floor(i / args.concurrency) + 1;
    const totalBatches = Math.ceil(records.length / args.concurrency);

    console.log(`\n[Batch ${batchNum}/${totalBatches}] Processing ${batch.length} places...`);

    const batchPromises = batch.map(async (record, batchIdx) => {
      const globalIdx = i + batchIdx;
      const prefix = `[${globalIdx + 1}/${records.length}]`;
      console.log(`${prefix} ${record.name}`);

      try {
        // Materialize coverage evidence for this entity (Phase 5 wiring)
        const coverageEvidence = await materializeCoverageEvidence(record.canonical_id);
        if (args.verbose && coverageEvidence) {
          console.log(`    Coverage: ${coverageEvidence.sourceCount} sources (T1: ${coverageEvidence.provenance.tier1Sources})`);
        }

        const { result, inputQuality } = await extractSignals(record, args.verbose, coverageEvidence);

        stats.processed++;
        stats.byInputQuality[inputQuality.overallQuality]++;

        if (result) {
          const tier = getConfidenceTier(result.confidence);
          stats.byConfidenceTier[tier]++;
          if (tier === 'hold') {
            console.log(`    Held (confidence ${result.confidence.toFixed(2)}) — write skipped, will retry when content improves`);
            stats.held++;
          } else {
            await writeSignals(record.canonical_id, result, inputQuality, args.dryRun);
            stats.extracted++;
          }
        } else if (inputQuality.overallQuality === 'none') {
          stats.skipped++;
        } else {
          stats.failed++;
        }
      } catch (error) {
        console.error(`${prefix} ❌ Error:`, error);
        stats.failed++;
        stats.processed++;
      }
    });

    await Promise.all(batchPromises);

    // Small delay between batches
    if (i + args.concurrency < records.length) {
      await sleep(500);
    }
  }

  // Print summary
  console.log('\n==========================================');
  console.log('📊 EXTRACTION SUMMARY');
  console.log('==========================================');
  console.log(`Total processed:   ${stats.processed}`);
  console.log(`Extracted:         ${stats.extracted}`);
  console.log(`Held (low conf):   ${stats.held}  ← not written, will retry`);
  console.log(`Skipped (no data): ${stats.skipped}`);
  console.log(`Failed:            ${stats.failed}`);
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
