/**
 * Tag Scoring Engine v1 — Weighted 0–1 per tag
 * CTO Spec §5: deterministic, versioned, no binary storage
 * Tags: cozy, date_night, late_night, after_work, scene
 */

import { ENERGY_LOW_TERMS } from '@/lib/scoring/lexicons';
import type { TagScoreInputs, TagScoresResult } from './types';

const TAG_VERSION = 'tags_v1';
const ENERGY_VERSION = 'energy_v1';

// Lexicons for tag-specific signals (deterministic, no external API)
const COZY_TERMS = [
  ...ENERGY_LOW_TERMS,
  'intimate', 'warm', 'romantic', 'cozy', 'nook', 'fireplace',
  'candlelit', 'soft', 'low-key', 'quiet', 'hushed',
];
const DATE_NIGHT_TERMS = [
  'romantic', 'intimate', 'date night', 'special occasion', 'anniversary',
  'candlelit', 'dim', 'quiet', 'cozy', 'white tablecloth', 'elegant',
];
const LATE_NIGHT_TERMS = [
  'late night', 'late-night', 'open late', 'after midnight', 'last call',
  'dj', 'live music', 'nightlife', 'bar', 'cocktails', 'scene',
];
const AFTER_WORK_TERMS = [
  'happy hour', 'after work', 'work crowd', 'casual', 'bar', 'drinks',
  'patio', 'outdoor', 'lively', 'bustling', 'good for groups',
];
const SCENE_TERMS = [
  'scene', 'see and be seen', 'trendy', 'hot spot', 'party', 'loud',
  'dj', 'live music', 'packed', 'bustling', 'electric', 'vibrant',
];

function countTermHits(text: string, terms: string[]): number {
  if (!text || !terms.length) return 0;
  const lower = text.toLowerCase();
  return terms.filter((t) => lower.includes(t)).length;
}

/** Map energy 0–100 to a 0–1 influence (low energy → cozy, high → scene) */
function energyToCozy(energy: number): number {
  return 1 - energy / 100;
}
function energyToScene(energy: number): number {
  return energy / 100;
}

/**
 * Compute all tag scores (0–1). Deterministic, no external API calls.
 */
export function computeTagScores(inputs: TagScoreInputs): TagScoresResult {
  const text = inputs.coverageAboutText ?? '';
  const energy = inputs.energy_score;
  const conf = inputs.energy_confidence;

  // Cozy: inverse of energy + cozy language
  const cozyLang = countTermHits(text, COZY_TERMS);
  const cozyBase = energyToCozy(energy);
  const cozyBoost = Math.min(0.3, cozyLang * 0.05);
  const cozy_score = Math.min(1, Math.max(0, cozyBase * 0.7 + cozyBoost + (cozyLang > 0 ? 0.1 : 0)));

  // Date night: romantic/intimate signals + moderate energy
  const dateLang = countTermHits(text, DATE_NIGHT_TERMS);
  const dateBase = energy >= 20 && energy <= 70 ? 0.5 + (40 - Math.abs(energy - 45)) / 80 : 0.3;
  const dateBoost = Math.min(0.4, dateLang * 0.08);
  const date_night_score = Math.min(1, Math.max(0, dateBase * 0.6 + dateBoost));

  // Late night: late-night language + high energy OR explicit late_night signals
  const lateLang = countTermHits(text, LATE_NIGHT_TERMS);
  const lateEnergy = inputs.lateNightEnergyScore ?? energy;
  const lateBase = lateEnergy / 100;
  const lateBoost = Math.min(0.5, lateLang * 0.1);
  const late_night_score = Math.min(1, Math.max(0, lateBase * 0.6 + lateBoost));

  // After work: happy hour / work crowd + medium-high energy
  const workLang = countTermHits(text, AFTER_WORK_TERMS);
  const workBase = energy >= 40 && energy <= 80 ? 0.6 : 0.2;
  const workBoost = Math.min(0.4, workLang * 0.1);
  const after_work_score = Math.min(1, Math.max(0, workBase * 0.6 + workBoost));

  // Scene: high energy + scene language
  const sceneLang = countTermHits(text, SCENE_TERMS);
  const sceneBase = energyToScene(energy);
  const sceneBoost = Math.min(0.4, sceneLang * 0.08);
  const scene_score = Math.min(1, Math.max(0, sceneBase * 0.7 + sceneBoost));

  const confidence = conf;

  return {
    cozy_score: Math.round(cozy_score * 100) / 100,
    date_night_score: Math.round(date_night_score * 100) / 100,
    late_night_score: Math.round(late_night_score * 100) / 100,
    after_work_score: Math.round(after_work_score * 100) / 100,
    scene_score: Math.round(scene_score * 100) / 100,
    confidence,
    version: TAG_VERSION,
    depends_on_energy_version: ENERGY_VERSION,
  };
}
