/**
 * Keyword scoring layer and category decision (fallback when no strong schema).
 */

import {
  SOURCE_WEIGHTS,
  CATEGORY_KEYWORDS,
  SCHEMA_TYPE_TO_SAIKO,
} from "./constants";

const CATEGORIES = Object.keys(CATEGORY_KEYWORDS);

function scoreText(text: string, weight: number): Record<string, number> {
  const scores: Record<string, number> = {};
  const lower = text.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let s = 0;
    for (const kw of keywords) {
      if (lower.includes(kw.toLowerCase())) s += weight;
    }
    if (s > 0) scores[cat] = (scores[cat] ?? 0) + s;
  }
  return scores;
}

export function scoreSources(sources: {
  title: string | null;
  h1: string | null;
  aboutText: string | null;
  metaDescription: string | null;
  bodyText: string;
  anchorTexts: string[];
}): Record<string, number> {
  const total: Record<string, number> = {};
  const add = (scores: Record<string, number>) => {
    for (const [cat, s] of Object.entries(scores)) {
      total[cat] = (total[cat] ?? 0) + s;
    }
  };
  if (sources.title)
    add(scoreText(sources.title, SOURCE_WEIGHTS.title));
  if (sources.h1)
    add(scoreText(sources.h1, SOURCE_WEIGHTS.h1));
  if (sources.aboutText)
    add(scoreText(sources.aboutText, SOURCE_WEIGHTS.about));
  if (sources.metaDescription)
    add(scoreText(sources.metaDescription, SOURCE_WEIGHTS.metaDescription));
  add(scoreText(sources.bodyText, SOURCE_WEIGHTS.body));
  for (const a of sources.anchorTexts) {
    add(scoreText(a, SOURCE_WEIGHTS.anchor));
  }
  return total;
}

/**
 * Tie-breakers: "wine bar" phrase overrides Bar/Restaurant; "espresso" overrides Restaurant → Cafe; "cocktail" breaks Restaurant vs Bar → Bar.
 */
export function applyTieBreakers(
  scores: Record<string, number>,
  combinedText: string
): Record<string, number> {
  const lower = combinedText.toLowerCase();
  const out = { ...scores };

  if (lower.includes("wine bar")) {
    out["Wine Bar"] = (out["Wine Bar"] ?? 0) + 5;
  }
  if (lower.includes("espresso") && (out["Restaurant"] ?? 0) > 0) {
    out["Cafe"] = (out["Cafe"] ?? 0) + 3;
  }
  if (lower.includes("cocktail") && (out["Restaurant"] ?? 0) > 0 && (out["Bar"] ?? 0) > 0) {
    out["Bar"] = (out["Bar"] ?? 0) + 2;
  }

  // Hotel beats Bar/Restaurant when Hotel score is clearly strong
  const hotelScore = out["Hotel"] ?? 0;
  const maxBarRestaurant = Math.max(out["Bar"] ?? 0, out["Restaurant"] ?? 0);
  if (hotelScore >= 6 && hotelScore >= maxBarRestaurant + 2) {
    out["Hotel"] = hotelScore + 5;
  }

  return out;
}

/**
 * Pick highest scoring category. Returns null if no score >= 1 or no clear winner.
 */
export function pickCategoryFromScores(
  scores: Record<string, number>,
  combinedText: string
): string | null {
  const adjusted = applyTieBreakers(scores, combinedText);
  const entries = Object.entries(adjusted).filter(([, s]) => s > 0);
  if (entries.length === 0) return null;
  entries.sort((a, b) => b[1] - a[1]);
  const [topCat, topScore] = entries[0];
  const secondScore = entries[1]?.[1] ?? 0;
  if (topScore < 1) return null;
  if (entries.length === 1) return topCat;
  if (topScore >= 6 && topScore - secondScore >= 2) return topCat;
  if (topScore >= 4 && topScore - secondScore >= 1) return topCat;
  return topCat;
}

export function getScoreGaps(scores: Record<string, number>): {
  top: string | null;
  topScore: number;
  secondScore: number;
  gap: number;
} {
  const entries = Object.entries(scores)
    .filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1]);
  const top = entries[0] ?? null;
  const second = entries[1];
  return {
    top: top ? top[0] : null,
    topScore: top ? top[1] : 0,
    secondScore: second ? second[1] : 0,
    gap: top && second ? top[1] - second[1] : top ? top[1] : 0,
  };
}
