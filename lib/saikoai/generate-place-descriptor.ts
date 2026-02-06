/**
 * SaikoAI: Generate a curator's descriptor for a place using LA authorities.
 * Call when enriching a place with editorial context.
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  SAIKOAI_PLACE_ENRICHMENT_SYSTEM_PROMPT,
  buildPlaceEnrichmentUserPrompt,
  type PlaceForEnrichment,
} from './prompts/place-enrichment';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const AI_MODEL = process.env.AI_MODEL || 'claude-sonnet-4-5-20250929';

export interface GeneratePlaceDescriptorResult {
  descriptor: string;
}

function parseAiResponse(text: string): GeneratePlaceDescriptorResult {
  let cleaned = text.trim();
  const fenceMatch = cleaned.match(/^```(?:json)?\s*([\s\S]*?)```$/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  const parsed = JSON.parse(cleaned) as Record<string, unknown>;
  const descriptor = typeof parsed.descriptor === 'string' ? parsed.descriptor.trim() : '';
  return { descriptor };
}

export async function generatePlaceDescriptor(
  place: PlaceForEnrichment
): Promise<GeneratePlaceDescriptorResult> {
  const userPrompt = buildPlaceEnrichmentUserPrompt(place);

  const message = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 256,
    system: SAIKOAI_PLACE_ENRICHMENT_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const block = message.content[0];
  const text = block.type === 'text' ? block.text : '';

  try {
    return parseAiResponse(text);
  } catch (err) {
    console.error('Failed to parse place enrichment response:', err);
    return { descriptor: '' };
  }
}
