/**
 * Saiko Voice Engine v1.1 - Vocabulary System
 * Curated word pools for controlled tagline generation
 */

import { VocabularyPools } from './types';

export const VOCABULARY: VocabularyPools = {
  // PRAISE WORDS: Confident, not cheerful
  praise: [
    'primo',
    'solid',
    'choice',
    'the real deal',
    'top-shelf',
    'good',
    'right',
  ],

  // PLACE WORDS: Where you call the restaurant
  place: [
    'spot',
    'joint',
    'place',
    'corner',
    'room',
    'counter',
    'patio',
  ],

  // ACTION WORDS: How you get there / what you do
  action: [
    'pull up to',
    'settle in at',
    'posted up at',
    'duck into',
    'line up at',
    'roll through',
  ],

  // DEADPAN CLOSERS: The signature v1.1 endings
  deadpanClosers: [
    'Ask around.',
    "You'll figure out why.",
    "That's the point.",
    'No complaints.',
    "Doesn't need to.",
    "Everything's fine.",
    "That's the whole pitch.",
    'Good luck finding it.',
    'So should you.',
  ],

  // BANNED WORDS: Never use these
  banned: [
    'hidden gem',
    'must-try',
    'elevated',
    'curated',
    'artisanal',
    'mouthwatering',
    'to die for',
    'delicious',
    'amazing',
    'incredible',
    'unique',
    'authentic',
    'foodie',
    'farm-to-table',
    'crafted',
    'perfect for',
    "you'll love",
    "don't miss",
    'a must',
    'treat yourself',
    'you deserve',
    'so good',
    'wonderful',
    'fantastic',
    'swell',
    'bro',
    'dude',
    'gnarly',
    'epic',
    'vibes',
    'lowkey',
    'highkey',
    'slaps',
    'bussin',
    'fire',
    'no cap',
    'hits different',
    "chef's kiss",
  ],
};

/**
 * Food & Drink Vocabulary Helpers
 */
export const FOOD_DRINK_REFERENCES = {
  beer: ['cold ones', 'a proper pour'],
  wine: ['the good stuff', 'a proper pour'],
  cocktails: ['the good stuff', 'a proper pour', 'top-shelf pours'],
  breakfast: ['morning fix', 'breakfast done right'],
  brunch: ['morning fix', 'brunch worth the wait'],
  lunch: ['a long lunch', 'midday done right'],
  dinner: ['the evening spot', 'dinner worth it'],
};

/**
 * Neighborhood Phrase Patterns
 */
export const NEIGHBORHOOD_PATTERNS = {
  prideOf: (neighborhood: string) => `the pride of ${neighborhood}`,
  finest: (neighborhood: string) => `${neighborhood}'s finest`,
  tuckedInto: (neighborhood: string) => `tucked into ${neighborhood}`,
  holdingDown: (neighborhood: string) => `holding it down in ${neighborhood}`,
  staple: (neighborhood: string) => `a ${neighborhood} staple`,
  whereGoesFor: (neighborhood: string, category: string) =>
    `where ${neighborhood} goes for ${category}`,
  heartOf: (neighborhood: string) => `the heart of ${neighborhood}`,
  onStreet: (street: string) => `right on ${street}`,
};
