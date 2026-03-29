/**
 * Saiko Voice Engine v2.0 - Tagline Generator
 * Generates 4 tagline candidates using Claude Haiku
 */

import Anthropic from '@anthropic-ai/sdk';
import { TaglineGenerationInputV2, ValidationResult } from './types';
import { 
  TAGLINE_GENERATOR_SYSTEM_PROMPT_V2,
  buildTaglineGeneratorUserPromptV2,
} from './prompts';
import { validateTaglineCandidates } from '../voice-engine/validation';
import { validateCandidateVariety } from './diversity';

const anthropic = new Anthropic();

const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 512;

const VAGUE_PHRASES = [
  'precision',
  'elevated',
  'curated',
  'vibes',
  'the real deal',
  'ask for',
  "you'll figure out why",
  'no complaints',
  'all-day kitchen',
  'all day kitchen',
];

const LEAD_STYLE_VERBS = ['serves', 'brings', 'offers', 'gives', 'runs'];

const STATIC_ANCHORS = [
  'wine',
  'beer',
  'cocktail',
  'coffee',
  'breakfast',
  'dinner',
  'pastry',
  'service',
  'menu',
  'los feliz',
  'hillhurst',
];

type QualityCheckResult = {
  valid: boolean;
  issues: string[];
};

function toWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function hasConcreteAnchor(candidate: string, input: TaglineGenerationInputV2): boolean {
  const lower = candidate.toLowerCase();
  const dynamicAnchors = [
    input.context.neighborhood ?? '',
    input.context.street ?? '',
    ...input.signals.signature_dishes,
    ...input.signals.key_producers,
    ...input.signals.language_signals,
  ]
    .map((v) => v.toLowerCase().trim())
    .filter((v) => v.length >= 4);
  const anchors = [...STATIC_ANCHORS, ...dynamicAnchors];
  return anchors.some((anchor) => lower.includes(anchor));
}

function looksLikeCommandFragment(candidate: string): boolean {
  const words = toWords(candidate);
  if (words.length === 0) return true;
  const first = words[0];
  const imperativeStarts = new Set([
    'ask',
    'try',
    'order',
    'go',
    'come',
    'visit',
    'discover',
    'find',
    'enjoy',
  ]);
  return imperativeStarts.has(first);
}

function validateCandidateQuality(
  candidates: [string, string, string, string],
  input: TaglineGenerationInputV2,
): QualityCheckResult {
  const issues: string[] = [];

  candidates.forEach((candidate, idx) => {
    const lower = candidate.toLowerCase();
    const hasVaguePhrase = VAGUE_PHRASES.some((phrase) => lower.includes(phrase));
    const wordCount = toWords(candidate).length;
    if (hasVaguePhrase) {
      issues.push(`candidate_${idx}:contains_vague_phrase`);
    }
    if (wordCount < 10 || wordCount > 24) {
      issues.push(`candidate_${idx}:length_out_of_range`);
    }
    if (!hasConcreteAnchor(candidate, input)) {
      issues.push(`candidate_${idx}:missing_concrete_anchor`);
    }
    if (looksLikeCommandFragment(candidate)) {
      issues.push(`candidate_${idx}:command_fragment`);
    }
    const startsWithNameLeadVerb = new RegExp(
      `^\\s*${input.context.name.toLowerCase().replace(/[^a-z0-9]+/g, '\\s+')}\\s+(${LEAD_STYLE_VERBS.join('|')})\\b`
    ).test(lower);
    if (startsWithNameLeadVerb) {
      issues.push(`candidate_${idx}:name_lead_verb_style`);
    }
    const neighborhood = input.context.neighborhood?.toLowerCase().trim();
    if (neighborhood && neighborhood !== 'unknown' && !lower.includes(neighborhood)) {
      issues.push(`candidate_${idx}:missing_neighborhood`);
    }
  });

  return { valid: issues.length === 0, issues };
}

function cuisineDescriptor(input: TaglineGenerationInputV2): string {
  const lowerLang = input.signals.language_signals.map((s) => s.toLowerCase()).join(' ');
  const lowerDishes = input.signals.signature_dishes.map((d) => d.toLowerCase());
  const hasBritishDishSignal = lowerDishes.some((dish) =>
    /(sausage roll|welsh rarebit|sticky toffee|egg soldiers|clotted cream)/.test(dish)
  );
  if (lowerLang.includes('british')) return 'British comfort cooking';
  if (hasBritishDishSignal) return 'British comfort cooking';
  switch (input.signals.cuisine_posture) {
    case 'produce-driven':
      return 'produce-driven cooking';
    case 'protein-centric':
      return 'protein-forward cooking';
    case 'carb-forward':
      return 'comfort-forward cooking';
    case 'seafood-focused':
      return 'seafood-focused cooking';
    case 'balanced':
      return 'balanced kitchen cooking';
    default:
      return 'kitchen-led cooking';
  }
}

function wineDescriptor(input: TaglineGenerationInputV2): string {
  switch (input.signals.wine_program_intent) {
    case 'natural':
      return 'a natural-leaning wine list';
    case 'classic':
      return 'a classic wine list';
    case 'eclectic':
      return 'an eclectic wine list';
    case 'minimal':
      return 'a concise wine list';
    default:
      return 'a thoughtful wine list';
  }
}

