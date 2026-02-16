/**
 * Place Page Layout Resolver - System B
 * 
 * Production-ready spec: controlled irregularity via natural CSS Grid flow.
 * 
 * Core Principles:
 * - 6-column CSS Grid
 * - Natural flow (reading order wins)
 * - Flexible row heights (content determines height)
 * - No dense backfill (no algorithmic reshuffling)
 * - Gaps allowed when they read like punctuation, not bugs
 */

// ============================================================================
// TYPES
// ============================================================================

export type CardType = 
  | 'hours'
  | 'description'   // NEW: curator_note or about_copy
  | 'reservations'
  | 'vibe'
  | 'press'
  | 'gallery'
  | 'menu'
  | 'wine'
  | 'links'
  | 'phone'
  | 'alsoOn'
  | 'quiet';         // Gallery gap fill fallback

export interface CardConfig {
  type: CardType;
  span: { c: number; r: number };
  data?: any;
}

export interface PlaceData {
  // Tier 1: Identity-critical
  hours?: any;
  description?: {
    curator_note?: string | null;
    about_copy?: string | null;
  };
  reservations?: {
    url?: string | null;
  };
  
  // Tier 2: Editorial / vibe / proof
  vibe?: string[] | null;
  press?: {
    quote?: string;
    source?: string;
    author?: string;
    url?: string;
  } | null;
  gallery?: string[] | null;
  
  // Tier 3: Data surfaces
  menu?: MenuItem[] | null;
  wine?: WineProgram | null;
  
  // Tier 4: Reference + links
  links?: {
    instagram?: string | null;
    website?: string | null;
    menuUrl?: string | null;
    wineUrl?: string | null;
  };
  phone?: string | null;
  
