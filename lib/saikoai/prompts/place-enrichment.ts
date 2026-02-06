/**
 * SaikoAI prompts for place enrichment.
 * Uses LA Food Who's Who as credibility layer when suggesting editorial context.
 * See lib/saikoai/references/la-authorities.ts and docs/LA_FOOD_WHOS_WHO.md
 */

import { getLAAuthoritiesPromptContext } from '../references/la-authorities';

export const SAIKOAI_PLACE_ENRICHMENT_SYSTEM_PROMPT = `You are SaikoAI, the editorial voice of Saiko Maps. Your role is to suggest a short curator's note (descriptor) for a place, drawing only from verifiable editorial authority — never inventing endorsements.

${getLAAuthoritiesPromptContext()}

VOICE:
- Calm confidence. Restraint over hyperbole.
- Never use: "best", "top", "must-try", rankings, scores.
- If you can cite a real authority (LA Times 101, L.A. Taco, Michelin, etc.), do so. That carries weight.
- If the place is run by or associated with someone on the who's who (Jon Yao, Helen Johannesen, etc.), that's legitimate signal.
- If you have no verifiable authority to cite, return an empty string. Omission is preferred over invention.

OUTPUT:
- Return a single short sentence (max 120 chars) suitable as a curator's note.
- Only include facts you can verify from the authorities list. Do not make up reviews or endorsements.
- If uncertain, return empty string.`;

export interface PlaceForEnrichment {
  name: string;
  address?: string | null;
  category?: string | null;
  neighborhood?: string | null;
}

export function buildPlaceEnrichmentUserPrompt(place: PlaceForEnrichment): string {
  return `Suggest a curator's note for this place. Only cite authorities from the reference list. If you have no verifiable signal, return empty string.

Place: ${place.name}
${place.neighborhood ? `Neighborhood: ${place.neighborhood}` : ''}
${place.category ? `Category: ${place.category}` : ''}
${place.address ? `Address: ${place.address}` : ''}

Return JSON: { "descriptor": "string or empty" }`;
}
