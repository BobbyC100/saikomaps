/**
 * Page Parser Module
 * 
 * Extracts fields from homepage HTML:
 * - Instagram URL (prefer JSON-LD sameAs, else anchors)
 * - Phone (prefer tel: links)
 * - Reservations URL + vendor detection
 * - Candidate links for future fetching (scored but not fetched)
 * 
 * Design:
 * - Compact evidence (max 160 chars per snippet)
 * - Defensive extraction with fallbacks
 * - Score candidate links but cap by type (max 3 total)
 */

// ============================================================================
// TYPES
// ============================================================================

export interface Evidence {
  field: string;
  sourceUrl: string;
  method: string;
  snippet: string; // Max 160 chars
}

export interface CandidateLink {
  url: string;
  text: string;
  type: 'menu' | 'wine' | 'about' | 'contact' | 'other';
  score: number;
}

export interface HomepageExtractionResult {
  instagram_url: string | null;
  phone: string | null;
  reservations_url: string | null;
  reservations_vendor: string | null;
  candidateLinks: CandidateLink[];
  evidence_json: Evidence[];
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Truncate snippet to max 160 chars
 */
function truncateSnippet(text: string, maxLength: number = 160): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Normalize whitespace in text
 */
function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Resolve relative URL to absolute
 */
function resolveUrl(url: string, baseUrl: string): string {
  try {
    return new URL(url, baseUrl).href;
  } catch {
    return url;
  }
}

// ============================================================================
// JSON-LD EXTRACTION
// ============================================================================

/**
 * Extract data from JSON-LD structured data
 */
function extractJsonLd(html: string): any[] {
  const jsonLdBlocks: any[] = [];
  
  // Find all <script type="application/ld+json"> blocks
  const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  
  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      jsonLdBlocks.push(data);
    } catch {
      // Invalid JSON, skip
    }
  }
  
  return jsonLdBlocks;
}

/**
 * Extract Instagram from JSON-LD sameAs
 */
function extractInstagramFromJsonLd(jsonLdBlocks: any[]): string | null {
  for (const block of jsonLdBlocks) {
    // Check for sameAs array
    if (Array.isArray(block.sameAs)) {
      for (const url of block.sameAs) {
        if (typeof url === 'string' && url.includes('instagram.com')) {
          return url;
        }
      }
    }
    
    // Check for sameAs string
    if (typeof block.sameAs === 'string' && block.sameAs.includes('instagram.com')) {
      return block.sameAs;
    }
  }
  
  return null;
}

// ============================================================================
// INSTAGRAM EXTRACTION
// ============================================================================

/**
 * Extract Instagram URL from HTML
 */
function extractInstagram(html: string, baseUrl: string): { url: string | null; evidence: Evidence | null } {
  // Try JSON-LD first (most reliable)
  const jsonLdBlocks = extractJsonLd(html);
  const jsonLdInstagram = extractInstagramFromJsonLd(jsonLdBlocks);
  
  if (jsonLdInstagram) {
    return {
      url: jsonLdInstagram,
      evidence: {
        field: 'instagram_url',
        sourceUrl: baseUrl,
        method: 'JSON-LD sameAs',
        snippet: truncateSnippet(`"sameAs": ["${jsonLdInstagram}"]`),
      },
    };
  }
  
  // Fallback: search for Instagram links in anchors
  const anchorRegex = /<a[^>]*href=["'](https?:\/\/(?:www\.)?instagram\.com\/[^"']+)["'][^>]*>/gi;
  let match;
  
  while ((match = anchorRegex.exec(html)) !== null) {
    const url = match[1];
    
    // Skip common non-profile pages
    if (url.includes('/p/') || url.includes('/reel/') || url.includes('/stories/')) {
      continue;
    }
    
    return {
      url,
      evidence: {
        field: 'instagram_url',
        sourceUrl: baseUrl,
        method: 'anchor href',
        snippet: truncateSnippet(match[0]),
      },
    };
  }
  
  return { url: null, evidence: null };
}

// ============================================================================
// PHONE EXTRACTION
// ============================================================================

/**
 * Extract phone number from HTML
 */