  // Bottom: Also On
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
// SPAN MAP (Simple + Stable)
// ============================================================================

const SPANS = {
  hours:        { c: 3, r: 1 }, // Allow r:2 if content needs it
  heroPhoto:    { c: 3, r: 1 }, // Or c:6 for full-width inside grid
  description:  { c: 3, r: 1 }, // Curator note / about (taller naturally)
  vibe:         { c: 2, r: 1 },
  menu:         { c: 2, r: 1 }, // r:2 if content long
  wine:         { c: 2, r: 1 },
  press:        { c: 3, r: 1 },
  gallery:      { c: 4, r: 1 }, // Keep rare
  reservations: { c: 2, r: 1 },
  links:        { c: 2, r: 1 }, // Instagram/website/menu/wine URLs as items
  phone:        { c: 2, r: 1 },
  alsoOn:       { c: 6, r: 1 }, // Container for exactly 3 cards
} as const;

// ============================================================================
// TIERED ORDERING (Predictable, No Reordering)
// ============================================================================

/**
 * Resolves tiles in tier order. Never reorder to fill gaps.
 * Natural flow with acceptable gaps at row ends.
 */
export function resolvePlacePageLayout(data: PlaceData): CardConfig[] {
  const tiles: CardConfig[] = [];
  
  // Helper: Push tile if data exists
  const pushIf = (tile: CardConfig | null) => {
    if (tile) tiles.push(tile);
  };
  
  // ──────────────────────────────────────────────────────────────────────────
  // Tier 1: Identity-critical + "above fold" anchors
  // ──────────────────────────────────────────────────────────────────────────
  
  // Hours (must show if exists)
  pushIf(data.hours ? { 
    type: 'hours', 
    span: SPANS.hours,
    data: data.hours 
  } : null);
  
  // Description (curator_note takes priority, fallback to about_copy)
  const descriptionContent = data.description?.curator_note || data.description?.about_copy;
  if (descriptionContent) {
    pushIf({ 
      type: 'description', 
      span: SPANS.description,
      data: { content: descriptionContent, isCurator: !!data.description?.curator_note }
    });
  }
  
  // Reservations
  pushIf(data.reservations?.url ? { 
    type: 'reservations', 
    span: SPANS.reservations,
    data: data.reservations 
  } : null);
  
  // ──────────────────────────────────────────────────────────────────────────
  // Tier 2: Editorial / vibe / proof
  // ──────────────────────────────────────────────────────────────────────────
  
  // Vibe
  pushIf(data.vibe && data.vibe.length > 0 ? { 
    type: 'vibe', 
    span: SPANS.vibe,
    data: data.vibe 
  } : null);
  
  // Press (pull quote / coverage)
  pushIf(data.press ? { 
    type: 'press', 
    span: SPANS.press,
    data: data.press 
  } : null);
  
  // Gallery
  pushIf(data.gallery && data.gallery.length > 0 ? { 
    type: 'gallery', 
    span: SPANS.gallery,
    data: data.gallery 
  } : null);
  
  // ──────────────────────────────────────────────────────────────────────────
  // Tier 3: Data surfaces
  // ──────────────────────────────────────────────────────────────────────────
  
  // Menu
  pushIf(data.menu && data.menu.length > 0 ? { 
    type: 'menu', 
    span: SPANS.menu,
    data: data.menu 
  } : null);
  
  // Wine
  pushIf(data.wine ? { 
    type: 'wine', 
    span: SPANS.wine,
    data: data.wine 
  } : null);
  
  // ──────────────────────────────────────────────────────────────────────────
  // Tier 4: Reference + links
  // ──────────────────────────────────────────────────────────────────────────
  
  // Links (Instagram as primary link, no follower counts)
  pushIf(data.links && (data.links.instagram || data.links.website) ? { 
    type: 'links', 
    span: SPANS.links,
    data: data.links 
  } : null);
  
  // Phone
  pushIf(data.phone ? { 
    type: 'phone', 
    span: SPANS.phone,
    data: { phone: data.phone }
  } : null);
  
  // ──────────────────────────────────────────────────────────────────────────
  // Bottom: Also On (single instance)
  // ──────────────────────────────────────────────────────────────────────────
  
  pushIf(data.alsoOn && data.alsoOn.length > 0 ? { 
    type: 'alsoOn', 
    span: SPANS.alsoOn,
    data: data.alsoOn 
  } : null);
  
  // ──────────────────────────────────────────────────────────────────────────
  // Gallery Gap Fill — Secondary Pass
  // ──────────────────────────────────────────────────────────────────────────
  // 
  // WHEN: Gallery (span-4) leaves 2-col gap on same row
  // WHY: Prevents awkward single gap when no companion exists
  // WHAT: Pulls single Tier 4 card OR inserts QuietCard
  // 
  // CONSTRAINTS:
  // - Single gap scenario only (Gallery span-4 → 2 cols remaining)
  // - Max 1 card reordering per page
  // - Only pulls from Tier 4 (never Tier 3)
  // - Never changes spans
  // - Never cascade reorders
  // - QuietCard remains visually quiet (no hierarchy)
  // 
  // This is a post-tier visual optimization layer, not ranking logic.
  // ──────────────────────────────────────────────────────────────────────────
  
  return applyGalleryGapFill(tiles);
}

/**
 * Gallery Gap Fill Logic — Isolated Function
 * 
 * Detects Gallery (span-4) followed by 2-col gap.
 * Attempts hybrid fill strategy:
 * 1. Reorder: Pull single Tier 4 card (links/phone) if available
 * 2. Fallback: Insert QuietCard with 'quiet' type
 * 
 * Ensures single-pass, non-cascading behavior.
 */
function applyGalleryGapFill(tiles: CardConfig[]): CardConfig[] {
  // Find Gallery card
  const galleryIndex = tiles.findIndex(t => t.type === 'gallery');
  
  // No Gallery? Skip gap fill logic entirely
  if (galleryIndex === -1) return tiles;
  
  // Calculate row position of Gallery
  let columnsSoFar = 0;
  for (let i = 0; i < galleryIndex; i++) {
    columnsSoFar += tiles[i].span.c;
  }
  const galleryRowStart = columnsSoFar % 6;
  const galleryRowEnd = (galleryRowStart + 4) % 6; // Gallery is span-4
  
  // Gallery creates 2-col gap? (row positions: 0→4 leaves 4,5 open)
  const hasGap = galleryRowEnd === 4; // After span-4, we're at column 4 (0-indexed)
  
  if (!hasGap) return tiles;
  
  // Gap detected. Check what follows Gallery immediately.
  const nextCardIndex = galleryIndex + 1;
  
  // If no cards after Gallery, or next card is AlsoOn (span-6), or next card is span-3+, we need fill
  // span-2 cards (menu, wine, vibe, etc.) naturally fill the 2-col gap
  const nextCard = tiles[nextCardIndex];
  const needsFill = !nextCard || nextCard.type === 'alsoOn' || nextCard.span.c > 2;
  
  if (!needsFill) return tiles;
  
  // Strategy: Hybrid (Option C)
  // 1. Try to pull a Tier 4 card (links or phone) from later in array
  // 2. If none available, insert QuietCard
  
  // Search for first Tier 4 card after Gallery
  const tier4Types = ['links', 'phone'];
  const tier4CardIndex = tiles.findIndex((t, idx) => 
    idx > galleryIndex && tier4Types.includes(t.type)
  );
  
  if (tier4CardIndex !== -1) {
    // REORDER: Pull Tier 4 card up to fill gap
    const result = [...tiles];
    const [tier4Card] = result.splice(tier4CardIndex, 1);
    result.splice(galleryIndex + 1, 0, tier4Card);
    return result;
  }
  
  // FALLBACK: Insert QuietCard (span-2, 'grid' variant)
  const quietCard: CardConfig = {
    type: 'quiet' as CardType,
    span: { c: 2, r: 1 },
    data: { variant: 'grid' }
  };
  
  const result = [...tiles];
  result.splice(galleryIndex + 1, 0, quietCard);
  return result;
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validates that tiles follow System B constraints
 */
export function validateLayout(tiles: CardConfig[]): boolean {
  // Check 1: No span-6 except alsoOn
  const invalidSpan6 = tiles.filter(t => t.span.c === 6 && t.type !== 'alsoOn');
  if (invalidSpan6.length > 0) {
    console.error('❌ System B: span-6 only allowed for alsoOn', invalidSpan6);
    return false;
  }
  
  // Check 2: Mostly 2-col and 3-col spans (simple layout)
  const validSpans = tiles.every(t => 
    [2, 3, 4, 6].includes(t.span.c) // Allow 4 for gallery (rare)
  );
  if (!validSpans) {
    console.error('❌ System B: Invalid span detected', tiles);
    return false;
  }
  
  // Check 3: Exactly one alsoOn max
  const alsoOnCount = tiles.filter(t => t.type === 'alsoOn').length;
  if (alsoOnCount > 1) {
    console.error('❌ System B: Multiple alsoOn sections detected', alsoOnCount);
    return false;
  }
  
  // Check 4: Quiet cards only appear after Gallery (gap fill constraint)
  const quietCards = tiles.filter(t => t.type === 'quiet');
  if (quietCards.length > 1) {
    console.error('❌ System B: Multiple quiet cards detected (max 1 allowed)', quietCards.length);
    return false;
  }
  if (quietCards.length === 1) {
    const quietIndex = tiles.findIndex(t => t.type === 'quiet');
    const galleryIndex = tiles.findIndex(t => t.type === 'gallery');
    if (galleryIndex === -1 || quietIndex !== galleryIndex + 1) {
      console.error('❌ System B: Quiet card must follow Gallery immediately');
      return false;
    }
  }
  
  return true;
}

// ============================================================================
// DEBUG HELPERS
// ============================================================================

export function debugLayout(tiles: CardConfig[]): string {
  const lines: string[] = [
    '=== Place Page Layout (System B) ===',
    ''
  ];
  
  tiles.forEach((tile, idx) => {
    lines.push(`${idx + 1}. ${tile.type} (${tile.span.c}×${tile.span.r})`);
  });
  
  lines.push('');
  lines.push(`Total tiles: ${tiles.length}`);
  lines.push(`Layout valid: ${validateLayout(tiles) ? '✓' : '✗'}`);
  
  return lines.join('\n');
}
