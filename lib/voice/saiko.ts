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
 * Energy phrase source: scenesense.atmosphere (SceneSense output).
 * The Voice Layer never reads raw identity_signals directly.
 *
 * See: docs/voice/saiko-voice-layer.md (SAI-DOC-VOICE-001)
 */

export interface VoiceSignals {
  neighborhood: string | null | undefined;
  category: string | null | undefined;
  /** SceneSense atmosphere output — first item drives the energy phrase. */
  atmosphere?: string[] | null | undefined;
}

export interface IdentityBlock {
  subline: string | null;
  sentence: string | null;
}

/**
 * Maps SceneSense atmosphere labels to editorial English phrases.
 * Energy labels (from voice-engine ENERGY_MAP) → room-feel phrases.
 * Physical labels pass through lowercased when not in the table.
 */
const ATMOSPHERE_PHRASES: Record<string, string> = {
  lively: 'lively room',
  buzzy: 'buzzy room',
  chill: 'laid-back feel',
  cozy: 'cozy room',
  'low-key': 'low-key feel',
  calm: 'calm atmosphere',
  steady: 'steady energy',
  electric: 'electric energy',
  'warm-lit': 'warm-lit room',
  conversational: 'conversational room',
  quiet: 'quiet room',
  'tight room': 'tight room',
  airy: 'airy room',
};

/**
 * Converts SceneSense atmosphere output into the editorial energy phrase.
 * Uses the first atmosphere item; maps through ATMOSPHERE_PHRASES or
 * falls back to lowercasing the label directly.
 * Unrecognized items are rendered lowercase — the system never invents.
 */
export function renderEnergy(atmosphere: string[] | null | undefined): string | null {
  if (!atmosphere || atmosphere.length === 0) return null;
  const label = atmosphere[0];
  if (!label) return null;
  const key = label.toLowerCase();
  return ATMOSPHERE_PHRASES[key] ?? key;
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
 *   sentence — "{open_state} — {energy}"    e.g. "Open now — lively room"
 *
 * Either field is null when insufficient signals are present.
 */
export function renderIdentityBlock(
  signals: VoiceSignals,
  openStateLabel: string | null = null
): IdentityBlock {
  const subline = renderLocation(signals);
  const energy = renderEnergy(signals.atmosphere);

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
