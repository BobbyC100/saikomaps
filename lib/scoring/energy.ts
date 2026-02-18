/**
 * Energy score (0–100) — pipeline-generated, auditable.
 * Spec: docs/ENERGY_SCORE_SPEC.md
 */

import {
  ENERGY_HIGH_TERMS,
  ENERGY_LOW_TERMS,
  ENERGY_COMPRESSION_TERMS,
  ENERGY_SENSORY_TERMS,
  ENERGY_CAPS,
  ENERGY_WEIGHTS,
  ENERGY_REWEIGHT_DIVISOR,
} from './lexicons';
import type { EnergyScoreInputs } from './types';
import type { ScoreResult } from './types';

const VERSION = 'energy_v1_locked';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function countTermHits(text: string, terms: string[]): number {
  if (!text || !terms.length) return 0;
  const lower = text.toLowerCase();
  return terms.filter((t) => lower.includes(t)).length;
}

/** Language component: -25..+25 from high vs low energy term balance */
function componentLanguage(text: string | null | undefined): { score: number; hitsHigh: number; hitsLow: number } {
  if (!text?.trim()) return { score: 0, hitsHigh: 0, hitsLow: 0 };
  const hitsHigh = countTermHits(text, ENERGY_HIGH_TERMS);
  const hitsLow = countTermHits(text, ENERGY_LOW_TERMS);
  const net = hitsHigh - hitsLow;
  const score = clamp(net * 3, ENERGY_CAPS.language.min, ENERGY_CAPS.language.max);
  return { score, hitsHigh, hitsLow };
}

/** Flags component: 0–15 (liveMusic 10, barForward 5, goodForGroups 5, cap 15) */
function componentFlags(inputs: EnergyScoreInputs): { score: number; signals: string[] } {
  let score = 0;
  const signals: string[] = [];
  if (inputs.liveMusic) {
    score += 10;
    signals.push('liveMusic');
  }
  if (inputs.barForward) {
    score += 5;
    signals.push('barForward');
  }
  if (inputs.goodForGroups) {
    score += 5;
    signals.push('goodForGroups');
  }
  score = clamp(score, ENERGY_CAPS.flags.min, ENERGY_CAPS.flags.max);
  return { score, signals };
}

/** Compression component: 0–15 from text signals (+ optional reservation friction later) */
function componentCompression(text: string | null | undefined): { score: number; hits: number } {
  if (!text?.trim()) return { score: 0, hits: 0 };
  const hits = countTermHits(text, ENERGY_COMPRESSION_TERMS);
  const score = clamp(hits * 3, ENERGY_CAPS.compression.min, ENERGY_CAPS.compression.max);
  return { score, hits };
}

/** Sensory component: -5..+10 from sound/sight/smell term hits */
function componentSensory(text: string | null | undefined): { score: number; signals: Record<string, number> } {
  if (!text?.trim()) return { score: 0, signals: {} };
  let score = 0;
  const signals: Record<string, number> = {};

  const soundHigh = countTermHits(text, ENERGY_SENSORY_TERMS.sound.high);
  const soundLow = countTermHits(text, ENERGY_SENSORY_TERMS.sound.low);
  if (soundHigh > 0) {
    score += Math.min(3, soundHigh * 1.5);
    signals.sound_high = soundHigh;
  }
  if (soundLow > 0) {
    score -= Math.min(2, soundLow);
    signals.sound_low = soundLow;
  }

  const sightHigh = countTermHits(text, ENERGY_SENSORY_TERMS.sight.high);
  const sightLow = countTermHits(text, ENERGY_SENSORY_TERMS.sight.low);
  if (sightHigh > 0) {
    score += Math.min(2, sightHigh);
    signals.sight_high = sightHigh;
  }
  if (sightLow > 0) {
    score -= Math.min(2, sightLow);
    signals.sight_low = sightLow;
  }

  const smellHits = countTermHits(text, ENERGY_SENSORY_TERMS.smell);
  if (smellHits > 0) {
    score += Math.min(3, smellHits * 1.5);
    signals.smell = smellHits;
  }

  score = clamp(score, ENERGY_CAPS.sensory.min, ENERGY_CAPS.sensory.max);
  return { score, signals };
}

/**
 * Compute Energy score (0–100), confidence (0–1), version, and debug breakdown.
 * Missing popular-times: do NOT set popularity=0; reweight remaining components per spec.
 */
export function computeEnergyScore(inputs: EnergyScoreInputs): ScoreResult {
  const text = inputs.coverageAboutText ?? '';

  const popularityRaw =
    inputs.popularityComponent != null && inputs.popularityComponent >= 0
      ? clamp(inputs.popularityComponent, 0, 50)
      : null;

  const lang = componentLanguage(text);
  const flags = componentFlags(inputs);
  const compression = componentCompression(text);
  const sensory = componentSensory(text);

  let score: number;
  let confidence: number;
  const debug: Record<string, unknown> = {
    popularity: popularityRaw,
    language: { score: lang.score, hitsHigh: lang.hitsHigh, hitsLow: lang.hitsLow },
    flags: { score: flags.score, signals: flags.signals },
    compression: { score: compression.score, hits: compression.hits },
    sensory: sensory,
  };

  if (popularityRaw != null) {
    score = clamp(
      popularityRaw + lang.score + flags.score + compression.score + sensory.score,
      0,
      100
    );
    confidence =
      ENERGY_WEIGHTS.popularity * 1 +
      (text ? ENERGY_WEIGHTS.language : 0) +
      (flags.signals.length > 0 ? ENERGY_WEIGHTS.flags : 0) +
      (compression.hits > 0 ? ENERGY_WEIGHTS.compression : 0) +
      (Object.keys(sensory.signals).length > 0 ? ENERGY_WEIGHTS.sensory : 0);
  } else {
    const sumWithoutPopularity = lang.score + flags.score + compression.score + sensory.score;
    score = clamp((sumWithoutPopularity * 100) / ENERGY_REWEIGHT_DIVISOR, 0, 100);
    confidence =
      (text ? ENERGY_WEIGHTS.language : 0) +
      (flags.signals.length > 0 ? ENERGY_WEIGHTS.flags : 0) +
      (compression.hits > 0 ? ENERGY_WEIGHTS.compression : 0) +
      (Object.keys(sensory.signals).length > 0 ? ENERGY_WEIGHTS.sensory : 0);
    debug.reweighted = true;
    debug.sumWithoutPopularity = sumWithoutPopularity;
  }

  debug.score = Math.round(score);
  debug.confidence = Math.round(confidence * 100) / 100;

  return {
    score: Math.round(score),
    confidence: Math.round(confidence * 100) / 100,
    version: VERSION,
    debug,
  };
}
