/**
 * Target Page Parser Module
 * 
 * Extracts structured data from fetched target pages:
 * - menu_url (prefer PDF)
 * - winelist_url (prefer PDF)
 * - about_copy (first 1-2 paragraphs, 800-1200 chars cap)
 * 
 * Design:
 * - Prioritize PDFs over HTML pages
 * - Extract main content, skip nav/footer
 * - Compact evidence (max 160 chars)
 * - Defensive extraction (nulls on failure)
 */

// ============================================================================
// TYPES
// ============================================================================

export interface MenuExtraction {
  menu_url: string | null;
  menu_evidence: string | null;
}

export interface WinelistExtraction {
  winelist_url: string | null;
  winelist_evidence: string | null;
}

export interface AboutExtraction {
  about_url: string | null;
  about_copy: string | null;
  about_evidence: string | null;
}

interface ExtractedLink {
  url: string;
  text: string;
  reason: string;
  score: number;
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Truncate snippet to max chars
 */
function truncateSnippet(text: string, maxLength: number = 160): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Normalize whitespace
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

/**
 * Check if URL is same domain as base
 */
function isSameDomain(url: string, baseUrl: string): boolean {
  try {
    const urlHost = new URL(url).hostname.replace(/^www\./, '');
    const baseHost = new URL(baseUrl).hostname.replace(/^www\./, '');
    return urlHost === baseHost;
  } catch {
    return false;
  }
}

/**
 * Strip HTML tags and decode entities
 */
function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// ============================================================================
// MENU URL EXTRACTION
// ============================================================================

/**
 * Extract menu URL from HTML
 * 
 * Priority:
 * 1. PDF links with "menu" in href or text
 * 2. HTML links with menu keywords in path
 * 3. Known vendor URLs
 */
export function extractMenuUrl(html: string, pageUrl: string): MenuExtraction {
  const candidates: ExtractedLink[] = [];
  
  // 1. Find PDF links
  const pdfRegex = /<a[^>]*href=["']([^"']*\.pdf[^"']*)["'][^>]*>([^<]*)</gi;
  let match;
  
  while ((match = pdfRegex.exec(html)) !== null) {
    const href = match[1];
    const text = normalizeText(match[2]);
    
    // Check if menu-related
    const menuKeywords = ['menu', 'food', 'dinner', 'lunch', 'breakfast', 'dining'];
    const isMenuPdf = menuKeywords.some(kw => 
      href.toLowerCase().includes(kw) || text.toLowerCase().includes(kw)
    );
    
    if (isMenuPdf) {
      candidates.push({
        url: resolveUrl(href, pageUrl),
        text,
        reason: `PDF link: "${text}"`,
        score: 1.0,
      });
    }
  }
  
  // 2. Find HTML menu links
  const anchorRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>([^<]*)</gi;
  
  while ((match = anchorRegex.exec(html)) !== null) {
    const href = match[1];
    const text = normalizeText(match[2]);
    const urlLower = href.toLowerCase();
    
    // Skip already found PDFs
    if (href.endsWith('.pdf')) continue;
    
    // Check for menu keywords in path
    if (urlLower.includes('/menu') || urlLower.includes('/food') || urlLower.includes('/dining')) {
      candidates.push({
        url: resolveUrl(href, pageUrl),
        text,
        reason: `Path contains menu: "${href.substring(0, 50)}"`,
        score: 0.75,
      });
    }
  }
  
  // 3. Check for known menu vendors
  const vendorRegex = /(toasttab\.com|spoton\.com|singleplatform\.com|bentobox\.com|popmenu\.com)/i;
  const vendorMatch = html.match(vendorRegex);
  
  if (vendorMatch) {
    const vendorUrl = vendorMatch[0];
    candidates.push({
      url: `https://${vendorUrl}`,
      text: vendorUrl,
      reason: `Menu vendor: ${vendorUrl}`,
      score: 0.5,
    });
  }
  
  // Select best candidate (prefer same-domain, higher score)
  if (candidates.length === 0) {
    return { menu_url: null, menu_evidence: null };
  }
  
  // Sort: same-domain first, then by score
  candidates.sort((a, b) => {
    const aSameDomain = isSameDomain(a.url, pageUrl) ? 1 : 0;
    const bSameDomain = isSameDomain(b.url, pageUrl) ? 1 : 0;
    if (aSameDomain !== bSameDomain) return bSameDomain - aSameDomain;
    return b.score - a.score;
  });
  
  const best = candidates[0];
  
  return {
    menu_url: best.url,
    menu_evidence: truncateSnippet(best.reason),
  };
}

// ============================================================================
// WINELIST URL EXTRACTION
// ============================================================================

/**
 * Extract wine list URL from HTML
 * 
 * Priority:
 * 1. PDF links with "wine" in href or text
 * 2. HTML links with wine keywords in path
 */
export function extractWinelistUrl(html: string, pageUrl: string): WinelistExtraction {
  const candidates: ExtractedLink[] = [];
  
  // 1. Find PDF links
  const pdfRegex = /<a[^>]*href=["']([^"']*\.pdf[^"']*)["'][^>]*>([^<]*)</gi;
  let match;
  
  while ((match = pdfRegex.exec(html)) !== null) {
    const href = match[1];
    const text = normalizeText(match[2]);
    
    // Check if wine-related
    const wineKeywords = ['wine', 'beverage', 'drink', 'cocktail', 'bar'];
    const isWinePdf = wineKeywords.some(kw => 
      href.toLowerCase().includes(kw) || text.toLowerCase().includes(kw)
    );
    
    if (isWinePdf) {
      candidates.push({
        url: resolveUrl(href, pageUrl),
        text,
        reason: `PDF link: "${text}"`,
        score: 1.0,
      });
    }
  }
  
  // 2. Find HTML wine links
  const anchorRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>([^<]*)</gi;
  
  while ((match = anchorRegex.exec(html)) !== null) {
    const href = match[1];
    const text = normalizeText(match[2]);
    const urlLower = href.toLowerCase();
    
    // Skip already found PDFs
    if (href.endsWith('.pdf')) continue;
    
    // Check for wine keywords in path
    if (urlLower.includes('/wine') || urlLower.includes('/drinks') || urlLower.includes('/beverage') || urlLower.includes('/bar')) {
      candidates.push({
        url: resolveUrl(href, pageUrl),
        text,
        reason: `Path contains wine: "${href.substring(0, 50)}"`,
        score: 0.75,
      });
    }
  }
  
  // Select best candidate
  if (candidates.length === 0) {
    return { winelist_url: null, winelist_evidence: null };
  }
  
  // Sort: same-domain first, then by score
  candidates.sort((a, b) => {
    const aSameDomain = isSameDomain(a.url, pageUrl) ? 1 : 0;
    const bSameDomain = isSameDomain(b.url, pageUrl) ? 1 : 0;
    if (aSameDomain !== bSameDomain) return bSameDomain - aSameDomain;
    return b.score - a.score;
  });
  
  const best = candidates[0];
  
  return {
    winelist_url: best.url,
    winelist_evidence: truncateSnippet(best.reason),
  };
}

// ============================================================================
// ABOUT COPY EXTRACTION
// ============================================================================

/**
 * Extract main content paragraphs from about page
 * 
 * Strategy:
 * 1. Look for <main>, <article>, or largest <section>
 * 2. Extract first 1-2 meaningful <p> blocks
 * 3. Skip nav/footer/boilerplate
 * 4. Cap at 800-1200 chars
 */
export function extractAboutCopy(html: string, pageUrl: string): AboutExtraction {
  // Try to find main content area
  let contentHtml = '';
  
  // 1. Try <main>
  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  if (mainMatch) {
    contentHtml = mainMatch[1];
  }
  
  // 2. Try <article>
  if (!contentHtml) {
    const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
    if (articleMatch) {
      contentHtml = articleMatch[1];
    }
  }
  
  // 3. Try largest <section>
  if (!contentHtml) {
    const sectionRegex = /<section[^>]*>([\s\S]*?)<\/section>/gi;
    let largestSection = '';
    let match;
    
    while ((match = sectionRegex.exec(html)) !== null) {
      if (match[1].length > largestSection.length) {
        largestSection = match[1];
      }
    }
    
    contentHtml = largestSection;
  }
  
  // Fallback: use entire body
  if (!contentHtml) {
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
      contentHtml = bodyMatch[1];
    } else {
      contentHtml = html;
    }
  }
  
