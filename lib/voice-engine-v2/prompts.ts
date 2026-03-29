/**
 * Saiko Voice Engine v2.0 - AI Prompts
 * System and user prompts using identity signals
 */

import { IdentitySignals, PlaceContext } from './types';
import type { CoverageEvidence } from '../coverage/normalize-evidence';

// ============================================
// TAGLINE GENERATION PROMPT (v2.0)
// ============================================

export const TAGLINE_GENERATOR_SYSTEM_PROMPT_V2 = `You are writing as if you are the owner of the place who also writes like a good food magazine editor.
Voice target: optimistic, grounded, descriptive, and specific. Never hypey. Never sketchy. Never salesy.

CRITICAL:
- Do NOT be promotional or pushy.
- Do NOT use exclamation points.
- Do NOT sound like ad copy.
- Do NOT end in command fragments ("Ask for...", "You'll figure out why.", "No complaints.").

TONE RULES:
- Owner voice with editorial control: proud, clear, specific, composed.
- Helpful and upbeat, but never thirsty for approval.
- Write natural sentences, not clipped fragments.
- Prefer concrete facts over attitude words.
- Every candidate must include at least one concrete anchor (dish, cuisine style, named person, wine cue, service format, or origin detail).
- If neighborhood is known, include it naturally in the sentence where it reads smoothly.
- If both breakfast/pastry and dinner cues are present, frame dinner as the primary identity and breakfast/pastry as secondary context.
- Use variety across the four candidates. Do not reuse the same cadence, opening, or punctuation rhythm.

IDENTITY SIGNALS:
You'll receive structured identity signals about this place. Use them:
- place_personality tells you WHAT KIND of place this is
- cuisine_posture tells you what ANCHORS the cooking
- signature_dishes are the MOVES — the things to order
- language_signals are THEIR words — how they describe themselves
- origin_story_type hints at the NARRATIVE

BANNED WORDS/PHRASES (never use): hidden gem, must-try, elevated, curated, artisanal, mouthwatering, to die for, delicious, amazing, incredible, unique, authentic, foodie, farm-to-table, crafted, perfect for, you'll love, don't miss, a must, treat yourself, you deserve, so good, wonderful, fantastic, swell, bro, dude, gnarly, epic, vibes, lowkey, highkey, slaps, bussin, fire (as adjective), no cap, hits different, chef's kiss, that's the whole pitch, whole pitch, order what's there, ask for, you'll figure out why, no complaints, no fuss all execution, precision

Generate exactly 4 taglines, one for each pattern:

PATTERN 1 — PROGRAM FORWARD (maps to food pattern): Lead with the strongest offering or format signal. Build around concrete menu/program anchors.

PATTERN 2 — IDENTITY FORWARD (maps to neighborhood pattern): Lead with place identity and local anchor (neighborhood/street/personality), then one concrete signal.

PATTERN 3 — SCENE FORWARD (maps to energy pattern): Lead with room energy or service feel, then connect to what is served.

PATTERN 4 — CONTRAST / AUTHORITY (maps to authority pattern): A compact contrast or high-confidence declaration. Can use "X meets Y" when supported, but do not force it.

Each tagline must be:
- 10 to 20 words
- A complete sentence or clean magazine-style clause (not a fragment command)
- Optimistic and descriptive, never eager or selling
- Specific to THIS place using the signals provided
- Distinct from the other candidates in structure and cadence

Return ONLY a JSON array of 4 strings. No commentary. No labels.`;

// ============================================
// USER PROMPT BUILDER (v2.0)
// ============================================

