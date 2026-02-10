/**
 * Website Content Extractors
 * 
 * Pure functions: (html, baseUrl) => Result
 * No side effects, no network calls, deterministic.
 * 
 * These extract identity signals, not inventory.
 */

import {
  ExtractedLink,
  ExtractedText,
  ExtractorConfidence,
  MenuExtractionResult,
  WineListExtractionResult,
  AboutPageDiscoveryResult,
  AboutCopyExtractionResult,
} from './types';

// ============================================================================
// URL UTILITIES
// ============================================================================

/**
 * Resolve a potentially relative URL against a base URL
 */
function resolveUrl(href: string, baseUrl: string): string | null {
  try {
    // Handle protocol-relative URLs
    if (href.startsWith('//')) {
      href = 'https:' + href;
    }
    return new URL(href, baseUrl).href;
  } catch {
    return null;
  }
}

/**
 * Check if URL is from the same domain (or www variant)
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
 * URLs to skip (stylesheets, scripts, external services)
 */
const SKIP_PATTERNS = [
  /\.css$/i,
  /\.js$/i,
  /\.json$/i,
  /\.xml$/i,
  /\.ico$/i,
  /\.png$/i,
  /\.jpg$/i,
  /\.jpeg$/i,
  /\.gif$/i,
  /\.svg$/i,
  /\.webp$/i,
  /^mailto:/i,
  /^tel:/i,
  /^sms:/i,
  /instagram\.com/i,
  /facebook\.com/i,
  /twitter\.com/i,
  /tiktok\.com/i,
  /yelp\.com/i,
  /tripadvisor\.com/i,
  /google\.com\/maps/i,
  /doordash\.com/i,
  /ubereats\.com/i,
  /grubhub\.com/i,
  /opentable\.com/i,
  /resy\.com/i,
  /tock\.com/i,
];

function shouldSkipUrl(url: string): boolean {
  return SKIP_PATTERNS.some(pattern => pattern.test(url));
}

// ============================================================================
// HTML PARSING UTILITIES
// ============================================================================

/**
 * Extract all links from HTML with their text content
 */
interface LinkInfo {
  href: string;
  text: string;
  ariaLabel?: string;
  title?: string;
  context: 'nav' | 'main' | 'footer' | 'unknown';
}

function extractLinks(html: string, baseUrl: string): LinkInfo[] {
  const links: LinkInfo[] = [];
  
  // Detect context regions
  const navMatch = html.match(/<nav[^>]*>([\s\S]*?)<\/nav>/gi) || [];
  const footerMatch = html.match(/<footer[^>]*>([\s\S]*?)<\/footer>/gi) || [];
  const navContent = navMatch.join(' ').toLowerCase();
  const footerContent = footerMatch.join(' ').toLowerCase();
  
  // Match all anchor tags
  const linkRegex = /<a\s+([^>]*href\s*=\s*["']([^"']+)["'][^>]*)>([^<]*(?:<[^/a][^>]*>[^<]*)*)<\/a>/gi;
  let match;
  
  while ((match = linkRegex.exec(html)) !== null) {
    const [fullMatch, attrs, href, innerText] = match;
    
    // Skip empty hrefs, anchors, and javascript
    if (!href || href === '#' || href.startsWith('javascript:')) continue;
    
    // Resolve URL
    const resolvedUrl = resolveUrl(href, baseUrl);
    if (!resolvedUrl) continue;
    
    // Skip external services and non-content files
    if (shouldSkipUrl(resolvedUrl)) continue;
    
    // Only same-domain links
    if (!isSameDomain(resolvedUrl, baseUrl)) continue;
    
    // Extract text, cleaning HTML tags
    const text = innerText.replace(/<[^>]*>/g, '').trim();
    
    // Extract aria-label and title
    const ariaMatch = attrs.match(/aria-label\s*=\s*["']([^"']+)["']/i);
    const titleMatch = attrs.match(/title\s*=\s*["']([^"']+)["']/i);
    
    // Determine context
    let context: LinkInfo['context'] = 'unknown';
    const matchLower = fullMatch.toLowerCase();
    if (navContent.includes(matchLower) || navContent.includes(href.toLowerCase())) {
      context = 'nav';
    } else if (footerContent.includes(matchLower)) {
      context = 'footer';
    } else {
      context = 'main';
    }
    
    links.push({
      href: resolvedUrl,
      text,
      ariaLabel: ariaMatch?.[1],
      title: titleMatch?.[1],
      context,
    });
  }
  
  return links;
}

