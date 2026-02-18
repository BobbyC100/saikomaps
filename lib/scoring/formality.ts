/**
 * Formality score (0–100) — pipeline-generated, auditable.
 * Spec: docs/FORMALITY_SCORE_SPEC.md
 */

import {
  FORMALITY_HIGH_TERMS,
  FORMALITY_LOW_TERMS,
  FORMALITY_RESERVATION_TERMS,
  FORMALITY_MATERIAL_TERMS,
  FORMALITY_CAPS,
  FORMALITY_WEIGHTS,
} from './lexicons';
import type { FormalityScoreInputs, ServiceModelValue, PriceTierValue } from './types';
import type { ScoreResult } from './types';

const VERSION = 'formality_v1_locked';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function countTermHits(text: string, terms: string[]): number {
  if (!text || !terms.length) return 0;
  const lower = text.toLowerCase();
  return terms.filter((t) => lower.includes(t)).length;
}

/** Service model: 0–40. counter/fast casual/truck 5–12, bar-first 10–18, full-service 20–30, tasting/omakase 30–40 */
function componentServiceModel(
  service_model: ServiceModelValue | null | undefined,
  text: string | null | undefined
): { score: number; source: string } {
  const lower = (service_model ?? '').toLowerCase().replace(/\s+/g, ' ');
  let score = 0;
  if (lower.includes('tasting') || lower.includes('omakase') || lower.includes('prix fixe') || lower.includes('coursed')) {
    score = 32;
  } else if (lower.includes('a-la-carte') || lower.includes('full-service') || lower.includes('full service')) {
    score = 25;
  } else if (lower.includes('small-plates') || lower.includes('small plates') || lower.includes('family-style')) {
    score = 18;
  } else if (lower.includes('bar') || lower === 'bar-first') {
    score = 14;
  } else if (lower.includes('counter') || lower.includes('fast casual') || lower.includes('truck')) {
    score = 8;
  }

  const modText = (text ?? '').toLowerCase();
  if (/tasting|omakase|prix fixe|coursed/.test(modText)) score = Math.min(40, score + 5);
  if (/order at counter|grab-and-go|walk-up|grab and go/.test(modText)) score = Math.max(0, score - 5);

  score = clamp(score, FORMALITY_CAPS.service_model.min, FORMALITY_CAPS.service_model.max);
  return { score, source: service_model ?? 'inferred' };
}

/** Price tier: $ 5, $$ 12, $$$ 20, $$$$ 25 */
function componentPriceTier(price_tier: PriceTierValue | null | undefined): { score: number; source: string } {
  const t = (price_tier ?? '').toString().trim();
  let score = 0;
  if (t === '$$$$') score = 25;
  else if (t === '$$$') score = 20;
  else if (t === '$$') score = 12;
  else if (t === '$') score = 5;
  score = clamp(score, FORMALITY_CAPS.price_tier.min, FORMALITY_CAPS.price_tier.max);
  return { score, source: t || 'missing' };
}

/** Reservation: reservable +8, "recommended" +5, "required/hard to get/booked out" +10, waitlist/deposit +5, cap 20 */
function componentReservation(
  reservable: boolean | undefined,
  text: string | null | undefined
): { score: number; signals: string[] } {
  let score = 0;
  const signals: string[] = [];
  if (reservable) {
    score += 8;
    signals.push('reservable');
  }
  if (!text?.trim()) return { score: clamp(score, 0, 20), signals };

  const lower = text.toLowerCase();
  if (/reservation required|reservations required|hard to get|booked out/.test(lower)) {
    score += 10;
    signals.push('required');
  } else if (/reservations recommended|reservation recommended/.test(lower)) {
    score += 5;
    signals.push('recommended');
  }
  if (/waitlist|deposit|cancellation policy/.test(lower)) {
    score += 5;
    signals.push('friction');
  }
  score = clamp(score, FORMALITY_CAPS.reservation.min, FORMALITY_CAPS.reservation.max);
  return { score, signals };
}

/** Dress/ritual language: -5..+10 */
function componentLanguage(text: string | null | undefined): { score: number; hitsHigh: number; hitsLow: number } {
  if (!text?.trim()) return { score: 0, hitsHigh: 0, hitsLow: 0 };
  const hitsHigh = countTermHits(text, FORMALITY_HIGH_TERMS);
  const hitsLow = countTermHits(text, FORMALITY_LOW_TERMS);
  const net = hitsHigh - hitsLow;
  const score = clamp(net * 2, FORMALITY_CAPS.language.min, FORMALITY_CAPS.language.max);
  return { score, hitsHigh, hitsLow };
}

/** Materials: linen/tablecloth/crystal +3..+5, paper/plastic 0; cap 5 */
function componentMaterials(text: string | null | undefined): { score: number; signals: string[] } {
  if (!text?.trim()) return { score: 0, signals: [] };
  const lower = text.toLowerCase();
  const signals: string[] = [];
  let score = 0;
  if (/linen|white tablecloth|crystal|fine china|tablecloth/.test(lower)) {
    score = 4;
    signals.push('high');
  }
  if (/paper plates|plastic cups|standing room/.test(lower)) {
    score = Math.max(0, score);
  }
  score = clamp(score, 0, FORMALITY_CAPS.materials.max);
  return { score, signals };
}

/**
 * Compute Formality score (0–100), confidence (0–1), version, and debug breakdown.
 * If service_model or price_tier missing, reweight proportionally and drop confidence.
 */
export function computeFormalityScore(inputs: FormalityScoreInputs): ScoreResult {
  const text = inputs.coverageAboutText ?? '';

  const serviceModel = componentServiceModel(inputs.service_model, text);
  const priceTier = componentPriceTier(inputs.price_tier);
  const reservation = componentReservation(inputs.reservable, text);
  const language = componentLanguage(text);
  const materials = componentMaterials(text);

  const rawSum =
    serviceModel.score +
    priceTier.score +
    reservation.score +
    language.score +
    materials.score;
  const score = clamp(rawSum, 0, 100);

  let confidence = 0;
  if (inputs.service_model != null && String(inputs.service_model).trim() !== '')
    confidence += FORMALITY_WEIGHTS.service_model;
  if (inputs.price_tier != null && String(inputs.price_tier).trim() !== '')
    confidence += FORMALITY_WEIGHTS.price_tier;
  if (reservation.signals.length > 0) confidence += FORMALITY_WEIGHTS.reservation;
  if (text) confidence += FORMALITY_WEIGHTS.language;
  if (materials.signals.length > 0) confidence += FORMALITY_WEIGHTS.materials;

  const debug: Record<string, unknown> = {
    service_model: serviceModel,
    price_tier: priceTier,
    reservation,
    language: { score: language.score, hitsHigh: language.hitsHigh, hitsLow: language.hitsLow },
    materials,
    rawSum,
    score: Math.round(score),
    confidence: Math.round(confidence * 100) / 100,
  };

  return {
    score: Math.round(score),
    confidence: Math.round(confidence * 100) / 100,
    version: VERSION,
    debug,
  };
}
