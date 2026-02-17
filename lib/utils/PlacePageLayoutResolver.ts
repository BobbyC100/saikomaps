/**
 * Place Page Layout Resolver
 * 
 * Pure logic for resolving bento grid card layout with Quiet fills.
 * Based on: saiko-cursor-implementation-spec.md
 * 
 * Core Constraints:
 * - Grid has 6 columns
 * - Span-1 = Quiet cards ONLY
 * - Max 4 Quiet units per page
 * - Max 2 Quiet units per row
 * - Row 2 cannot have Quiet (editorial priority)
 * - All rows must sum to 6 columns (no holes)
 */

// ============================================================================
// TYPES
// ============================================================================

export type CardType = 
  | 'hours'
  | 'details'
  | 'coverage'
  | 'curator'
  | 'gallery'
  | 'tips'
  | 'menu'
  | 'wine'
  | 'vibe'
  | 'alsoOn'
  | 'quiet';

export interface CardConfig {
  type: CardType;
  span: number;
  variant?: 'standard' | 'compact' | 'wide' | 'fixed';
  data?: any;
}

export interface RowConfig {
  rowNumber: number;
  cards: CardConfig[];
}

export interface PlaceData {
  // Tier A - Always present
  hours: any;
  details: any;
  
  // Tier B - Editorial
  coverage?: {
    quote: string;
    source: string;
    author?: string;
    url?: string;
  } | null;
  curator?: {
    note: string;
  } | null;
  gallery?: string[] | null; // Photo URLs
  
  // Tier C - Utility
  tips?: string[] | null;
  menu?: MenuItem[] | null;
  wine?: WineProgram | null;
  vibe?: string[] | null; // Tags
  
  // Tier D - Discovery
  alsoOn?: AlsoOnMap[] | null;
}

export interface MenuItem {
  name: string;
  price?: string;
  description?: string;
}

export interface WineProgram {
  focus?: string;
  regions?: string[];
  priceRange?: string;
  description?: string;
}