/**
 * Extract main content text from HTML (strip nav, footer, scripts, styles)
 */
function extractMainText(html: string): string {
  let text = html;
  
  // Remove script, style, nav, footer, header tags
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '');
  text = text.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');
  text = text.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');
  text = text.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');
  
  // Remove HTML comments
  text = text.replace(/<!--[\s\S]*?-->/g, '');
  
  // Remove all HTML tags
  text = text.replace(/<[^>]+>/g, ' ');
  
  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&#x27;/g, "'");
  text = text.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec)));
  
  // Collapse whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
}

// ============================================================================
// MENU EXTRACTOR
// ============================================================================

/**
 * Menu URL patterns ranked by confidence
 */
const MENU_PATTERNS: { pattern: RegExp; confidence: ExtractorConfidence; reason: string }[] = [
  // Exact path matches (highest confidence)
  { pattern: /^\/menu\/?$/i, confidence: 1, reason: 'Exact /menu path' },
  { pattern: /^\/menus?\/?$/i, confidence: 1, reason: 'Exact /menu(s) path' },
  
  // Specific menu types
  { pattern: /\/dinner-menu/i, confidence: 1, reason: '/dinner-menu path' },
  { pattern: /\/lunch-menu/i, confidence: 1, reason: '/lunch-menu path' },
  { pattern: /\/food-menu/i, confidence: 1, reason: '/food-menu path' },
  { pattern: /\/brunch-menu/i, confidence: 0.75, reason: '/brunch-menu path' },
  
  // Menu in path
  { pattern: /\/menu[-_]?/i, confidence: 0.75, reason: 'Menu in path' },
  
  // PDF menus
  { pattern: /menu[^/]*\.pdf$/i, confidence: 0.5, reason: 'PDF with menu in filename' },
  
  // Food/eat paths (weaker signal)
  { pattern: /^\/food\/?$/i, confidence: 0.5, reason: '/food path' },
  { pattern: /^\/eat\/?$/i, confidence: 0.5, reason: '/eat path' },
];

/**
 * Menu link text patterns
 */
const MENU_TEXT_PATTERNS: { pattern: RegExp; confidence: ExtractorConfidence; reason: string }[] = [
  { pattern: /^menu$/i, confidence: 1, reason: 'Link text exactly "Menu"' },
  { pattern: /^menus$/i, confidence: 1, reason: 'Link text exactly "Menus"' },
  { pattern: /^menú$/i, confidence: 1, reason: 'Link text exactly "Menú" (Spanish)' },
  { pattern: /^menús$/i, confidence: 1, reason: 'Link text exactly "Menús" (Spanish)' },
  { pattern: /^food$/i, confidence: 0.75, reason: 'Link text "Food"' },
  { pattern: /^food\s*(?:&|and)\s*drink/i, confidence: 0.75, reason: 'Link text "Food & Drink"' },
  { pattern: /^comida$/i, confidence: 0.75, reason: 'Link text "Comida" (Spanish)' },
  { pattern: /dinner\s*menu/i, confidence: 0.75, reason: 'Link text contains "Dinner Menu"' },
  { pattern: /our\s*menu/i, confidence: 0.75, reason: 'Link text contains "Our Menu"' },
  { pattern: /view\s*menu/i, confidence: 0.75, reason: 'Link text contains "View Menu"' },
  { pattern: /see\s*menu/i, confidence: 0.75, reason: 'Link text contains "See Menu"' },
];

export function extractMenu(html: string, baseUrl: string): MenuExtractionResult {
  const links = extractLinks(html, baseUrl);
  
  let bestMatch: ExtractedLink | null = null;
  let bestConfidence: ExtractorConfidence = 0;
  
  for (const link of links) {
    const path = new URL(link.href).pathname;
    
    // Check URL patterns
    for (const { pattern, confidence, reason } of MENU_PATTERNS) {
      if (pattern.test(path) && confidence > bestConfidence) {
        bestMatch = {
          url: link.href,
          sourceUrl: baseUrl,
          confidence,
          reason,
        };
        bestConfidence = confidence;
      }
    }
    
    // Check link text patterns
    const textToCheck = link.text || link.ariaLabel || link.title || '';
    for (const { pattern, confidence, reason } of MENU_TEXT_PATTERNS) {
      if (pattern.test(textToCheck) && confidence > bestConfidence) {
        // Boost nav context
        const adjustedConfidence = link.context === 'nav' 
          ? Math.min(1, confidence + 0.25) as ExtractorConfidence
          : confidence;
        
        if (adjustedConfidence > bestConfidence) {
          bestMatch = {
            url: link.href,
            sourceUrl: baseUrl,
            confidence: adjustedConfidence,
            reason: `${reason}${link.context === 'nav' ? ' (in nav)' : ''}`,
          };
          bestConfidence = adjustedConfidence;
        }
      }
    }
  }
  
  return {
    menu: bestMatch,
    rawText: null, // Will be populated after fetching menu page
  };
}

