import type { PhrasePattern } from './types';

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'to', 'of', 'in', 'at', 'on', 'for', 'with', 'from',
  'is', 'are', 'it', 'its', 'this', 'that', 'as', 'by',
]);

const DEFAULT_NGRAM_SIZE = 3;
const MAX_INTRA_SET_OVERLAP = 0.62;
const MAX_RECENT_OVERLAP = 0.62;

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(text: string): string[] {
  return normalize(text)
    .split(' ')
    .filter((t) => t && !STOPWORDS.has(t));
}

function openingSignature(text: string, width = 2): string {
  return tokens(text).slice(0, width).join(' ');
}

function ngramSet(text: string, n = DEFAULT_NGRAM_SIZE): Set<string> {
  const t = tokens(text);
  const out = new Set<string>();
  if (t.length < n) {
    if (t.length > 0) out.add(t.join(' '));
    return out;
  }
  for (let i = 0; i <= t.length - n; i++) {
    out.add(t.slice(i, i + n).join(' '));
  }
  return out;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const x of a) {
    if (b.has(x)) intersection++;
  }
  const union = a.size + b.size - intersection;
  if (union <= 0) return 0;
  return intersection / union;
}

export function validateCandidateVariety(candidates: [string, string, string, string]): {
  valid: boolean;
  repeatedOpenings: string[];
  maxOverlap: number;
} {
  const openings = new Map<string, number>();
  const repeatedOpenings = new Set<string>();
  const grams = candidates.map((c) => ngramSet(c));
  let maxOverlap = 0;

  for (const c of candidates) {
    const sig = openingSignature(c);
    if (!sig) continue;
    const count = (openings.get(sig) ?? 0) + 1;
    openings.set(sig, count);
    if (count > 1) repeatedOpenings.add(sig);
  }

  for (let i = 0; i < grams.length; i++) {
    for (let j = i + 1; j < grams.length; j++) {
      maxOverlap = Math.max(maxOverlap, jaccard(grams[i], grams[j]));
    }
  }

  return {
    valid: repeatedOpenings.size === 0 && maxOverlap <= MAX_INTRA_SET_OVERLAP,
    repeatedOpenings: [...repeatedOpenings],
    maxOverlap,
  };
}

export function selectMostDiverseCandidate(
  candidates: [string, string, string, string],
  selectedIndex: number,
  recentTaglines: string[],
  recentPatterns: PhrasePattern[] = [],
): { index: number; pattern: PhrasePattern; changed: boolean } {
  const patterns: PhrasePattern[] = ['food', 'neighborhood', 'energy', 'authority'];
  const recentSets = recentTaglines.slice(-8).map((t) => ngramSet(t));
  const selected = candidates[selectedIndex] ?? candidates[0];
  const selectedSig = openingSignature(selected);
  const selectedSet = ngramSet(selected);

  const selectedRecentOverlap = recentSets.reduce((mx, s) => Math.max(mx, jaccard(selectedSet, s)), 0);
  const selectedOpeningDup = recentTaglines.some((t) => openingSignature(t) === selectedSig);

  if (!selectedOpeningDup && selectedRecentOverlap <= MAX_RECENT_OVERLAP) {
    return { index: selectedIndex, pattern: patterns[selectedIndex], changed: false };
  }

  let bestIndex = selectedIndex;
  let bestScore = Number.POSITIVE_INFINITY;
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    const cSet = ngramSet(c);
    const cSig = openingSignature(c);
    const overlap = recentSets.reduce((mx, s) => Math.max(mx, jaccard(cSet, s)), 0);
    const openingDupPenalty = recentTaglines.some((t) => openingSignature(t) === cSig) ? 0.3 : 0;
    const patternFrequency = recentPatterns.filter((p) => p === patterns[i]).length;
    const patternPenalty = patternFrequency * 0.08;
    const distanceFromPreferred = i === selectedIndex ? 0 : 0.08;
    const score = overlap + openingDupPenalty + patternPenalty + distanceFromPreferred;
    if (score < bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  return { index: bestIndex, pattern: patterns[bestIndex], changed: bestIndex !== selectedIndex };
}
