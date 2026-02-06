/**
 * Saiko Voice Engine v1.1 - Banned Word Validator
 * Post-generation filter to ensure taglines don't contain banned vocabulary
 */

import { VOCABULARY } from './vocabulary';
import { ValidationResult } from './types';

/**
 * Validate a tagline against the banned words list
 * Returns validation result with list of matched banned words if invalid
 */
export function validateTagline(tagline: string): ValidationResult {
  const lower = tagline.toLowerCase();
  const foundBannedWords: string[] = [];
  
  for (const bannedWord of VOCABULARY.banned) {
    if (lower.includes(bannedWord.toLowerCase())) {
      foundBannedWords.push(bannedWord);
    }
  }
  
  return {
    valid: foundBannedWords.length === 0,
    bannedWords: foundBannedWords.length > 0 ? foundBannedWords : undefined,
  };
}

/**
 * Validate all tagline candidates
 * Returns array of validation results matching input array order
 */
export function validateTaglineCandidates(
  candidates: string[]
): ValidationResult[] {
  return candidates.map((candidate) => validateTagline(candidate));
}

/**
 * Filter tagline candidates to only valid ones
 * Returns array of valid taglines (may be empty)
 */
export function filterValidTaglines(candidates: string[]): string[] {
  return candidates.filter((candidate) => validateTagline(candidate).valid);
}

/**
 * Check if at least one candidate is valid
 */
export function hasValidCandidate(candidates: string[]): boolean {
  return candidates.some((candidate) => validateTagline(candidate).valid);
}