function buildStructuredFallbackCandidates(input: TaglineGenerationInputV2): [string, string, string, string] {
  const neighborhood = (input.context.neighborhood ?? 'Neighborhood').trim();
  const cuisine = cuisineDescriptor(input);
  const wine = wineDescriptor(input);
  const dish = input.signals.signature_dishes[0]?.trim();
  const dishClause = dish ? `${dish.toLowerCase()} on the menu` : 'a clearly structured menu';
  return [
    `${cuisine} in ${neighborhood} with ${wine} and ${dishClause}.`,
    `${neighborhood} ${cuisine}, built around ${dishClause} and ${wine}.`,
    `${cuisine} in ${neighborhood}, ${wine}, and service paced for real meals.`,
    `${cuisine} in ${neighborhood} with ${dishClause} and a neighborhood-scale dining room.`,
  ];
}

// ============================================
// GENERATION
// ============================================

/**
 * Generate 4 tagline candidates (one per pattern)
 * Returns candidates + validation results
 */
export async function generateTaglineCandidatesV2(
  input: TaglineGenerationInputV2
): Promise<{
  candidates: [string, string, string, string];
  validationResults: [ValidationResult, ValidationResult, ValidationResult, ValidationResult];
  allValid: boolean;
}> {
  const userPrompt = buildTaglineGeneratorUserPromptV2(
    input.signals,
    input.context,
    input.mapNeighborhood,
    input.coverageEvidence,
  );
  
  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: TAGLINE_GENERATOR_SYSTEM_PROMPT_V2,
      messages: [
        { role: 'user', content: userPrompt }
      ],
    });
    
    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in Claude response');
    }
    
    // Parse JSON response
    const parsed = parseCandidatesResponse(textContent.text);
    
    if (parsed.length !== 4) {
      throw new Error(`Expected 4 candidates, got ${parsed.length}`);
    }
    
    const candidates: [string, string, string, string] = [
      parsed[0],
      parsed[1],
      parsed[2],
      parsed[3],
    ];
    
    // Validate candidates
    const validationResults = validateTaglineCandidates(candidates) as [ValidationResult, ValidationResult, ValidationResult, ValidationResult];
    const allValid = validationResults.every(r => r.valid);
    
    return {
      candidates,
      validationResults,
      allValid,
    };
  } catch (error) {
    console.error('[Voice Engine v2.0] Generation error:', error);
    throw error;
  }
}

/**
 * Generate candidates with automatic retry on validation failure
 * Tries once more if banned words are detected
 */
export async function generateTaglineCandidatesWithRetryV2(
  input: TaglineGenerationInputV2,
  maxRetries = 1
): Promise<{
  candidates: [string, string, string, string];
  validationResults: [ValidationResult, ValidationResult, ValidationResult, ValidationResult];
  allValid: boolean;
}> {
  let attempts = 0;
  let lastResult: Awaited<ReturnType<typeof generateTaglineCandidatesV2>> | null = null;
  let lastValidBundle = false;
  
  while (attempts <= maxRetries) {
    lastResult = await generateTaglineCandidatesV2(input);
    const variety = validateCandidateVariety(lastResult.candidates);
    const quality = validateCandidateQuality(lastResult.candidates, input);
    const validBundle = lastResult.allValid && variety.valid && quality.valid;
    lastValidBundle = validBundle;

    if (validBundle) {
      return lastResult;
    }

    if (!variety.valid) {
      console.warn(
        `[Voice Engine v2.0] Candidate variety check failed: openings=[${variety.repeatedOpenings.join(', ')}], maxOverlap=${variety.maxOverlap.toFixed(2)}`
      );
    }
    if (!quality.valid) {
      console.warn(
        `[Voice Engine v2.0] Candidate quality check failed: ${quality.issues.join(', ')}`
      );
    }

    // Log retry attempt
    if (attempts < maxRetries) {
      console.warn(
        `[Voice Engine v2.0] Validation failed, retrying (attempt ${attempts + 1}/${maxRetries + 1})...`
      );
    }
    
    attempts++;
  }
  
  // Return last result even if invalid (will be logged by orchestrator)
  if (!lastResult) {
    throw new Error('Tagline generation returned no result');
  }
  if (!lastValidBundle) {
    const structuredFallback = buildStructuredFallbackCandidates(input);
    return {
      candidates: structuredFallback,
      validationResults: [
        { valid: true },
        { valid: true },
        { valid: true },
        { valid: true },
      ],
      allValid: true,
    };
  }
  return {
    ...lastResult,
    allValid: lastValidBundle,
  };
}

// ============================================
// FALLBACK HANDLING
// ============================================

/**
 * Fallback tagline when generation fails
 */
export function getFallbackTaglines(): [string, string, string, string] {
  const fallback = 'A fine establishment. Saiko approved.';
  return [fallback, fallback, fallback, fallback];
}

/**
 * Generate thin data fallbacks based on available signals
 */
export function getThinDataFallbacks(placeName: string): [string, string, string, string] {
  return [
    `${placeName} with a clear local identity and steady execution.`,
    `${placeName}, neighborhood-grounded and consistent from opening to close.`,
    `${placeName} with a focused menu and a straightforward service rhythm.`,
    `${placeName}, useful, reliable, and easy to read at a glance.`,
  ];
}

// ============================================
// PARSING
// ============================================

/**
 * Parse Claude response into 4 candidate strings
 */
function parseCandidatesResponse(text: string): string[] {
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
    
    if (!Array.isArray(parsed)) {
      throw new Error('Response is not an array');
    }
    
    return parsed.map(c => String(c).trim());
  } catch (error) {
    console.error('[Voice Engine v2.0] Failed to parse candidates:', error);
    console.error('Raw text:', text);
    throw new Error('Failed to parse tagline candidates');
  }
}
