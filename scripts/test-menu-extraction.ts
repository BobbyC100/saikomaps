/**
 * Test menu/wine list extraction on a specific website
 * 
 * Usage:
 *   npx tsx scripts/test-menu-extraction.ts https://www.donnasla.com/
 */

const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

async function fetchWithTimeout(url: string, timeoutMs = 10000): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
      },
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.text();
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

// ============================================================================
// EXTRACTION PATTERNS
// ============================================================================

/**
 * Extract menu URL from HTML
 */
function extractMenuUrl(html: string, baseUrl: string): string | null {
  const base = new URL(baseUrl);
  
  // Pattern 1: Direct href links containing menu keywords
  const menuLinkPatterns = [
    // Standard menu links
    /href=["']([^"']*(?:menu|food-menu|dinner-menu|lunch-menu|breakfast-menu)[^"']*)["']/gi,
    // PDF menu links
    /href=["']([^"']*\.pdf[^"']*)["'][^>]*(?:menu|food)/gi,
    // Nav items with menu text
    /<a[^>]*href=["']([^"']*)["'][^>]*>(?:[^<]*(?:menu|food|dinner)[^<]*)<\/a>/gi,
  ];

  const foundUrls: string[] = [];

  for (const pattern of menuLinkPatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const url = match[1];
      if (url && !url.startsWith('#') && !url.includes('instagram') && !url.includes('facebook')) {
        foundUrls.push(url);
      }
    }
  }

  // Pattern 2: Look for common menu path patterns in any href
  const commonMenuPaths = ['/menu', '/food', '/dinner', '/lunch', '/food-menu', '/dinner-menu'];
  const hrefPattern = /href=["']([^"']*)["']/gi;
  let match;
  while ((match = hrefPattern.exec(html)) !== null) {
    const url = match[1].toLowerCase();
    if (commonMenuPaths.some(path => url.includes(path)) && !url.includes('instagram')) {
      foundUrls.push(match[1]);
    }
  }

  if (foundUrls.length === 0) return null;

  // Convert to absolute URLs and dedupe
  const absoluteUrls = Array.from(new Set(
    foundUrls.map(url => {
      try {
        return new URL(url, base).href;
      } catch {
        return null;
      }
    }).filter(Boolean) as string[]
  ));

  // Prefer shorter, cleaner URLs
  absoluteUrls.sort((a, b) => a.length - b.length);
  
  return absoluteUrls[0] || null;
}

/**
 * Extract wine list URL from HTML
 */
function extractWineListUrl(html: string, baseUrl: string): string | null {
  const base = new URL(baseUrl);
  
  const wineLinkPatterns = [
    /href=["']([^"']*(?:wine|wine-list|beverage|drinks)[^"']*)["']/gi,
    /href=["']([^"']*\.pdf[^"']*)["'][^>]*(?:wine|beverage)/gi,
    /<a[^>]*href=["']([^"']*)["'][^>]*>(?:[^<]*(?:wine|drinks|beverage)[^<]*)<\/a>/gi,
  ];

  const foundUrls: string[] = [];

  for (const pattern of wineLinkPatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const url = match[1];
      if (url && !url.startsWith('#') && !url.includes('instagram') && !url.includes('facebook')) {
        foundUrls.push(url);
      }
    }
  }

  if (foundUrls.length === 0) return null;

  const absoluteUrls = Array.from(new Set(
    foundUrls.map(url => {
      try {
        return new URL(url, base).href;
      } catch {
        return null;
      }
    }).filter(Boolean) as string[]
  ));

  absoluteUrls.sort((a, b) => a.length - b.length);
  
  return absoluteUrls[0] || null;
}

/**
 * Extract about page URL from HTML
 */
