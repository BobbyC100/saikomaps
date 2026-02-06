/**
 * SaikoAI: Generate map metadata from places.
 * Uses Anthropic Claude. Model config via env (ANTHROPIC_API_KEY, AI_MODEL).
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  SAIKOAI_MAP_METADATA_SYSTEM_PROMPT,
  buildMapMetadataUserPrompt,
  type PlaceForMetadata,
} from './prompts/map-metadata';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const AI_MODEL = process.env.AI_MODEL || 'claude-sonnet-4-5-20250929';

export interface GenerateMapDetailsResult {
  title: string;
  description: string;
  scope: {
    geography: string;
    placeTypes: string[];
  };
}

function parseAiResponse(text: string): GenerateMapDetailsResult {
  let cleaned = text.trim();
  const fenceMatch = cleaned.match(/^```(?:json)?\s*([\s\S]*?)```$/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  const parsed = JSON.parse(cleaned) as Record<string, unknown>;

  const scope = parsed.scope as Record<string, unknown> | undefined;
  const geography = typeof scope?.geography === 'string' ? scope.geography : '';
  const placeTypes = Array.isArray(scope?.placeTypes)
    ? (scope.placeTypes as string[]).filter((t): t is string => typeof t === 'string')
    : [];

  return {
    title: typeof parsed.title === 'string' ? parsed.title.trim() : '',
    description: typeof parsed.description === 'string' ? parsed.description.trim() : '',
    scope: {
      geography,
      placeTypes,
    },
  };
}

export async function generateMapDetails(
  places: PlaceForMetadata[]
): Promise<GenerateMapDetailsResult> {
  if (places.length < 3) {
    throw new Error('At least 3 places required to generate map details');
  }

  const userPrompt = buildMapMetadataUserPrompt(places);

  const message = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 1024,
    system: SAIKOAI_MAP_METADATA_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const block = message.content[0];
  const text = block.type === 'text' ? block.text : '';

  try {
    return parseAiResponse(text);
  } catch (err) {
    console.error('Failed to parse AI response:', err);
    console.error('Raw AI response:', text);
    throw new Error('Failed to parse AI response as JSON');
  }
}