  // Extract paragraphs
  const paragraphs: string[] = [];
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let pMatch;
  
  while ((pMatch = pRegex.exec(contentHtml)) !== null) {
    const text = stripHtml(pMatch[1]);
    
    // Skip short paragraphs (likely nav/footer)
    if (text.length < 50) continue;
    
    // Skip paragraphs with common boilerplate patterns
    const boilerplate = [
      'copyright',
      'all rights reserved',
      'follow us',
      'subscribe',
      'sign up',
      'newsletter',
      'privacy policy',
      'terms of service',
    ];
    
    const isBoilerplate = boilerplate.some(pattern => 
      text.toLowerCase().includes(pattern)
    );
    
    if (isBoilerplate) continue;
    
    paragraphs.push(text);
    
    // Stop after 2 good paragraphs
    if (paragraphs.length >= 2) break;
  }
  
  if (paragraphs.length === 0) {
    return {
      about_url: pageUrl,
      about_copy: null,
      about_evidence: null,
    };
  }
  
  // Join paragraphs with double newline
  let aboutCopy = paragraphs.join('\n\n');
  
  // Cap at 800-1200 chars (prefer clean sentence breaks)
  if (aboutCopy.length > 1200) {
    aboutCopy = aboutCopy.substring(0, 1200);
    // Try to end at sentence
    const lastPeriod = aboutCopy.lastIndexOf('.');
    if (lastPeriod > 800) {
      aboutCopy = aboutCopy.substring(0, lastPeriod + 1);
    }
  }
  
  // Create evidence snippet (first 160 chars)
  const evidence = truncateSnippet(aboutCopy);
  
  return {
    about_url: pageUrl,
    about_copy: aboutCopy,
    about_evidence: evidence,
  };
}