function extractPhone(html: string, baseUrl: string): { phone: string | null; evidence: Evidence | null } {
  // Prefer tel: links
  const telRegex = /<a[^>]*href=["']tel:([^"']+)["'][^>]*>/gi;
  const match = telRegex.exec(html);
  
  if (match) {
    const phone = match[1].replace(/\s+/g, ''); // Remove whitespace
    return {
      phone,
      evidence: {
        field: 'phone',
        sourceUrl: baseUrl,
        method: 'tel: link',
        snippet: truncateSnippet(match[0]),
      },
    };
  }
  
  // Fallback: search for phone patterns in text
  // US format: (XXX) XXX-XXXX or XXX-XXX-XXXX or XXX.XXX.XXXX
  const phoneRegex = /\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;
  const textMatch = phoneRegex.exec(html);
  
  if (textMatch) {
    return {
      phone: textMatch[0],
      evidence: {
        field: 'phone',
        sourceUrl: baseUrl,
        method: 'text pattern',
        snippet: truncateSnippet(textMatch[0]),
      },
    };
  }
  
  return { phone: null, evidence: null };
}

// ============================================================================
// RESERVATIONS EXTRACTION
// ============================================================================

/**
 * Detect reservation vendor from URL
 */
function detectReservationVendor(url: string): string | null {
  const urlLower = url.toLowerCase();
  
  if (urlLower.includes('resy.com')) return 'resy';
  if (urlLower.includes('opentable.com')) return 'opentable';
  if (urlLower.includes('tock.com')) return 'tock';
  if (urlLower.includes('sevenrooms.com')) return 'sevenrooms';
  if (urlLower.includes('yelp.com/reservations')) return 'yelp';
  
  return null;
}

/**
 * Extract reservations URL and vendor
 */
function extractReservations(html: string, baseUrl: string): {
  url: string | null;
  vendor: string | null;
  evidence: Evidence | null;
} {
  const vendors = ['resy.com', 'opentable.com', 'tock.com', 'sevenrooms.com', 'yelp.com/reservations'];
  
  // Check anchors
  for (const vendor of vendors) {
    const regex = new RegExp(`<a[^>]*href=["'](https?://[^"']*${vendor.replace('.', '\\.')}[^"']*)["'][^>]*>`, 'gi');
    const match = regex.exec(html);
    
    if (match) {
      const url = match[1];
      const detectedVendor = detectReservationVendor(url);
      
      return {
        url,
        vendor: detectedVendor,
        evidence: {
          field: 'reservations_url',
          sourceUrl: baseUrl,
          method: 'anchor href',
          snippet: truncateSnippet(match[0]),
        },
      };
    }
  }
  
  // Check iframes
  for (const vendor of vendors) {
    const regex = new RegExp(`<iframe[^>]*src=["'](https?://[^"']*${vendor.replace('.', '\\.')}[^"']*)["'][^>]*>`, 'gi');
    const match = regex.exec(html);
    
    if (match) {
      const url = match[1];
      const detectedVendor = detectReservationVendor(url);
      
      return {
        url,
        vendor: detectedVendor,
        evidence: {
          field: 'reservations_url',
          sourceUrl: baseUrl,
          method: 'iframe src',
          snippet: truncateSnippet(match[0]),
        },
      };
    }
  }
  
  // Check script tags
  for (const vendor of vendors) {
    const regex = new RegExp(`<script[^>]*src=["'](https?://[^"']*${vendor.replace('.', '\\.')}[^"']*)["'][^>]*>`, 'gi');
    const match = regex.exec(html);
    
    if (match) {
      const url = match[1];
      const detectedVendor = detectReservationVendor(url);
      
      return {
        url,
        vendor: detectedVendor,
        evidence: {
          field: 'reservations_url',
          sourceUrl: baseUrl,
          method: 'script src',
          snippet: truncateSnippet(match[0]),
        },
      };
    }
  }
  
  return { url: null, vendor: null, evidence: null };
}

// ============================================================================
// CANDIDATE LINK EXTRACTION
// ============================================================================

/**
 * Score and classify a link as candidate for future fetching
 */