function extractAboutUrl(html: string, baseUrl: string): string | null {
  const base = new URL(baseUrl);
  
  const aboutLinkPatterns = [
    /href=["']([^"']*(?:about|our-story|philosophy|our-team|about-us|historia|nuestra-historia)[^"']*)["']/gi,
    /<a[^>]*href=["']([^"']*)["'][^>]*>(?:[^<]*(?:about|our story|philosophy|historia)[^<]*)<\/a>/gi,
  ];

  const foundUrls: string[] = [];

  for (const pattern of aboutLinkPatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const url = match[1];
      if (url && !url.startsWith('#') && !url.includes('instagram') && !url.includes('facebook')) {
        foundUrls.push(url);
      }
    }
  }

  if (foundUrls.length === 0) return null;

  const absoluteUrls = Array.from(new Set(
    foundUrls.map(url => {
      try {
        return new URL(url, base).href;
      } catch {
        return null;
      }
    }).filter(Boolean) as string[]
  ));

  absoluteUrls.sort((a, b) => a.length - b.length);
  
  return absoluteUrls[0] || null;
}

/**
 * Extract clean text content from HTML (strip nav, footer, scripts)
 */
function extractTextContent(html: string): string {
  // Remove scripts, styles, nav, footer
  let cleaned = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '');
  
  // Remove all HTML tags
  cleaned = cleaned.replace(/<[^>]+>/g, ' ');
  
  // Decode HTML entities
  cleaned = cleaned
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–');
  
  // Collapse whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}

// ============================================================================
// MAIN TEST
// ============================================================================

async function testExtraction() {
  const url = process.argv[2] || 'https://www.donnasla.com/';
  
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║       MENU/WINE LIST EXTRACTION TEST                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log(`🌐 Testing: ${url}\n`);

  try {
    // Fetch homepage
    console.log('📥 Fetching homepage...');
    const html = await fetchWithTimeout(url);
    console.log(`   ✓ Fetched ${(html.length / 1024).toFixed(1)}kb\n`);

    // Extract URLs
    console.log('🔍 Extracting links...\n');
    
    const menuUrl = extractMenuUrl(html, url);
    const wineUrl = extractWineListUrl(html, url);
    const aboutUrl = extractAboutUrl(html, url);

    console.log('─'.repeat(60));
    console.log('RESULTS');
    console.log('─'.repeat(60));
    console.log(`Menu URL:      ${menuUrl || '❌ Not found'}`);
    console.log(`Wine List URL: ${wineUrl || '❌ Not found'}`);
    console.log(`About URL:     ${aboutUrl || '❌ Not found'}`);
    console.log('─'.repeat(60));

    // Try to fetch menu page if found
    if (menuUrl) {
      console.log('\n📄 Fetching menu page...');
      try {
        const menuHtml = await fetchWithTimeout(menuUrl);
        const menuText = extractTextContent(menuHtml);
        console.log(`   ✓ Fetched ${(menuHtml.length / 1024).toFixed(1)}kb`);
        console.log(`   ✓ Extracted ${menuText.length} chars of text`);
        console.log('\n   Preview (first 500 chars):');
        console.log('   ' + menuText.substring(0, 500).replace(/\n/g, '\n   ') + '...\n');
      } catch (error) {
        console.log(`   ❌ Error: ${error}`);
      }
    }

    // Try to fetch about page if found
    if (aboutUrl) {
      console.log('\n📖 Fetching about page...');
      try {
        const aboutHtml = await fetchWithTimeout(aboutUrl);
        const aboutText = extractTextContent(aboutHtml);
        console.log(`   ✓ Fetched ${(aboutHtml.length / 1024).toFixed(1)}kb`);
        console.log(`   ✓ Extracted ${aboutText.length} chars of text`);
        console.log('\n   Preview (first 500 chars):');
        console.log('   ' + aboutText.substring(0, 500).replace(/\n/g, '\n   ') + '...\n');
      } catch (error) {
        console.log(`   ❌ Error: ${error}`);
      }
    }

    console.log('✅ Test complete!\n');

  } catch (error) {
    console.error(`\n❌ Error: ${error}\n`);
    process.exit(1);
  }
}

testExtraction();
