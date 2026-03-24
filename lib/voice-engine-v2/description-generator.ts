/**
 * Saiko Voice Engine v2.0 — Description Generator
 *
 * AI generation for Tier 2 (synthesis) and Tier 3 (composition) descriptions.
 * Mirrors the generator.ts pattern used for tagline generation.
 *
 * Spec: docs/traces/about-description-spec-v1.md
 * Work order: docs/traces/WO-ABOUT-001-voice-descriptor-pipeline.md
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  ABOUT_SYNTH_SYSTEM_PROMPT,
  buildAboutSynthUserPrompt,
  ABOUT_COMPOSE_SYSTEM_PROMPT,
  buildAboutComposeUserPrompt,
} from './description-prompts';
import type { CoverageEvidence } from '../coverage/normalize-evidence';

function getAnthropicClient(): Anthropic {
  const apiKey =
    process.env.ANTHROPIC_API_KEY ||
    process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY not set (also checked NEXT_PUBLIC_ANTHROPIC_API_KEY)'
    );
  }

  return new Anthropic({ apiKey });
}

const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 256;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DescriptionGenerationResult {
  text: string;
  model: string;
  wordCount: number;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validate a generated description meets the spec constraints.
 * Returns the cleaned text or throws if invalid.
 */
function validateDescription(raw: string): string {
  // Strip any wrapping quotes the model might add
  let text = raw.trim();
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    text = text.slice(1, -1).trim();
  }

  // Strip any label prefix the model might add
  text = text.replace(/^(?:about|description|here'?s?\s*(?:the|a)?\s*(?:description|about)?)\s*:\s*/i, '').trim();

  const wordCount = text.split(/\s+/).length;

  if (wordCount < 20) {
    throw new Error(`Description too short: ${wordCount} words (min 20)`);
  }

  if (wordCount > 120) {
    throw new Error(`Description too long: ${wordCount} words (max 120)`);
  }

  return text;
}

// ---------------------------------------------------------------------------
// Tier 2: Synthesize from merchant copy
// ---------------------------------------------------------------------------

export async function generateTier2Description(input: {
  entityName: string;
  textBlocks: string[];
  identitySignals: Record<string, unknown> | null;
}): Promise<DescriptionGenerationResult> {
  const anthropic = getAnthropicClient();
  const userPrompt = buildAboutSynthUserPrompt(
    input.entityName,
    input.textBlocks,
    input.identitySignals,
  );

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: ABOUT_SYNTH_SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: userPrompt },
    ],
  });

  const textContent = response.content.find(c => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text content in Claude response');
  }

  const text = validateDescription(textContent.text);

  return {
    text,
    model: MODEL,
    wordCount: text.split(/\s+/).length,
  };
}

// ---------------------------------------------------------------------------
// Tier 3: Compose from signals
// ---------------------------------------------------------------------------

export async function generateTier3Description(input: {
  entityName: string;
  category: string | null;
  neighborhood: string | null;
  identitySignals: Record<string, unknown> | null;
  coverageSources?: Array<{ sourceName: string; excerpt: string | null }>;
  coverageEvidence?: CoverageEvidence;
}): Promise<DescriptionGenerationResult> {
  const anthropic = getAnthropicClient();
  const userPrompt = buildAboutComposeUserPrompt(
    input.entityName,
    input.category,
    input.neighborhood,
    input.identitySignals,
    input.coverageSources,
    input.coverageEvidence,
  );

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: ABOUT_COMPOSE_SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: userPrompt },
    ],
  });

  const textContent = response.content.find(c => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text content in Claude response');
  }

  const text = validateDescription(textContent.text);

  return {
    text,
    model: MODEL,
    wordCount: text.split(/\s+/).length,
  };
}