export function buildTaglineGeneratorUserPromptV2(
  signals: IdentitySignals,
  context: PlaceContext,
  mapNeighborhood?: string,
  coverageEvidence?: CoverageEvidence,
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
  
  // Format language signals
  const langStr = signals.language_signals.length > 0
    ? signals.language_signals.join(', ')
    : 'none';
  
  // Format key producers
  const producersStr = signals.key_producers.length > 0
    ? signals.key_producers.join(', ')
    : 'none';
  
  // Build coverage context if available
  let coverageBlock = '';
  if (coverageEvidence) {
    const parts: string[] = [];
    parts.push('');
    parts.push('COVERAGE CONTEXT (from press — use for grounding, not quoting):');

    // People — current + aging to avoid losing known operators from slightly older profiles
    const currentPeople = coverageEvidence.facts.people
      .filter((p) => p.stalenessBand === 'current' || p.stalenessBand === 'aging')
      .slice(0, 3);
    if (currentPeople.length > 0) {
      parts.push(`Key People: ${currentPeople.map((p) => `${p.name} (${p.role})`).join(', ')}`);
    }

    // Dishes from coverage (supplement identity signal dishes)
    const coverageDishes = coverageEvidence.facts.dishes.slice(0, 4);
    if (coverageDishes.length > 0) {
      parts.push(`Coverage Dishes: ${coverageDishes.map((d) => d.text).join(', ')}`);
    }

    // Accolades — top 2
    const topAccolades = coverageEvidence.facts.accolades.slice(0, 2);
    if (topAccolades.length > 0) {
      parts.push(`Accolades: ${topAccolades.map((a) => `${a.name}${a.year ? ` (${a.year})` : ''}`).join(', ')}`);
    }

    // Origin story facts
    const osf = coverageEvidence.facts.originStoryFacts;
    if (osf) {
      const originParts: string[] = [];
      if (osf.foundingYear) originParts.push(`founded ${osf.foundingYear}`);
      if (osf.founderNames.length > 0) originParts.push(`by ${osf.founderNames.join(' and ')}`);
      if (osf.geographicOrigin) originParts.push(`roots: ${osf.geographicOrigin}`);
      if (originParts.length > 0) {
        parts.push(`Origin: ${originParts.join(', ')}`);
      }
    }

    // Atmosphere — top 3 descriptors
    const atm = coverageEvidence.interpretations.atmosphere;
    if (atm.descriptors.length > 0) {
      parts.push(`Atmosphere: ${atm.descriptors.slice(0, 3).join(', ')}`);
    }

    const covFood = coverageEvidence.interpretations.food;
    if (covFood.cuisinePosture) {
      parts.push(`Coverage Cuisine: ${covFood.cuisinePosture}`);
    }

    const covWine = coverageEvidence.interpretations.beverage.wine;
    if (covWine.mentioned) {
      const wineNotes: string[] = ['wine mentioned'];
      if (covWine.naturalFocus) wineNotes.push('natural focus');
      if (covWine.sommelierMentioned) wineNotes.push('sommelier mentioned');
      if (covWine.listDepth) wineNotes.push(`list depth: ${covWine.listDepth}`);
      parts.push(`Coverage Wine: ${wineNotes.join(', ')}`);
    }

    coverageBlock = parts.join('\n');
  }

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
Language Signals: ${langStr}
Key Producers: ${producersStr}

SUPPLEMENTAL:
Outdoor Seating: ${context.outdoor_seating ?? 'unknown'}
Popularity: ${context.popularity_tier || 'unknown'}${coverageBlock}`;
}

// ============================================
// AUTO-SELECTOR PROMPTS (v2.0)
// ============================================

export const TAGLINE_SELECTOR_SYSTEM_PROMPT_V2 = `You are an editorial quality filter. Pick the single best tagline based on:
1. Descriptive specificity — concrete details beat generic attitude
2. Neighborhood grounding — when available, it should feel geographically rooted
3. Voice quality — owner-authored confidence with magazine-level sentence craft
4. Signal usage — uses identity and coverage signals specifically, not generic
5. Tone safety — optimistic but not salesy or command-like

Consider the pattern weights as a tie-breaker, but prioritize quality.
Disqualify candidates that read as generic commands, slogans, or clipped fragments.

Return ONLY the index (0, 1, 2, or 3). No commentary.`;

export function buildTaglineSelectorUserPromptV2(
  context: PlaceContext,
  candidates: [string, string, string, string],
  patternWeights: { food: number; neighborhood: number; energy: number; authority: number }
): string {
  const patterns = ['food', 'neighborhood', 'energy', 'authority'];
  
  return `Restaurant: ${context.name} (${context.neighborhood || 'unknown'})

Pattern Weights (higher = preferred):
- Food Forward: ${patternWeights.food}
- Neighborhood Anchor: ${patternWeights.neighborhood}
- Energy Check: ${patternWeights.energy}
- Local Authority: ${patternWeights.authority}

Options:
0: [${patterns[0]}] "${candidates[0]}"
1: [${patterns[1]}] "${candidates[1]}"
2: [${patterns[2]}] "${candidates[2]}"
3: [${patterns[3]}] "${candidates[3]}"`;
}