// ============================================================================
// WINE LIST EXTRACTOR
// ============================================================================

const WINE_PATTERNS: { pattern: RegExp; confidence: ExtractorConfidence; reason: string }[] = [
  // Exact matches
  { pattern: /^\/wine[-_]?list\/?$/i, confidence: 1, reason: 'Exact /wine-list path' },
  { pattern: /^\/wines?\/?$/i, confidence: 1, reason: 'Exact /wine(s) path' },
  
  // Specific paths
  { pattern: /\/wine[-_]?list/i, confidence: 0.75, reason: '/wine-list in path' },
  { pattern: /\/beverage[-_]?program/i, confidence: 0.75, reason: '/beverage-program path' },
  { pattern: /\/beverages?\/?$/i, confidence: 0.75, reason: '/beverage(s) path' },
  { pattern: /\/drinks?\/?$/i, confidence: 0.5, reason: '/drink(s) path' },
  
  // PDFs
  { pattern: /wine[^/]*\.pdf$/i, confidence: 0.5, reason: 'PDF with wine in filename' },
  { pattern: /beverage[^/]*\.pdf$/i, confidence: 0.5, reason: 'PDF with beverage in filename' },
];

const WINE_TEXT_PATTERNS: { pattern: RegExp; confidence: ExtractorConfidence; reason: string }[] = [
  { pattern: /^wine\s*list$/i, confidence: 1, reason: 'Link text "Wine List"' },
  { pattern: /^wines?$/i, confidence: 1, reason: 'Link text "Wine(s)"' },
  { pattern: /^beverage\s*program$/i, confidence: 0.75, reason: 'Link text "Beverage Program"' },
  { pattern: /^beverages?$/i, confidence: 0.75, reason: 'Link text "Beverage(s)"' },
  { pattern: /^drinks?$/i, confidence: 0.5, reason: 'Link text "Drink(s)"' },
  { pattern: /our\s*wines?/i, confidence: 0.75, reason: 'Link text "Our Wine(s)"' },
  { pattern: /wine\s*(?:&|and)\s*beer/i, confidence: 0.5, reason: 'Link text "Wine & Beer"' },
];

export function extractWineList(html: string, baseUrl: string): WineListExtractionResult {
  const links = extractLinks(html, baseUrl);
  
  let bestMatch: ExtractedLink | null = null;
  let bestConfidence: ExtractorConfidence = 0;
  
  for (const link of links) {
    const path = new URL(link.href).pathname;
    
    // Check URL patterns
    for (const { pattern, confidence, reason } of WINE_PATTERNS) {
      if (pattern.test(path) && confidence > bestConfidence) {
        bestMatch = {
          url: link.href,
          sourceUrl: baseUrl,
          confidence,
          reason,
        };
        bestConfidence = confidence;
      }
    }
    
    // Check link text patterns
    const textToCheck = link.text || link.ariaLabel || link.title || '';
    for (const { pattern, confidence, reason } of WINE_TEXT_PATTERNS) {
      if (pattern.test(textToCheck) && confidence > bestConfidence) {
        const adjustedConfidence = link.context === 'nav' 
          ? Math.min(1, confidence + 0.25) as ExtractorConfidence
          : confidence;
        
        if (adjustedConfidence > bestConfidence) {
          bestMatch = {
            url: link.href,
            sourceUrl: baseUrl,
            confidence: adjustedConfidence,
            reason: `${reason}${link.context === 'nav' ? ' (in nav)' : ''}`,
          };
          bestConfidence = adjustedConfidence;
        }
      }
    }
  }
  
  return {
    wineList: bestMatch,
    rawText: null,
  };
}

// ============================================================================
// ABOUT PAGE EXTRACTOR
// ============================================================================

