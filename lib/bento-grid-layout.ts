/**
 * Bento Grid Layout Logic for Merchant Pages
 * 
 * Handles dynamic grid layout with a 6-column system.
 * Intelligently places content blocks and fills empty spaces with Quiet Cards.
 */

export interface BentoBlock {
  id: string;
  type: 'action-cards' | 'gallery' | 'curator-note' | 'excerpt' | 'vibe' | 'hours' | 'map' | 'call' | 'tips' | 'coverage' | 'best-for' | 'also-on' | 'quiet';
  span: 2 | 3 | 4 | 6;
  priority: number; // Lower = higher priority (renders first)
  required?: boolean; // If true, will always show even if data is sparse
}

export interface LayoutOptions {
  hasActionCards: boolean;
  hasGallery: boolean;
  hasCuratorNote: boolean;
  hasExcerpt: boolean;
  hasVibeTags: boolean;
  hasHours: boolean;
  hasMap: boolean;
  hasCall: boolean;
  hasTips: boolean;
  hasCoverage: boolean;
  hasBestFor: boolean;
  hasAlsoOn: boolean;
}

/**
 * Calculate the grid layout based on available content
 */
export function calculateBentoLayout(options: LayoutOptions): BentoBlock[] {
  const blocks: BentoBlock[] = [];

  // Tier 1: Action Cards (always full width when present)
  if (options.hasActionCards) {
    blocks.push({ id: 'action-cards', type: 'action-cards', span: 6, priority: 1, required: true });
  }

  // Tier 1: Gallery (always full width when present)
  if (options.hasGallery) {
    blocks.push({ id: 'gallery', type: 'gallery', span: 6, priority: 2 });
  }

  // Tier 2: Curator's Note + Excerpt/Vibe (side by side layout)
  // Logic: If curator note exists with excerpt or vibe, split 3-3. Otherwise full width.
  if (options.hasCuratorNote) {
    const hasRightContent = options.hasExcerpt || options.hasVibeTags;
    blocks.push({
      id: 'curator-note',
      type: 'curator-note',
      span: hasRightContent ? 3 : 6,
      priority: 3,
    });
  }

  if (options.hasExcerpt) {
    const hasLeftContent = options.hasCuratorNote;
    blocks.push({
      id: 'excerpt',
      type: 'excerpt',
      span: hasLeftContent ? 3 : (options.hasVibeTags ? 3 : 6),
      priority: 4,
    });
  }

  if (options.hasVibeTags && !options.hasExcerpt) {
    const hasLeftContent = options.hasCuratorNote;
    blocks.push({
      id: 'vibe',
      type: 'vibe',
      span: hasLeftContent ? 3 : 6,
      priority: 5,
    });
  }

  // Tier 3: Hours + Map + Call (responsive grid)
  // These use a special tier3Row layout in CSS, but we track them for occupancy
  const tier3Present = options.hasHours || options.hasMap || options.hasCall;
  if (tier3Present) {
    // These blocks are wrapped in tier3Row, so we count them as a full row
    // Actual column calculation happens in the tier3Row grid
    if (options.hasHours) {
      blocks.push({ id: 'hours', type: 'hours', span: 2, priority: 6 });
    }
    if (options.hasMap) {
      blocks.push({ id: 'map', type: 'map', span: 2, priority: 7 });
    }
    if (options.hasCall) {
      blocks.push({ id: 'call', type: 'call', span: 2, priority: 8 });
    }
  }

  // Tips (2 columns)
  if (options.hasTips) {
    blocks.push({ id: 'tips', type: 'tips', span: 2, priority: 9 });
  }

  // Coverage (3 columns)
  if (options.hasCoverage) {
    blocks.push({ id: 'coverage', type: 'coverage', span: 3, priority: 10 });
  }

  // Best For (full width)
  if (options.hasBestFor) {
    blocks.push({ id: 'best-for', type: 'best-for', span: 6, priority: 11 });
  }

  // Also On (full width)
  if (options.hasAlsoOn) {
    blocks.push({ id: 'also-on', type: 'also-on', span: 6, priority: 12 });
  }

  return blocks;
}

/**
 * Calculate how many Quiet Cards are needed to fill empty grid cells
 */
export function calculateQuietCards(blocks: BentoBlock[]): Array<{ key: string; variant: 'topo' | 'texture' | 'minimal' }> {
  // Calculate total occupied columns
  let occupiedColumns = 0;
  
  for (const block of blocks) {
    occupiedColumns += block.span;
  }

  // Calculate empty cells (grid is 6 columns wide)
  const totalRows = Math.ceil(occupiedColumns / 6);
  const totalCells = totalRows * 6;
  const emptyCells = totalCells - occupiedColumns;

  // Generate Quiet Cards (each spans 2 columns)
  const quietCardCount = Math.floor(emptyCells / 2);
  const quietCards: Array<{ key: string; variant: 'topo' | 'texture' | 'minimal' }> = [];

  for (let i = 0; i < quietCardCount; i++) {
    quietCards.push({
      key: `quiet-${i}`,
      variant: ['topo', 'texture', 'minimal'][i % 3] as 'topo' | 'texture' | 'minimal',
    });
  }

  return quietCards;
}

/**
 * Check if the page should be in sparse mode
 * Sparse mode activates when there's very little enriched content
 */
export function isSparseLayout(options: LayoutOptions): boolean {
  const enrichedContentCount = [
    options.hasCuratorNote,
    options.hasGallery,
    options.hasCoverage,
    options.hasVibeTags,
    options.hasTips,
    options.hasBestFor,
  ].filter(Boolean).length;

  return enrichedContentCount <= 1;
}

/**
 * Get recommended block order for optimal visual balance
 * This can be used for dynamic reordering based on content density
 */
export function optimizeBlockOrder(blocks: BentoBlock[]): BentoBlock[] {
  return blocks.sort((a, b) => a.priority - b.priority);
}
