/**
 * Saiko Voice Engine v1.1 - Auto-Selector
 * Lightweight AI call to pick the best tagline from 4 candidates
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  TAGLINE_SELECTOR_SYSTEM_PROMPT,
  buildTaglineSelectorUserPrompt,
} from './prompts';
import { MerchantSignals, PhrasePattern } from './types';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Use Claude Haiku for fast, cheap selection
const HAIKU_MODEL = 'claude-3-5-haiku-20250205';

// Map candidate index to phrase pattern
const PATTERN_MAP: Record<number, PhrasePattern> = {
  0: 'food',
  1: 'neighborhood',
  2: 'vibe',
  3: 'authority',
};

export interface SelectBestTaglineResult {
  selectedIndex: number;
  selectedTagline: string;
  selectedPattern: PhrasePattern;
}

/**
 * Parse AI response to extract selected index
 */
function parseSelectionResponse(text: string): number {
  const cleaned = text.trim();
  
  // Try to extract a number (0, 1, 2, or 3)
  const match = cleaned.match(/[0-3]/);
  if (!match) {
    throw new Error('Response must contain a single digit 0-3');
  }
  
  const index = parseInt(match[0], 10);
  if (index < 0 || index > 3) {
    throw new Error('Index must be between 0 and 3');
  }
  
  return index;
}

/**
 * Select the best tagline from 4 candidates using Claude Haiku
 */
export async function selectBestTagline(
  signals: MerchantSignals,
  candidates: [string, string, string, string]
): Promise<SelectBestTaglineResult> {
  const userPrompt = buildTaglineSelectorUserPrompt(signals, candidates);
  
  const message = await client.messages.create({
    model: HAIKU_MODEL,
    max_tokens: 64,
    system: TAGLINE_SELECTOR_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });
  
  const block = message.content[0];
  const text = block.type === 'text' ? block.text : '';
  
  try {
    const selectedIndex = parseSelectionResponse(text);
    const selectedTagline = candidates[selectedIndex];
    const selectedPattern = PATTERN_MAP[selectedIndex];
    
    return {
      selectedIndex,
      selectedTagline,
      selectedPattern,
    };
  } catch (err) {
    console.error('Failed to parse selection response:', err);
    console.error('Raw AI response:', text);
    
    // Fallback: select the shortest tagline
    console.log('[Voice Engine] Falling back to shortest tagline selection');
    const selectedIndex = candidates.reduce(
      (shortestIdx, candidate, idx) =>
        candidate.length < candidates[shortestIdx].length ? idx : shortestIdx,
      0
    );
    
    return {
      selectedIndex,
      selectedTagline: candidates[selectedIndex],
      selectedPattern: PATTERN_MAP[selectedIndex],
    };
  }
}
