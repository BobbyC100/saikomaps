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
import { validateTaglineCandidates, filterValidTaglines } from '../voice-engine/validation';

const anthropic = new Anthropic();

const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 512;

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
    input.mapNeighborhood
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
    const validationResults = validateTaglineCandidates(candidates);
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
  
  while (attempts <= maxRetries) {
    lastResult = await generateTaglineCandidatesV2(input);
    
    if (lastResult.allValid) {
      return lastResult;
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
  return lastResult!;
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
    "Still here. That's enough.",
    `${placeName}. Ask around.`,
    "It does what it does. No complaints.",
    "Good place. You'll figure out why.",
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
