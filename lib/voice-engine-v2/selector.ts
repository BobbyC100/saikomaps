/**
 * Saiko Voice Engine v2.0 - Auto-Selector
 * Selects best tagline from 4 candidates using Claude Haiku
 */

import Anthropic from '@anthropic-ai/sdk';
import { PlaceContext, PhrasePattern, PatternWeights } from './types';
import {
  TAGLINE_SELECTOR_SYSTEM_PROMPT_V2,
  buildTaglineSelectorUserPromptV2,
} from './prompts';

const anthropic = new Anthropic();

const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 64;

// ============================================
// SELECTION
// ============================================

/**
 * Auto-select best tagline from 4 candidates
 * Uses Claude Haiku to evaluate based on quality criteria + pattern weights
 */
export async function selectBestTaglineV2(
  context: PlaceContext,
  candidates: [string, string, string, string],
  patternWeights: PatternWeights
): Promise<{
  selectedTagline: string;
  selectedIndex: number;
  selectedPattern: PhrasePattern;
}> {
  const userPrompt = buildTaglineSelectorUserPromptV2(context, candidates, patternWeights);
  
  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: TAGLINE_SELECTOR_SYSTEM_PROMPT_V2,
      messages: [
        { role: 'user', content: userPrompt }
      ],
    });
    
    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in Claude response');
    }
    
    const selectedIndex = parseSelectionResponse(textContent.text);
    const patterns: PhrasePattern[] = ['food', 'neighborhood', 'vibe', 'authority'];
    
    return {
      selectedTagline: candidates[selectedIndex],
      selectedIndex,
      selectedPattern: patterns[selectedIndex],
    };
  } catch (error) {
    console.error('[Voice Engine v2.0] Selection error:', error);
    
    // Fallback: Select shortest candidate
    return selectShortestCandidate(candidates);
  }
}

/**
 * Fallback selector: pick shortest candidate
 */
function selectShortestCandidate(
  candidates: [string, string, string, string]
): {
  selectedTagline: string;
  selectedIndex: number;
  selectedPattern: PhrasePattern;
} {
  let shortestIndex = 0;
  let shortestLength = candidates[0].length;
  
  for (let i = 1; i < candidates.length; i++) {
    if (candidates[i].length < shortestLength) {
      shortestLength = candidates[i].length;
      shortestIndex = i;
    }
  }
  
  const patterns: PhrasePattern[] = ['food', 'neighborhood', 'vibe', 'authority'];
  
  console.warn(
    '[Voice Engine v2.0] Selection failed, using shortest candidate (index ' +
      shortestIndex +
      ')'
  );
  
  return {
    selectedTagline: candidates[shortestIndex],
    selectedIndex: shortestIndex,
    selectedPattern: patterns[shortestIndex],
  };
}

/**
 * Parse Claude response into selected index (0-3)
 */
function parseSelectionResponse(text: string): number {
  const trimmed = text.trim();
  
  // Try to extract a number
  const match = trimmed.match(/[0-3]/);
  if (!match) {
    throw new Error(`Could not parse selection index from: "${trimmed}"`);
  }
  
  const index = parseInt(match[0], 10);
  
  if (index < 0 || index > 3) {
    throw new Error(`Invalid selection index: ${index}`);
  }
  
  return index;
}
