/**
 * Confidence calculation (SAIKO spec §6).
 */

import { getScoreGaps } from "./keywords";

export function computeConfidence(params: {
  hasStrongSchema: boolean;
  keywordScores: Record<string, number>;
  combinedText: string;
  hasReservation: boolean;
  hasMenu: boolean;
}): number {
  const { hasStrongSchema, keywordScores, combinedText, hasReservation, hasMenu } = params;

  if (hasStrongSchema) return 0.9;

  const { top, topScore, secondScore, gap } = getScoreGaps(keywordScores);
  if (top && topScore >= 6 && gap >= 2) return 0.8;
  if (top && topScore >= 4 && gap >= 1) return 0.65;
  if (hasReservation && hasMenu && topScore < 4) return 0.55;
  return 0.4;
}
