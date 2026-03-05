/**
 * Saiko Voice Layer — lib/voice/saiko.ts
 *
 * Converts structured place signals into editorial natural language
 * for the TRACES identity block.
 *
 * Pure, stateless, deterministic. No API calls. No DB writes.
 * Same inputs always produce the same output.
 *
 * Open/closed state is NOT parsed here — callers must derive it via
 * parseHours() and pass the resulting label in. parseHours is the
 * single source of truth for open-state interpretation.
 *
 * Canonical "vibe words" source: identity_signals.vibe_words (lowercase strings).
 * Deprecated: vibeTags (entities.vibe_tags) — no longer accepted.
 *
 * See: docs/voice/saiko-voice-layer.md (SAI-DOC-VOICE-001)
 */

export interface VoiceSignals {
  neighborhood: string | null | undefined;
  category: string | null | undefined;
  /** Canonical vibe words from identity_signals.vibe_words (lowercase). */
  vibe_words: string[] | null | undefined;
}

export interface IdentityBlock {
  subline: string | null;
  sentence: string | null;
}

/** Maps canonical vibe_words (lowercase) to editorial English phrases. */
const VIBE_PHRASES: Record<string, string> = {
  lively: 'lively room',
  cozy: 'cozy room',
  intimate: 'intimate room',
  chill: 'laid-back feel',
  energetic: 'high-energy room',
  romantic: 'romantic atmosphere',
  'date-friendly': 'strong date-night energy',
  'date night': 'strong date-night energy',
  'late-night': 'late-night energy',
  'late night': 'late-night energy',
  casual: 'casual energy',
  refined: 'refined atmosphere',
  upscale: 'refined atmosphere',
  buzzy: 'buzzy room',
  electric: 'electric energy',
  'low-key': 'low-key feel',
  lowkey: 'low-key feel',
  'after-work': 'solid after-work spot',
  calm: 'calm atmosphere',
};

/**
 * Maps vibe_words through the phrase table and joins matched fragments.
 * Unrecognized words are silently ignored — never invented.
 */
export function renderEnergy(vibe_words: string[] | null | undefined): string | null {
  if (!vibe_words || vibe_words.length === 0) return null;
  const fragments = vibe_words.map((w) => VIBE_PHRASES[w.toLowerCase()] ?? VIBE_PHRASES[w]).filter(Boolean);
  return fragments.length > 0 ? fragments.join(', ') : null;
}

/**
 * Builds the first identity line: "{neighborhood} {category}".
 * Returns null if both values are absent.
 */
export function renderLocation(signals: Pick<VoiceSignals, 'neighborhood' | 'category'>): string | null {
  const neighborhood = signals.neighborhood?.trim() || null;
  const category = signals.category?.toLowerCase().trim() || null;
  const parts = [neighborhood, category].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : null;
}

/**
 * Primary export — renders the full identity block.
 *
 * openStateLabel must be derived by the caller via parseHours(), which is
 * the canonical open-state engine. The Voice Layer never parses hours itself.
 *
 * Returns:
 *   subline  — "{neighborhood} {category}"  e.g. "Culver City restaurant"
 *   sentence — "{open_state} — {energy}"    e.g. "Open now — lively room, strong date-night energy"
 *
 * Either field is null when insufficient signals are present.
 */
export function renderIdentityBlock(
  signals: VoiceSignals,
  openStateLabel: string | null = null
): IdentityBlock {
  const subline = renderLocation(signals);
  const energy = renderEnergy(signals.vibe_words);

  let sentence: string | null = null;
  if (openStateLabel && energy) {
    sentence = `${openStateLabel} — ${energy}`;
  } else if (openStateLabel) {
    sentence = openStateLabel;
  } else if (energy) {
    sentence = energy;
  }

  return { subline, sentence };
}