const ABOUT_PATTERNS: { pattern: RegExp; confidence: ExtractorConfidence; reason: string }[] = [
  { pattern: /^\/about\/?$/i, confidence: 1, reason: 'Exact /about path' },
  { pattern: /^\/about[-_]us\/?$/i, confidence: 1, reason: '/about-us path' },
  { pattern: /^\/our[-_]story\/?$/i, confidence: 1, reason: '/our-story path' },
  { pattern: /^\/historia\/?$/i, confidence: 1, reason: '/historia path (Spanish)' },
  { pattern: /^\/nuestra[-_]historia\/?$/i, confidence: 1, reason: '/nuestra-historia path (Spanish)' },
  { pattern: /^\/story\/?$/i, confidence: 0.75, reason: '/story path' },
  { pattern: /^\/philosophy\/?$/i, confidence: 0.75, reason: '/philosophy path' },
  { pattern: /^\/who[-_]we[-_]are\/?$/i, confidence: 0.75, reason: '/who-we-are path' },
  { pattern: /^\/the[-_]restaurant\/?$/i, confidence: 0.5, reason: '/the-restaurant path' },
];

const ABOUT_TEXT_PATTERNS: { pattern: RegExp; confidence: ExtractorConfidence; reason: string }[] = [
  { pattern: /^about$/i, confidence: 1, reason: 'Link text "About"' },
  { pattern: /^about\s*us$/i, confidence: 1, reason: 'Link text "About Us"' },
  { pattern: /^our\s*story$/i, confidence: 1, reason: 'Link text "Our Story"' },
  { pattern: /^historia$/i, confidence: 1, reason: 'Link text "Historia" (Spanish)' },
  { pattern: /^nuestra\s*historia$/i, confidence: 1, reason: 'Link text "Nuestra Historia" (Spanish)' },
  { pattern: /^the\s*story$/i, confidence: 0.75, reason: 'Link text "The Story"' },
  { pattern: /^philosophy$/i, confidence: 0.75, reason: 'Link text "Philosophy"' },
  { pattern: /^who\s*we\s*are$/i, confidence: 0.75, reason: 'Link text "Who We Are"' },
];

export function discoverAboutPage(html: string, baseUrl: string): AboutPageDiscoveryResult {
  const links = extractLinks(html, baseUrl);
  
  let bestMatch: ExtractedLink | null = null;
  let bestConfidence: ExtractorConfidence = 0;
  
  for (const link of links) {
    const path = new URL(link.href).pathname;
    
    for (const { pattern, confidence, reason } of ABOUT_PATTERNS) {
      if (pattern.test(path) && confidence > bestConfidence) {
        bestMatch = {
          url: link.href,
          sourceUrl: baseUrl,
          confidence,
          reason,
        };
        bestConfidence = confidence;
      }
    }
    
    const textToCheck = link.text || link.ariaLabel || link.title || '';
    for (const { pattern, confidence, reason } of ABOUT_TEXT_PATTERNS) {
      if (pattern.test(textToCheck) && confidence > bestConfidence) {
        const adjustedConfidence = link.context === 'nav' 
          ? Math.min(1, confidence + 0.25) as ExtractorConfidence
          : confidence;
        
        if (adjustedConfidence > bestConfidence) {
          bestMatch = {
            url: link.href,
            sourceUrl: baseUrl,
            confidence: adjustedConfidence,
            reason: `${reason}${link.context === 'nav' ? ' (in nav)' : ''}`,
          };
          bestConfidence = adjustedConfidence;
        }
      }
    }
  }
  
  return { aboutLink: bestMatch };
}

export function extractAboutCopy(html: string, sourceUrl: string): AboutCopyExtractionResult {
  const text = extractMainText(html);
  
  // Basic quality check - about pages should have meaningful content
  if (text.length < 50) {
    return { about: null };
  }
  
  // Truncate if excessively long (likely scraped unwanted content)
  const truncatedText = text.length > 5000 ? text.slice(0, 5000) + '...' : text;
  
  return {
    about: {
      text: truncatedText,
      sourceUrl,
      confidence: 0.75, // About extraction is generally reliable once we have the page
      reason: 'Main content extracted from about page',
    },
  };
}

/**
 * Extract raw text from a menu or wine list page for AI processing
 */
export function extractPageRawText(html: string): string {
  return extractMainText(html);
}
