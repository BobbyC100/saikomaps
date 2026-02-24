/**
 * SceneSense assembly — bridge place data → Voice Engine → Lint → output
 * Used at place API / cache generation boundary
 */

import { computePRL } from './prl';
import { generateSceneSenseCopy, type Mode, type VoiceOutput } from './voice-engine';
import { lintSceneSenseOutput } from './lint';
import { mapPlaceToPlaceForPRL } from './mappers';
import { mapToCanonicalSceneSense } from './mappers';
import type { PRL } from './types';

interface PlaceForAssembly {
  name?: string | null;
  address?: string | null;
  latitude?: unknown;
  longitude?: unknown;
  googlePhotos?: unknown;
  hours?: unknown;
  description?: string | null;
  vibeTags?: string[] | null;
  pullQuote?: string | null;
  category?: string | null;
  tagline?: string | null;
  tips?: string[] | null;
  neighborhood?: string | null;
  prlOverride?: number | null;
  curatorNote?: string | null;
  editorialSources?: unknown;
  appearsOnCount?: number;
  identitySignals?: {
    place_personality?: string | null;
    vibe_words?: string[];
    signature_dishes?: string[];
    formality?: string;
    service_model?: string;
    seating?: string[];
    noise?: string;
    lighting?: string;
    density?: string;
    roles?: string[];
    context?: string[];
  } | null;
}

export interface SceneSenseAssemblyResult {
  prl: PRL;
  mode: Mode;
  scenesense: VoiceOutput | null; // null when PRL < 3
  prlResult: ReturnType<typeof computePRL>;
}

/**
 * Assemble SceneSense for a place.
 * PRL-1/2: returns scenesense: null (no interpretive text; legacy tags only at render)
 * PRL-3: Lite (max 2/surface)
 * PRL-4: Full (max 4/surface)
 */
export function assembleSceneSense(place: PlaceForAssembly): SceneSenseAssemblyResult {
  const placeForPRL = mapPlaceToPlaceForPRL({
    ...place,
    appearsOnCount: place.appearsOnCount,
  });

  const prlOverride =
    place.prlOverride != null && place.prlOverride >= 1 && place.prlOverride <= 4
      ? place.prlOverride
      : null;

  const prlResult = computePRL(placeForPRL, prlOverride);
  const { prl } = prlResult;

  if (prl < 3) {
    return {
      prl,
      mode: 'LITE',
      scenesense: null,
      prlResult,
    };
  }

  const mode: Mode = prl >= 4 ? 'FULL' : 'LITE';

  const canonical = mapToCanonicalSceneSense({
    vibe_words: place.identitySignals?.vibe_words ?? place.vibeTags ?? [],
    place_personality: place.identitySignals?.place_personality ?? null,
    signature_dishes: place.identitySignals?.signature_dishes ?? [],
    neighborhood: place.neighborhood ?? null,
    category: place.category ?? null,
    identitySignals: place.identitySignals ?? null,
  });

  const baseConf = 0.6;
  const hasVibeWords = (place.identitySignals?.vibe_words ?? place.vibeTags ?? []).length > 0;
  const hasDishes = (place.identitySignals?.signature_dishes?.length ?? 0) > 0;

  const confidence = {
    overall: baseConf,
    vibe: hasVibeWords ? 0.8 : 0.5,
    atmosphere: baseConf,
    ambiance: baseConf,
    scene: hasDishes ? 0.7 : 0.5,
  };

  let output = generateSceneSenseCopy(canonical, {
    prl: prl as 3 | 4,
    mode,
    confidence,
  });

  const lint = lintSceneSenseOutput({
    prl,
    mode,
    confidence,
    output,
  });

  if (lint.status === 'FAIL' && lint.actions.includes('DROP_ALL_SCENESENSE')) {
    return { prl, mode, scenesense: null, prlResult };
  }
  output = lint.cleaned_output;

  return {
    prl,
    mode,
    scenesense: output,
    prlResult,
  };
}
