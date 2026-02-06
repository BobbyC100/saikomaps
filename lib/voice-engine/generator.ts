/**
 * Saiko Voice Engine v1.1 - Tagline Generator
 * Generate 4 tagline candidates using Claude Haiku
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  TAGLINE_GENERATOR_SYSTEM_PROMPT,
  buildTaglineGeneratorUserPrompt,
} from './prompts';
import { TaglineGenerationInput } from './types';
import { validateTaglineCandidates } from './validation';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Use Claude Haiku for fast, cheap generation
const HAIKU_MODEL = 'claude-3-5-haiku-20250205';

export interface GenerateTaglineCandidatesResult {
  candidates: [string, string, string, string];
  validationResults: Array<{ valid: boolean; bannedWords?: string[] }>;
  allValid: boolean;
}

/**
 * Parse AI response into array of 4 tagline strings
 */
function parseTaglineResponse(text: string): [string, string, string, string] {
  let cleaned = text.trim();
  
  // Remove code fence if present
  const fenceMatch = cleaned.match(/^```(?:json)?\s*([\s\S]*?)```$/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }
  
  const parsed = JSON.parse(cleaned);
  
  if (!Array.isArray(parsed) || parsed.length !== 4) {
    throw new Error('Response must be an array of exactly 4 taglines');
  }
  
  return parsed as [string, string, string, string];
}

/**
 * Generate 4 tagline candidates using Claude Haiku
 * Returns candidates and validation results
 */
export async function generateTaglineCandidates(
  input: TaglineGenerationInput
): Promise<GenerateTaglineCandidatesResult> {
  const userPrompt = buildTaglineGeneratorUserPrompt(
    input.signals,
    input.derived,
    input.mapNeighborhood
  );
  
  const message = await client.messages.create({
    model: HAIKU_MODEL,
    max_tokens: 512,
    system: TAGLINE_GENERATOR_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });
  
  const block = message.content[0];
  const text = block.type === 'text' ? block.text : '';
  
  try {
    const candidates = parseTaglineResponse(text);
    const validationResults = validateTaglineCandidates(candidates);
    const allValid = validationResults.every((r) => r.valid);
    
    return {
      candidates,
      validationResults,
      allValid,
    };
  } catch (err) {
    console.error('Failed to parse tagline generation response:', err);
    console.error('Raw AI response:', text);
    throw new Error('Failed to parse tagline generation response');
  }
}

/**
 * Generate tagline candidates with retry on validation failure
 * Retries once if any candidate contains banned words
 */
export async function generateTaglineCandidatesWithRetry(
  input: TaglineGenerationInput
): Promise<GenerateTaglineCandidatesResult> {
  let result = await generateTaglineCandidates(input);
  
  // If validation failed, retry once
  if (!result.allValid) {
    console.log(
      '[Voice Engine] Generation contained banned words, retrying...',
      result.validationResults
        .map((r, i) => (!r.valid ? `Candidate ${i}: ${r.bannedWords?.join(', ')}` : null))
        .filter(Boolean)
    );
    
    result = await generateTaglineCandidates(input);
  }
  
  return result;
}
