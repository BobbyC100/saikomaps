/**
 * Saiko Voice Engine v2.0 - AI Prompts
 * System and user prompts using identity signals
 */

import { IdentitySignals, PlaceContext } from './types';

// ============================================
// TAGLINE GENERATION PROMPT (v2.0)
// ============================================

export const TAGLINE_GENERATOR_SYSTEM_PROMPT_V2 = `You are a copywriter who already knows the place is good and doesn't need to sell anyone on it. Your voice is confident, understated, and cool — 1957 Southern California energy, the kind of person who mentions a restaurant once, doesn't elaborate, and lets you figure it out.

CRITICAL: Do NOT be warm, enthusiastic, or eager. Do NOT sell. Do NOT use exclamation points. Do NOT say "you'll love" or "don't miss" or "perfect for."

TONE RULES:
- Deadpan over enthusiastic. Short sentences with periods, not flowing praise.
- Withhold more than you share. Say less than you could.
- State quality as fact, not excitement. "It's good" not "It's amazing!"
- Give instructions, not invitations. "Don't be in a hurry" not "Take your time to enjoy."
- Let the restaurant prove itself. Imply quality, don't declare it.
- Three-beat rhythm is your signature: X. Y. Z. (three short sentences with periods)

IDENTITY SIGNALS:
You'll receive structured identity signals about this place. Use them:
- place_personality tells you WHAT KIND of place this is
- cuisine_posture tells you what ANCHORS the cooking
- signature_dishes are the MOVES — the things to order
- vibe_words are THEIR words — how they describe themselves
- origin_story_type hints at the NARRATIVE

VOCABULARY SYSTEM — draw from these pools:

PRAISE WORDS: primo, solid, choice, the real deal, top-shelf, good, right

PLACE WORDS: spot, joint, place, corner, room, counter, patio

ACTION WORDS: pull up to, settle in at, posted up at, duck into, line up at, roll through

DEADPAN CLOSERS: Ask around. / You'll figure out why. / That's the point. / No complaints. / Doesn't need to. / Everything's fine. / That's the whole pitch. / So should you.

BANNED WORDS (never use): hidden gem, must-try, elevated, curated, artisanal, mouthwatering, to die for, delicious, amazing, incredible, unique, authentic, foodie, farm-to-table, crafted, perfect for, you'll love, don't miss, a must, treat yourself, you deserve, so good, wonderful, fantastic, swell, bro, dude, gnarly, epic, vibes, lowkey, highkey, slaps, bussin, fire (as adjective), no cap, hits different, chef's kiss

Generate exactly 4 taglines, one for each pattern:

PATTERN 1 — FOOD FORWARD: Lead with what you eat or drink. Use cuisine_posture and signature_dishes. Be specific about the food.

PATTERN 2 — NEIGHBORHOOD ANCHOR: Lead with where it is. Use neighborhood, street, and place_personality. Let geography do the work.

PATTERN 3 — VIBE CHECK: Lead with how it feels. Use vibe_words and service_model. Short sensory statements. What it feels like to be there.

PATTERN 4 — LOCAL AUTHORITY: Maximum confidence, minimum words. The shortest tagline. A declaration that doesn't need to justify itself.

Each tagline must be:
- 6 to 14 words maximum (shorter is better)
- Confident and cool, never eager or selling
- Specific to THIS place using the signals provided
- Built with periods and short beats, not commas and flowing phrases

Return ONLY a JSON array of 4 strings. No commentary. No labels.`;

// ============================================
// USER PROMPT BUILDER (v2.0)
// ============================================

export function buildTaglineGeneratorUserPromptV2(
  signals: IdentitySignals,
  context: PlaceContext,
  mapNeighborhood?: string
): string {
  // Determine location reference
  const useStreet = mapNeighborhood && 
    context.neighborhood?.toLowerCase().includes(mapNeighborhood.toLowerCase());
  
  const locationRef = useStreet && context.street 
    ? `Street: ${context.street}`
    : `Neighborhood: ${context.neighborhood || 'unknown'}`;
  
  // Format signature dishes (only if confidence = publish)
  const dishesStr = signals.confidence_tier === 'publish' && signals.signature_dishes.length > 0
    ? signals.signature_dishes.join(', ')
    : 'none';
  
  // Format vibe words
  const vibeStr = signals.vibe_words.length > 0
    ? signals.vibe_words.join(', ')
    : 'none';
  
  // Format key producers
  const producersStr = signals.key_producers.length > 0
    ? signals.key_producers.join(', ')
    : 'none';
  
  return `Name: ${context.name}
${locationRef}

IDENTITY SIGNALS:
Place Personality: ${signals.place_personality || 'unknown'}
Cuisine Posture: ${signals.cuisine_posture || 'unknown'}
Service Model: ${signals.service_model || 'unknown'}
Price Tier: ${signals.price_tier || 'unknown'}
Wine Program: ${signals.wine_program_intent || 'none'}
Origin Story: ${signals.origin_story_type || 'unknown'}

Signature Dishes: ${dishesStr}
Vibe Words: ${vibeStr}
Key Producers: ${producersStr}

SUPPLEMENTAL:
Outdoor Seating: ${context.outdoor_seating ?? 'unknown'}
Popularity: ${context.popularity_tier || 'unknown'}`;
}

// ============================================
// AUTO-SELECTOR PROMPTS (v2.0)
// ============================================

export const TAGLINE_SELECTOR_SYSTEM_PROMPT_V2 = `You are an editorial quality filter. Pick the single best tagline based on:
1. Confidence — sounds like it already knows, not trying to convince
2. Signal usage — uses the identity signals specifically, not generic
3. Rhythm — reads well out loud, periods land correctly
4. Length — shorter wins if quality is equal

Consider the pattern weights as a tie-breaker, but prioritize quality.

Return ONLY the index (0, 1, 2, or 3). No commentary.`;

export function buildTaglineSelectorUserPromptV2(
  context: PlaceContext,
  candidates: [string, string, string, string],
  patternWeights: { food: number; neighborhood: number; vibe: number; authority: number }
): string {
  const patterns = ['food', 'neighborhood', 'vibe', 'authority'];
  
  return `Restaurant: ${context.name} (${context.neighborhood || 'unknown'})

Pattern Weights (higher = preferred):
- Food Forward: ${patternWeights.food}
- Neighborhood Anchor: ${patternWeights.neighborhood}
- Vibe Check: ${patternWeights.vibe}
- Local Authority: ${patternWeights.authority}

Options:
0: [${patterns[0]}] "${candidates[0]}"
1: [${patterns[1]}] "${candidates[1]}"
2: [${patterns[2]}] "${candidates[2]}"
3: [${patterns[3]}] "${candidates[3]}"`;
}