export interface AlsoOnMap {
  id: string;
  title: string;
  slug: string;
  coverImageUrl?: string | null;
  creatorName?: string;
  description?: string | null;
  placeCount?: number;
  authorType?: 'saiko' | 'user';
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CONSTRAINTS = {
  GRID_COLUMNS: 6,
  MAX_SPAN_PER_CARD: 4,
  DISALLOW_SPAN_6: true,
  SPAN_1_QUIET_ONLY: true,
  MAX_QUIET_PER_PAGE: 4,
  MAX_QUIET_PER_ROW: 2,
  ROW_2_NO_QUIET: true,
  QUIET_UNIT_SIZE: 1,
} as const;

// Allowed spans per card type (span 6 disallowed for all non-quiet)
const ALLOWED_SPANS_BY_TYPE: Record<CardType, number[]> = {
  hours: [2],
  details: [4],
  coverage: [4, 3, 2], // Never 6
  curator: [3, 2],
  gallery: [3],
  tips: [3, 2],
  menu: [3, 2],
  wine: [3, 2],
  vibe: [3, 2],
  alsoOn: [3], // Will be split into 3+3 layout
  quiet: [1, 2, 3],
} as const;

const THRESHOLDS = {
  COVERAGE_SHORT: 120, // chars
  CURATOR_SHORT: 80,   // chars
  TIPS_MAX_BULLETS: 4,
  VIBE_COMPACT: 3,     // tags
  VIBE_STANDARD: 6,    // tags
} as const;

// ============================================================================
// VARIANT SELECTORS
// ============================================================================

function getCoverageVariant(quote: string): { variant: 'standard' | 'compact'; span: number } {
  // MAX SPAN = 4: Coverage can be 4, 3, or 2 (never 6)
  return quote.length >= THRESHOLDS.COVERAGE_SHORT
    ? { variant: 'standard', span: 4 }
    : { variant: 'compact', span: 3 };
}

function getCuratorVariant(note: string): { variant: 'standard' | 'compact'; span: number } {
  return note.length >= THRESHOLDS.CURATOR_SHORT
    ? { variant: 'standard', span: 3 }
    : { variant: 'compact', span: 2 };
}

function getVibeVariant(tagCount: number): { variant: 'compact' | 'standard' | 'wide'; span: number } {
  if (tagCount <= THRESHOLDS.VIBE_COMPACT) {
    return { variant: 'compact', span: 2 };
  }
  // MAX SPAN = 3 for vibe (never 6)
  return { variant: 'standard', span: 3 };
}

function getTipsVariant(): { variant: 'fixed'; span: number } {
  // Tips can be 3 or 2
  return { variant: 'fixed', span: 3 };
}

// ============================================================================
// NORMALIZATION HELPERS
// ============================================================================

/**
 * Clamps card span to allowed values for that type
 */
function normalizeCardSpan(card: CardConfig): CardConfig {
  const allowedSpans = ALLOWED_SPANS_BY_TYPE[card.type];
  if (!allowedSpans || allowedSpans.includes(card.span)) {
    return card; // Already valid
  }
  
  // Find nearest smaller allowed span
  const validSpan = allowedSpans
    .filter(s => s <= card.span)
    .sort((a, b) => b - a)[0] || allowedSpans[allowedSpans.length - 1];
  
  return { ...card, span: validSpan };
}

/**
 * Fills remaining columns in a row with Quiet cards
 * Respects max quiet per row (2) and quiet caps
 */
function fillRowWithQuiet(
  cards: CardConfig[],
  quietBudget: number
): CardConfig[] {
  const currentSpan = cards.reduce((sum, c) => sum + c.span, 0);
  const remaining = CONSTRAINTS.GRID_COLUMNS - currentSpan;
  
  if (remaining === 0) return cards;
  if (remaining < 0) {
    console.error('Row exceeds 6 columns:', cards);
    return cards;
  }
  
  const result = [...cards];
  let remainingCols = remaining;
  const quietCardsInRow = cards.filter(c => c.type === 'quiet').length;
  let quietAdded = 0;
  
  // Can only add up to 2 quiet cards per row
  const maxQuietToAdd = Math.min(
    CONSTRAINTS.MAX_QUIET_PER_ROW - quietCardsInRow,
    quietBudget
  );
  
  while (remainingCols > 0 && quietAdded < maxQuietToAdd) {
    const quietSpan = Math.min(remainingCols, 3) as 1 | 2 | 3;
    result.push({ type: 'quiet', span: quietSpan });
    remainingCols -= quietSpan;
    quietAdded++;
  }
  
  return result;
}

// ============================================================================
// ROW RESOLVERS
// ============================================================================

/**
 * Row 1: LOCKED
 * Always Hours(2) + Details(4)
 */
function resolveRow1(data: PlaceData): RowConfig {
  return {
    rowNumber: 1,
    cards: [
      { type: 'hours', span: 2, data: data.hours },
      { type: 'details', span: 4, data: data.details }
    ]
  };
}

/**
 * Row 2: Editorial Priority (NO QUIET ALLOWED)
 * Coverage must never be span 6. Preferred patterns:
 * - Coverage(4) + Curator(2)
 * - Coverage(3) + Gallery(3)
 * - Coverage(4) + Tips(2)
 * - Coverage(3) + Tips(3)
 */
function resolveRow2(data: PlaceData): RowConfig | null {
  if (!data.coverage) return null;
  
  const coverageVariant = getCoverageVariant(data.coverage.quote);
  
  // Strategy 1: Coverage(4) + Curator(2)
  if (coverageVariant.span === 4 && data.curator) {
    const curatorVariant = getCuratorVariant(data.curator.note);
    if (curatorVariant.span === 2) {
      return {
        rowNumber: 2,
        cards: [
          { type: 'coverage', span: 4, variant: 'standard', data: data.coverage },
          { type: 'curator', span: 2, variant: 'compact', data: data.curator }
        ]
      };
    }
  }
  
  // Strategy 2: Coverage(3) + Curator(3)
  if (data.curator) {
    const curatorVariant = getCuratorVariant(data.curator.note);
    if (curatorVariant.span === 3) {
      return {
        rowNumber: 2,
        cards: [
          { type: 'coverage', span: 3, variant: 'compact', data: data.coverage },
          { type: 'curator', span: 3, variant: 'standard', data: data.curator }
        ]
      };
    }
  }
  
  // Strategy 3: Coverage(3) + Gallery(3)
  if (data.gallery && data.gallery.length > 0) {
    return {
      rowNumber: 2,
      cards: [
        { type: 'coverage', span: 3, variant: 'compact', data: data.coverage },
        { type: 'gallery', span: 3, data: data.gallery }
      ]
    };
  }
  
  // Strategy 4: Coverage(4) + Tips(2)
  if (coverageVariant.span === 4 && data.tips && data.tips.length > 0) {
    return {
      rowNumber: 2,
      cards: [
        { type: 'coverage', span: 4, variant: 'standard', data: data.coverage },
        { type: 'tips', span: 2, variant: 'fixed', data: data.tips }
      ]
    };
  }
  
  // Strategy 5: Coverage(3) + Tips(3)
  if (data.tips && data.tips.length > 0) {
    return {
      rowNumber: 2,
      cards: [
        { type: 'coverage', span: 3, variant: 'compact', data: data.coverage },
        { type: 'tips', span: 3, variant: 'fixed', data: data.tips }
      ]
    };
  }
  
  // Strategy 6: Coverage(3) + Vibe(3)
  if (data.vibe && data.vibe.length > 0) {
    const vibeVariant = getVibeVariant(data.vibe.length);
    return {
      rowNumber: 2,
      cards: [
        { type: 'coverage', span: 3, variant: 'compact', data: data.coverage },
        { type: 'vibe', span: 3, variant: vibeVariant.variant, data: data.vibe }
      ]
    };
  }
  
  // Strategy 7: Coverage(4) + Menu(2) or Wine(2)
  if (coverageVariant.span === 4) {
    if (data.menu && data.menu.length > 0) {
      return {
        rowNumber: 2,
        cards: [
          { type: 'coverage', span: 4, variant: 'standard', data: data.coverage },
          { type: 'menu', span: 2, data: data.menu }
        ]
      };
    }
    if (data.wine) {
      return {
        rowNumber: 2,
        cards: [
          { type: 'coverage', span: 4, variant: 'standard', data: data.coverage },
          { type: 'wine', span: 2, data: data.wine }
        ]
      };
    }
  }
  
  // Last resort: Coverage(3) + Menu(3) or Wine(3)
  if (data.menu && data.menu.length > 0) {
    return {
      rowNumber: 2,
      cards: [
        { type: 'coverage', span: 3, variant: 'compact', data: data.coverage },
        { type: 'menu', span: 3, data: data.menu }
      ]
    };
  }
  
  if (data.wine) {
    return {
      rowNumber: 2,
      cards: [
        { type: 'coverage', span: 3, variant: 'compact', data: data.coverage },
        { type: 'wine', span: 3, data: data.wine }
      ]
    };
  }
  
  // Absolute fallback: Coverage(2) + Coverage(2) + Coverage(2) (split quote)
  // This should never happen with real data but ensures no span-6
  return {
    rowNumber: 2,
    cards: [
      { type: 'coverage', span: 2, variant: 'compact', data: data.coverage },
      { type: 'coverage', span: 2, variant: 'compact', data: data.coverage },
      { type: 'coverage', span: 2, variant: 'compact', data: data.coverage }
    ]
  };
}

/**
 * Row 3: Gallery + Curator
 * Never use span 6. Patterns:
 * - Gallery(3) + Curator(3)
 * - Gallery(3) + Tips(3)
 * - Gallery(3) + Vibe(3)
 * - Gallery(3) + Quiet(3) or Quiet(2)+Quiet(1)
 * - Curator(3) + Tips(3)
 * - Curator(3) + Quiet(3)
 */
function resolveRow3(
  data: PlaceData,
  curatorAlreadyUsed: boolean,
  quietCount: number
): RowConfig | null {
  const hasGallery = data.gallery && data.gallery.length > 0;
  const hasCurator = data.curator && !curatorAlreadyUsed;
  
  // Pattern 1: Gallery(3) + Curator(3)
  if (hasGallery && hasCurator) {
    return {
      rowNumber: 3,
      cards: [
        { type: 'gallery', span: 3, data: data.gallery },
        { type: 'curator', span: 3, variant: 'standard', data: data.curator }
      ]
    };
  }
  
  // Pattern 2: Gallery(3) + Tips(3)
  if (hasGallery && data.tips && data.tips.length > 0) {
    return {
      rowNumber: 3,
      cards: [
        { type: 'gallery', span: 3, data: data.gallery },
        { type: 'tips', span: 3, variant: 'fixed', data: data.tips }
      ]
    };
  }
  
  // Pattern 3: Gallery(3) + Vibe(3)
  if (hasGallery && data.vibe && data.vibe.length > 0) {
    const vibeVariant = getVibeVariant(data.vibe.length);
    return {
      rowNumber: 3,
      cards: [
        { type: 'gallery', span: 3, data: data.gallery },
        { type: 'vibe', span: 3, variant: vibeVariant.variant, data: data.vibe }
      ]
    };
  }
  
  // Pattern 4: Gallery(3) + Menu(3) or Wine(3)
  if (hasGallery) {
    if (data.menu && data.menu.length > 0) {
      return {
        rowNumber: 3,
        cards: [
          { type: 'gallery', span: 3, data: data.gallery },
          { type: 'menu', span: 3, data: data.menu }
        ]
      };
    }
    if (data.wine) {
      return {
        rowNumber: 3,
        cards: [
          { type: 'gallery', span: 3, data: data.gallery },
          { type: 'wine', span: 3, data: data.wine }
        ]
      };
    }
  }
  
  // Pattern 5: Gallery(3) + Quiet fills
  if (hasGallery && quietCount + 2 <= CONSTRAINTS.MAX_QUIET_PER_PAGE) {
    return {
      rowNumber: 3,
      cards: [
        { type: 'gallery', span: 3, data: data.gallery },
        { type: 'quiet', span: 2 },
        { type: 'quiet', span: 1 }
      ]
    };
  }
  
  // Pattern 6: Curator(3) + Tips(3)
  if (hasCurator && data.tips && data.tips.length > 0) {
    const curatorVariant = getCuratorVariant(data.curator!.note);
    if (curatorVariant.span === 3) {
      return {
        rowNumber: 3,
        cards: [
          { type: 'curator', span: 3, variant: 'standard', data: data.curator },
          { type: 'tips', span: 3, variant: 'fixed', data: data.tips }
        ]
      };
    }
  }
  
  // Pattern 7: Curator(3) + Vibe(3)
  if (hasCurator && data.vibe && data.vibe.length > 0) {
    const curatorVariant = getCuratorVariant(data.curator!.note);
    if (curatorVariant.span === 3) {
      const vibeVariant = getVibeVariant(data.vibe.length);
      return {
        rowNumber: 3,
        cards: [
          { type: 'curator', span: 3, variant: 'standard', data: data.curator },
          { type: 'vibe', span: 3, variant: vibeVariant.variant, data: data.vibe }
        ]
      };
    }
  }
  
  // Pattern 8: Curator(3) + Quiet fills
  if (hasCurator && quietCount + 2 <= CONSTRAINTS.MAX_QUIET_PER_PAGE) {
    const curatorVariant = getCuratorVariant(data.curator!.note);
    if (curatorVariant.span === 3) {
      return {
        rowNumber: 3,
        cards: [
          { type: 'curator', span: 3, variant: 'standard', data: data.curator },
          { type: 'quiet', span: 2 },
          { type: 'quiet', span: 1 }
        ]
      };
    }
  }
  
  // Pattern 9: Curator(2) + other 2-span cards
  if (hasCurator) {
    const curatorVariant = getCuratorVariant(data.curator!.note);
    if (curatorVariant.span === 2) {
      // Curator(2) + Tips(2) + Vibe(2)
      if (data.tips && data.tips.length > 0 && data.vibe && data.vibe.length > 0) {
        const vibeVariant = getVibeVariant(data.vibe.length);
        if (vibeVariant.span === 2) {
          return {
            rowNumber: 3,
            cards: [
              { type: 'curator', span: 2, variant: 'compact', data: data.curator },
              { type: 'tips', span: 2, variant: 'fixed', data: data.tips },
              { type: 'vibe', span: 2, variant: 'compact', data: data.vibe }
            ]
          };
        }
      }
    }
  }
  
  return null;
}

/**
 * Row 4: Utility (Tips + Menu + Vibe)
 * Never use span 6. Patterns:
 * - Tips(3) + Menu(3)
 * - Tips(3) + Vibe(3)
 * - Tips(2) + Menu(2) + Vibe(2)
 * - Menu(3) + Vibe(3)
 */
function resolveRow4(
  data: PlaceData,
  quietCount: number,
  vibeAlreadyUsed: boolean,
  tipsAlreadyUsed: boolean
): RowConfig | null {
  const hasTips = data.tips && data.tips.length > 0 && !tipsAlreadyUsed;
  const hasMenu = data.menu && data.menu.length > 0;
  const hasVibe = data.vibe && data.vibe.length > 0 && !vibeAlreadyUsed;
  
  // Pattern 1: Tips(3) + Menu(3)
  if (hasTips && hasMenu) {
    return {
      rowNumber: 4,
      cards: [
        { type: 'tips', span: 3, variant: 'fixed', data: data.tips },
        { type: 'menu', span: 3, data: data.menu }
      ]
    };
  }
  
  // Pattern 2: Tips(3) + Vibe(3)
  if (hasTips && hasVibe) {
    const vibeVariant = getVibeVariant(data.vibe!.length);
    return {
      rowNumber: 4,
      cards: [
        { type: 'tips', span: 3, variant: 'fixed', data: data.tips },
        { type: 'vibe', span: 3, variant: vibeVariant.variant, data: data.vibe }
      ]
    };
  }
  
  // Pattern 3: Tips(3) + Wine(3)
  if (hasTips && data.wine) {
    return {
      rowNumber: 4,
      cards: [
        { type: 'tips', span: 3, variant: 'fixed', data: data.tips },
        { type: 'wine', span: 3, data: data.wine }
      ]
    };
  }
  
  // Pattern 4: Menu(3) + Vibe(3)
  if (hasMenu && hasVibe) {
    const vibeVariant = getVibeVariant(data.vibe!.length);
    return {
      rowNumber: 4,
      cards: [
        { type: 'menu', span: 3, data: data.menu },
        { type: 'vibe', span: 3, variant: vibeVariant.variant, data: data.vibe }
      ]
    };
  }
  
  // Pattern 5: Menu(3) + Wine(3)
  if (hasMenu && data.wine) {
    return {
      rowNumber: 4,
      cards: [
        { type: 'menu', span: 3, data: data.menu },
        { type: 'wine', span: 3, data: data.wine }
      ]
    };
  }
  
  // Pattern 6: Tips(3) + Quiet fills
  if (hasTips && quietCount + 2 <= CONSTRAINTS.MAX_QUIET_PER_PAGE) {
    return {
      rowNumber: 4,
      cards: [
        { type: 'tips', span: 3, variant: 'fixed', data: data.tips },
        { type: 'quiet', span: 2 },
        { type: 'quiet', span: 1 }
      ]
    };
  }
  
  // Pattern 7: Menu(3) + Quiet fills
  if (hasMenu && quietCount + 2 <= CONSTRAINTS.MAX_QUIET_PER_PAGE) {
    return {
      rowNumber: 4,
      cards: [
        { type: 'menu', span: 3, data: data.menu },
        { type: 'quiet', span: 2 },
        { type: 'quiet', span: 1 }
      ]
    };
  }
  
  return null;
}

/**
 * Row 5: Vibe (If Not Already Used)
 * Never use span 6. Patterns:
 * - Vibe(3) + Wine(3)
 * - Vibe(3) + Menu(3)
 * - Vibe(3) + Quiet fills
 * - Vibe(2) + other 2-span cards
 */
function resolveRow5(
  data: PlaceData,
  vibeAlreadyUsed: boolean,
  wineAlreadyUsed: boolean,
  quietCount: number
): RowConfig | null {
  if (!data.vibe || vibeAlreadyUsed) return null;
  
  const vibeVariant = getVibeVariant(data.vibe.length);
  
  // Pattern 1: Vibe(3) + Wine(3)
  if (vibeVariant.span === 3 && data.wine && !wineAlreadyUsed) {
    return {
      rowNumber: 5,
      cards: [
        { type: 'vibe', span: 3, variant: vibeVariant.variant, data: data.vibe },
        { type: 'wine', span: 3, data: data.wine }
      ]
    };
  }
  
  // Pattern 2: Vibe(3) + Menu(3)
  if (vibeVariant.span === 3 && data.menu && data.menu.length > 0) {
    return {
      rowNumber: 5,
      cards: [
        { type: 'vibe', span: 3, variant: vibeVariant.variant, data: data.vibe },
        { type: 'menu', span: 3, data: data.menu }
      ]
    };
  }
  
  // Pattern 3: Vibe(3) + Quiet fills
  if (vibeVariant.span === 3 && quietCount + 2 <= CONSTRAINTS.MAX_QUIET_PER_PAGE) {
    return {
      rowNumber: 5,
      cards: [
        { type: 'vibe', span: 3, variant: vibeVariant.variant, data: data.vibe },
        { type: 'quiet', span: 2 },
        { type: 'quiet', span: 1 }
      ]
    };
  }
  
  // Pattern 4: Vibe(2) + Wine(2) + Menu(2)
  if (vibeVariant.span === 2) {
    if (data.wine && !wineAlreadyUsed && data.menu && data.menu.length > 0) {
      return {
        rowNumber: 5,
        cards: [
          { type: 'vibe', span: 2, variant: vibeVariant.variant, data: data.vibe },
          { type: 'wine', span: 2, data: data.wine },
          { type: 'menu', span: 2, data: data.menu }
        ]
      };
    }
  }
  
  // Pattern 5: Vibe(2) + Wine(2) + Quiet(2)
  if (vibeVariant.span === 2 && data.wine && !wineAlreadyUsed && quietCount + 2 <= CONSTRAINTS.MAX_QUIET_PER_PAGE) {
    return {
      rowNumber: 5,
      cards: [
        { type: 'vibe', span: 2, variant: vibeVariant.variant, data: data.vibe },
        { type: 'wine', span: 2, data: data.wine },
        { type: 'quiet', span: 2 }
      ]
    };
  }
  
  return null;
}

/**
 * Row 6: Wine (If Not Already Used)
 * Never use span 6. Patterns:
 * - Wine(3) + Menu(3)
 * - Wine(3) + Quiet fills
 */
function resolveRow6(
  data: PlaceData,
  wineAlreadyUsed: boolean,
  quietCount: number
): RowConfig | null {
  if (!data.wine || wineAlreadyUsed) return null;
  
  // Pattern 1: Wine(3) + Menu(3)
  if (data.menu && data.menu.length > 0) {
    return {
      rowNumber: 6,
      cards: [
        { type: 'wine', span: 3, data: data.wine },
        { type: 'menu', span: 3, data: data.menu }
      ]
    };
  }
  
  // Pattern 2: Wine(3) + Quiet fills
  if (quietCount + 2 <= CONSTRAINTS.MAX_QUIET_PER_PAGE) {
    return {
      rowNumber: 6,
      cards: [
        { type: 'wine', span: 3, data: data.wine },
        { type: 'quiet', span: 2 },
        { type: 'quiet', span: 1 }
      ]
    };
  }
  
  return null;
}

/**
 * Row 7: Also On
 * Never span 6 - split into two 3-column cards
 */
function resolveRow7(data: PlaceData): RowConfig | null {
  if (!data.alsoOn || data.alsoOn.length === 0) return null;
  
  // Split Also On into 3 + 3 layout (two columns)
  return {
    rowNumber: 7,
    cards: [
      { type: 'alsoOn', span: 3, data: data.alsoOn },
      { type: 'alsoOn', span: 3, data: data.alsoOn }
    ]
  };
}

// ============================================================================
// MAIN RESOLVER
// ============================================================================

/**
 * Resolves the complete place page layout
 * Returns an ordered array of row configurations
 */
export function resolvePlacePageLayout(data: PlaceData): RowConfig[] {
  const rows: RowConfig[] = [];
  let quietCount = 0;
  let curatorUsed = false;
  let vibeUsed = false;
  let wineUsed = false;
  let tipsUsed = false;
  
  // Row 1: LOCKED
  rows.push(resolveRow1(data));
  
  // Row 2: Editorial Priority
  const row2 = resolveRow2(data);
  if (row2) {
    rows.push(row2);
    // Check if curator was used
    if (row2.cards.some(c => c.type === 'curator')) {
      curatorUsed = true;
    }
  }
  
  // Row 3: Gallery + Curator
  const row3 = resolveRow3(data, curatorUsed, quietCount);
  if (row3) {
    rows.push(row3);
    // Update counters
    quietCount += row3.cards.filter(c => c.type === 'quiet').length;
    if (row3.cards.some(c => c.type === 'curator')) {
      curatorUsed = true;
    }
    if (row3.cards.some(c => c.type === 'tips')) {
      tipsUsed = true;
    }
  }
  
  // Row 4: Utility
  const row4 = resolveRow4(data, quietCount, vibeUsed, tipsUsed);
  if (row4) {
    rows.push(row4);
    quietCount += row4.cards.filter(c => c.type === 'quiet').length;
    if (row4.cards.some(c => c.type === 'vibe')) {
      vibeUsed = true;
    }
    if (row4.cards.some(c => c.type === 'tips')) {
      tipsUsed = true;
    }
  }
  
  // Row 5: Vibe
  const row5 = resolveRow5(data, vibeUsed, wineUsed, quietCount);
  if (row5) {
    rows.push(row5);
    quietCount += row5.cards.filter(c => c.type === 'quiet').length;
    vibeUsed = true;
    if (row5.cards.some(c => c.type === 'wine')) {
      wineUsed = true;
    }
  }
  
  // Row 6: Wine
  const row6 = resolveRow6(data, wineUsed, quietCount);
  if (row6) {
    rows.push(row6);
    quietCount += row6.cards.filter(c => c.type === 'quiet').length;
  }
  
  // Row 7: Also On
  const row7 = resolveRow7(data);
  if (row7) {
    rows.push(row7);
  }
  
  return rows;
}

// ============================================================================
// VALIDATION
// ============================================================================

export function validateRow(row: RowConfig): boolean {
  const totalSpan = row.cards.reduce((sum, card) => sum + card.span, 0);
  
  // Rule 1: Must sum to 6
  if (totalSpan !== 6) {
    console.error(`Row ${row.rowNumber} validation failed: Total span is ${totalSpan}, expected 6`);
    return false;
  }
  
  // Rule 2: Span-1 = Quiet only
  const hasNonQuietSpan1 = row.cards.some(
    card => card.span === 1 && card.type !== 'quiet'
  );
  if (hasNonQuietSpan1) {
    const badCard = row.cards.find(card => card.span === 1 && card.type !== 'quiet');
    console.error(`Row ${row.rowNumber} validation failed: Non-quiet card "${badCard?.type}" has span-1`);
    return false;
  }
  
  // Rule 3: No span 6 allowed (DISALLOW_SPAN_6)
  if (CONSTRAINTS.DISALLOW_SPAN_6) {
    const hasSpan6 = row.cards.some(card => card.span === 6);
    if (hasSpan6) {
      const badCard = row.cards.find(card => card.span === 6);
      console.error(`Row ${row.rowNumber} validation failed: Card "${badCard?.type}" has span-6 (disallowed)`);
      return false;
    }
  }
  
  // Rule 4: Max span per card = 4
  const hasOversizeSpan = row.cards.some(
    card => card.span > CONSTRAINTS.MAX_SPAN_PER_CARD
  );
  if (hasOversizeSpan) {
    const badCard = row.cards.find(card => card.span > CONSTRAINTS.MAX_SPAN_PER_CARD);
    console.error(`Row ${row.rowNumber} validation failed: Card "${badCard?.type}" has span-${badCard?.span} (max ${CONSTRAINTS.MAX_SPAN_PER_CARD})`);
    return false;
  }
  
  // Rule 5: Validate spans against ALLOWED_SPANS_BY_TYPE
  const hasInvalidSpan = row.cards.some(card => {
    const allowedSpans = ALLOWED_SPANS_BY_TYPE[card.type];
    return allowedSpans && !allowedSpans.includes(card.span);
  });
  if (hasInvalidSpan) {
    const badCard = row.cards.find(card => {
      const allowedSpans = ALLOWED_SPANS_BY_TYPE[card.type];
      return allowedSpans && !allowedSpans.includes(card.span);
    });
    const allowedSpans = badCard ? ALLOWED_SPANS_BY_TYPE[badCard.type] : [];
    console.error(`Row ${row.rowNumber} validation failed: Card "${badCard?.type}" has span-${badCard?.span}, allowed: [${allowedSpans.join(', ')}]`);
    return false;
  }
  
  // Rule 6: Max 2 Quiet per row
  const quietCount = row.cards.filter(c => c.type === 'quiet').length;
  if (quietCount > CONSTRAINTS.MAX_QUIET_PER_ROW) {
    console.error(`Row ${row.rowNumber} validation failed: ${quietCount} Quiet cards (max ${CONSTRAINTS.MAX_QUIET_PER_ROW})`);
    return false;
  }
  
  // Rule 7: Row 2 cannot have Quiet
  if (row.rowNumber === 2 && quietCount > 0) {
    console.error(`Row ${row.rowNumber} validation failed: Row 2 cannot have Quiet cards`);
    return false;
  }
  
  return true;
}

export function validateLayout(rows: RowConfig[]): boolean {
  // Validate each row
  if (!rows.every(validateRow)) return false;
  
  // Rule 5: Max 4 Quiet total
  const totalQuiet = rows.reduce(
    (sum, row) => sum + row.cards.filter(c => c.type === 'quiet').length,
    0
  );
  if (totalQuiet > CONSTRAINTS.MAX_QUIET_PER_PAGE) return false;
  
  return true;
}

// ============================================================================
// SAFE FALLBACK LAYOUT
// ============================================================================

/**
 * Builds a minimal, guaranteed-safe layout when validation fails
 * Returns only Hours + Details (Row 1)
 */
export function buildSafeFallbackLayout(data: PlaceData): RowConfig[] {
  console.warn('⚠️ Building safe fallback layout (validation failed)');
  return [resolveRow1(data)];
}

// ============================================================================
// DEBUG HELPERS
// ============================================================================

export function debugLayout(rows: RowConfig[]): string {
  const lines: string[] = [
    '=== Place Page Layout Debug ===',
    ''
  ];
  
  rows.forEach(row => {
    const cardStr = row.cards
      .map(c => `${c.type}(${c.span})${c.variant ? `[${c.variant}]` : ''}`)
      .join(' + ');
    const totalSpan = row.cards.reduce((sum, card) => sum + card.span, 0);
    const valid = validateRow(row) ? '✓' : '✗';
    
    lines.push(`Row ${row.rowNumber}: ${cardStr} = ${totalSpan} cols ${valid}`);
  });
  
  lines.push('');
  const totalQuiet = rows.reduce(
    (sum, row) => sum + row.cards.filter(c => c.type === 'quiet').length,
    0
  );
  lines.push(`Total Quiet: ${totalQuiet}/${CONSTRAINTS.MAX_QUIET_PER_PAGE}`);
  lines.push(`Layout Valid: ${validateLayout(rows) ? '✓' : '✗'}`);
  
  return lines.join('\n');
}