function scoreCandidateLink(linkUrl: string, linkText: string): { type: CandidateLink['type']; score: number } {
  const urlLower = linkUrl.toLowerCase();
  const textLower = linkText.toLowerCase().trim();
  
  // Menu detection
  if (urlLower.includes('/menu') || textLower === 'menu' || textLower === 'food') {
    return { type: 'menu', score: 1.0 };
  }
  if (urlLower.includes('/food') || urlLower.includes('/dining') || textLower === 'food & drink') {
    return { type: 'menu', score: 0.75 };
  }
  
  // Wine list detection
  if (urlLower.includes('/wine') || textLower === 'wine' || textLower === 'wine list') {
    return { type: 'wine', score: 1.0 };
  }
  if (textLower.includes('wine') && textLower.includes('list')) {
    return { type: 'wine', score: 0.75 };
  }
  
  // About detection
  if (urlLower.includes('/about') || textLower === 'about' || textLower === 'our story') {
    return { type: 'about', score: 1.0 };
  }
  if (urlLower.includes('/story') || urlLower.includes('/team') || urlLower.includes('/people')) {
    return { type: 'about', score: 0.75 };
  }
  
  // Contact detection
  if (urlLower.includes('/contact') || textLower === 'contact' || textLower === 'contact us') {
    return { type: 'contact', score: 1.0 };
  }
  if (textLower === 'location' || textLower === 'visit') {
    return { type: 'contact', score: 0.5 };
  }
  
  return { type: 'other', score: 0.1 };
}

/**
 * Extract and score candidate links from homepage
 * Returns top 3 links, capping by type (max 1 per type)
 */
function extractCandidateLinks(html: string, baseUrl: string): CandidateLink[] {
  const candidates: CandidateLink[] = [];
  
  // Extract all anchor tags
  const anchorRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi;
  let match;
  
  while ((match = anchorRegex.exec(html)) !== null) {
    const href = match[1];
    const text = normalizeText(match[2]);
    
    // Skip empty, anchors, external domains, social media
    if (!text || href.startsWith('#') || href.startsWith('javascript:')) continue;
    if (href.includes('facebook.com') || href.includes('instagram.com') || href.includes('twitter.com')) continue;
    
    // Resolve to absolute URL
    const absoluteUrl = resolveUrl(href, baseUrl);
    
    // Skip if not same domain (with www. handling)
    try {
      const linkDomain = new URL(absoluteUrl).hostname.replace(/^www\./, '');
      const baseDomain = new URL(baseUrl).hostname.replace(/^www\./, '');
      if (linkDomain !== baseDomain) continue;
    } catch {
      continue;
    }
    
    // Score and classify
    const { type, score } = scoreCandidateLink(absoluteUrl, text);
    
    if (score >= 0.5) {
      candidates.push({ url: absoluteUrl, text, type, score });
    }
  }
  
  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score);
  
  // Cap by type: max 1 per type, max 3 total
  const selected: CandidateLink[] = [];
  const typesSeen = new Set<string>();
  
  for (const candidate of candidates) {
    if (typesSeen.has(candidate.type)) continue;
    typesSeen.add(candidate.type);
    selected.push(candidate);
    if (selected.length >= 3) break;
  }
  
  return selected;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Parse homepage HTML and extract all fields
 */
export function parseHomepage(html: string, url: string): HomepageExtractionResult {
  const evidence: Evidence[] = [];
  
  // Extract Instagram
  const instagram = extractInstagram(html, url);
  if (instagram.evidence) evidence.push(instagram.evidence);
  
  // Extract phone
  const phone = extractPhone(html, url);
  if (phone.evidence) evidence.push(phone.evidence);
  
  // Extract reservations
  const reservations = extractReservations(html, url);
  if (reservations.evidence) evidence.push(reservations.evidence);
  
  // Extract candidate links (but don't fetch them yet)
  const candidateLinks = extractCandidateLinks(html, url);
  
  return {
    instagram_url: instagram.url,
    phone: phone.phone,
    reservations_url: reservations.url,
    reservations_vendor: reservations.vendor,
    candidateLinks,
    evidence_json: evidence,
  };
}
