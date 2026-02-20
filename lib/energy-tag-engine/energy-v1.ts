/**
 * Energy Engine v1 — No popularity (Option A)
 * CTO Spec: popular_times NOT available from Google Places API.
 * Energy = language + flags + sensory only.
 * Confidence weights: language 0.50, flags 0.30, sensory 0.20.
 * Schema supports adding popularity later without breaking versions.
 */

import {
  ENERGY_HIGH_TERMS,
  ENERGY_LOW_TERMS,
  ENERGY_SENSORY_TERMS,
  ENERGY_CAPS,
  ENERGY_WEIGHTS_NO_POPULARITY,
} from '@/lib/scoring/lexicons';
import type { EnergyInputs, EnergyResult, TimeBucket } from './types';

const ENERGY_VERSION = 'energy_v1';

/** Max of language + flags + sensory: 25 + 15 + 10 = 50 */
const REWEIGHT_DIVISOR = 50;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function countTermHits(text: string, terms: string[]): number {
  if (!text || !terms.length) return 0;
  const lower = text.toLowerCase();
  return terms.filter((t) => lower.includes(t)).length;
}

/** Language component: -25..+25 from high vs low energy term balance */
function componentLanguage(text: string | null | undefined): number {
  if (!text?.trim()) return 0;
  const hitsHigh = countTermHits(text, ENERGY_HIGH_TERMS);
  const hitsLow = countTermHits(text, ENERGY_LOW_TERMS);
  const net = hitsHigh - hitsLow;
  return clamp(net * 3, ENERGY_CAPS.language.min, ENERGY_CAPS.language.max);
}

/** Flags component: 0–15 (liveMusic 10, barForward 5, goodForGroups 5, cap 15) */
function componentFlags(inputs: EnergyInputs): number {
  let score = 0;
  if (inputs.liveMusic) score += 10;
  if (inputs.barForward) score += 5;
  if (inputs.goodForGroups) score += 5;
  return clamp(score, ENERGY_CAPS.flags.min, ENERGY_CAPS.flags.max);
}

/** Sensory component: -5..+10 from sound/sight/smell term hits */
function componentSensory(text: string | null | undefined): number {
  if (!text?.trim()) return 0;
  let score = 0;
  const soundHigh = countTermHits(text, ENERGY_SENSORY_TERMS.sound.high);
  const soundLow = countTermHits(text, ENERGY_SENSORY_TERMS.sound.low);
  if (soundHigh > 0) score += Math.min(3, soundHigh * 1.5);
  if (soundLow > 0) score -= Math.min(2, soundLow);

  const sightHigh = countTermHits(text, ENERGY_SENSORY_TERMS.sight.high);
  const sightLow = countTermHits(text, ENERGY_SENSORY_TERMS.sight.low);
  if (sightHigh > 0) score += Math.min(2, sightHigh);
  if (sightLow > 0) score -= Math.min(2, sightLow);

  const smellHits = countTermHits(text, ENERGY_SENSORY_TERMS.smell);
  if (smellHits > 0) score += Math.min(3, smellHits * 1.5);

  return clamp(score, ENERGY_CAPS.sensory.min, ENERGY_CAPS.sensory.max);
}

/**
 * Compute baseline energy score.
 * v1: no popularity (always null). time_bucket ignored.
 */
export function computeEnergy(
  inputs: EnergyInputs,
  _timeBucket?: TimeBucket
): EnergyResult {
  const text = inputs.coverageAboutText ?? '';

  const popularityRaw = null; // popular_times not available from Google Places API

  const langScore = componentLanguage(text);
  const flagsScore = componentFlags(inputs);
  const sensoryScore = componentSensory(text);

  const hasLanguage = text.length > 0;
  const hasFlags = !!(inputs.liveMusic || inputs.barForward || inputs.goodForGroups);

  const sumWithoutPopularity = langScore + flagsScore + sensoryScore;
  const score = clamp((sumWithoutPopularity * 100) / REWEIGHT_DIVISOR, 0, 100);
  const confidence =
    (hasLanguage ? ENERGY_WEIGHTS_NO_POPULARITY.language : 0) +
    (hasFlags ? ENERGY_WEIGHTS_NO_POPULARITY.flags : 0) +
    (hasLanguage ? ENERGY_WEIGHTS_NO_POPULARITY.sensory : 0);

  return {
    energy_score: Math.round(score),
    energy_confidence: Math.round(confidence * 100) / 100,
    popularity_component: popularityRaw,
    language_component: langScore,
    flags_component: flagsScore,
    sensory_component: sensoryScore,
    has_popularity: popularityRaw != null,
    has_language: hasLanguage,
    has_flags: hasFlags,
    has_sensory: hasLanguage && (langScore !== 0 || sensoryScore !== 0),
    version: ENERGY_VERSION,
  };
}
