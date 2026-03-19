/**
 * Saiko Voice Engine v2.0 — Description Prompts
 *
 * Tier 2 (about-synth-v1): Synthesize a description from merchant website copy.
 * Tier 3 (about-compose-v1): Compose a description from identity signals.
 *
 * These prompts are versioned via prompt_version in interpretation_cache.
 * Iteration on prompt text → new prompt_version → re-run affected entities.
 *
 * Spec: docs/traces/about-description-spec-v1.md (Sections 3.2 and 3.3)
 */

// ============================================================================
// TIER 2 — SYNTHESIZE FROM MERCHANT COPY (about-synth-v1)
// ============================================================================

export const ABOUT_SYNTH_SYSTEM_PROMPT = `You are writing a short About description for a restaurant or place, using text from their own website.

Your job is to distill their scattered website copy into a single coherent 2-3 sentence paragraph that describes what the place IS.

RULES:
- Use THEIR vocabulary, not yours. Mirror words, phrases, and framing from the source text.
- Describe what the place is, not why it's good. No evaluation, no recommendation.
- No superlatives (best, finest, amazing). No marketing language (artisanal, curated, elevated).
- No first-person if the source doesn't use it. If the source says "we", you may use "we". If it doesn't, write in third-person.
- 40-80 words. Compact. Every sentence earns its place.
- Do NOT introduce facts that aren't in the source material. If the source doesn't mention a chef's name, neither do you.
- Do NOT evaluate, recommend, or editorialize. No "worth a visit", no "standout", no "beloved".
- The output should read like the place describing itself on its own website — because that's where the words came from.

OUTPUT: Return ONLY the description paragraph. No labels, no quotes, no commentary.`;

export function buildAboutSynthUserPrompt(
  entityName: string,
  textBlocks: string[],
  identitySignals: Record<string, unknown> | null,
): string {
  const parts: string[] = [];

  parts.push(`Place: ${entityName}`);
  parts.push('');
  parts.push('Source text from their website (multiple sections):');
  parts.push('---');

  // Include up to 5 text blocks, truncated to avoid prompt bloat
  const blocks = textBlocks.slice(0, 5);
  for (const block of blocks) {
    const trimmed = block.length > 500 ? block.slice(0, 500) + '…' : block;
    parts.push(trimmed);
    parts.push('');
  }

  parts.push('---');

  // Add identity signals as structural context (not as source material for the text)
  if (identitySignals) {
    const contextParts: string[] = [];
    if (identitySignals.cuisine_posture) contextParts.push(`Cuisine posture: ${identitySignals.cuisine_posture}`);
    if (identitySignals.service_model) contextParts.push(`Service model: ${identitySignals.service_model}`);
    if (identitySignals.place_personality) contextParts.push(`Personality: ${identitySignals.place_personality}`);

    if (contextParts.length > 0) {
      parts.push('');
      parts.push('Structural context (for framing, not for verbatim use):');
      contextParts.forEach(p => parts.push(`  ${p}`));
    }
  }

  parts.push('');
  parts.push('Write a 40-80 word About paragraph using their language.');

  return parts.join('\n');
}

// ============================================================================
// TIER 3 — COMPOSE FROM SIGNALS (about-compose-v1)
// ============================================================================

export const ABOUT_COMPOSE_SYSTEM_PROMPT = `You are writing a short About description for a restaurant or place. You don't have their own words — you're working from identity signals and metadata.

Your voice is grounded and descriptive. Warm but observational. You describe what the place is with specificity, without evaluating it or recommending it.

RULES:
- No first-person. This is NOT the merchant speaking. No "we", no "our".
- No marketing tone. No "you'll love", no "perfect for", no superlatives.
- No review language. No "standout", no "worth a visit", no "beloved".
- Warm and specific, not generic. Use the signals to write something that could only describe THIS place.
- Anchor on concrete details: a chef's name, a signature dish, a neighborhood, an origin story, a cooking style.
- 40-80 words. 2-3 sentences. Every sentence carries weight.
- Only reference facts derivable from the input signals. Do NOT invent details.
- The tone target: "A seasonal pasta spot centered on hand-rolled shapes and natural wine, in a corner storefront on Sunset." — grounded, specific, observational.

OUTPUT: Return ONLY the description paragraph. No labels, no quotes, no commentary.`;

export function buildAboutComposeUserPrompt(
  entityName: string,
  category: string | null,
  neighborhood: string | null,
  identitySignals: Record<string, unknown> | null,
  coverageSources?: Array<{ sourceName: string; excerpt: string | null }>,
): string {
  const parts: string[] = [];

  parts.push(`Place: ${entityName}`);
  if (category) parts.push(`Category: ${category}`);
  if (neighborhood) parts.push(`Neighborhood: ${neighborhood}`);
  parts.push('');

  // Identity signals
  if (identitySignals) {
    parts.push('Identity signals:');
    const signalKeys = [
      'cuisine_posture', 'service_model', 'price_tier',
      'wine_program_intent', 'place_personality',
      'origin_story_type',
    ];
    for (const key of signalKeys) {
      const val = identitySignals[key];
      if (val !== null && val !== undefined) {
        parts.push(`  ${key}: ${val}`);
      }
    }

    // Array signals
    const signatureDishes = identitySignals.signature_dishes as string[] | undefined;
    if (signatureDishes && signatureDishes.length > 0) {
      parts.push(`  signature_dishes: ${signatureDishes.join(', ')}`);
    }

    const languageSignals = identitySignals.language_signals as string[] | undefined;
    if (languageSignals && languageSignals.length > 0) {
      parts.push(`  language_signals: ${languageSignals.join(', ')}`);
    }

    const keyProducers = identitySignals.key_producers as string[] | undefined;
    if (keyProducers && keyProducers.length > 0) {
      parts.push(`  key_producers: ${keyProducers.join(', ')}`);
    }
  } else {
    parts.push('Identity signals: none available');
  }

  // Coverage sources for factual grounding
  if (coverageSources && coverageSources.length > 0) {
    parts.push('');
    parts.push('Coverage sources (for factual grounding only):');
    for (const src of coverageSources.slice(0, 3)) {
      const line = src.excerpt
        ? `  ${src.sourceName}: "${src.excerpt.slice(0, 200)}"`
        : `  ${src.sourceName}`;
      parts.push(line);
    }
  }

  parts.push('');
  parts.push('Write a 40-80 word grounded description. Specific and observational, not evaluative.');

  return parts.join('\n');
}
