/**
 * Saiko Maps — Instagram Handle Scraper
 * 
 * Fetches websites from golden_records where:
 * - website exists
 * - instagram_handle is NULL
 * - county = 'Los Angeles'
 * 
 * Extracts Instagram links from HTML and updates the database.
 * 
 * Usage:
 *   npx tsx scripts/scrape-instagram-from-websites.ts
 *   npx tsx scripts/scrape-instagram-from-websites.ts --dry-run
 *   npx tsx scripts/scrape-instagram-from-websites.ts --limit=50
 *   npx tsx scripts/scrape-instagram-from-websites.ts --batch-size=10 --delay=2000
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================================
// CONFIG
// ============================================================================

const CONFIG = {
  // Rate limiting
  REQUEST_DELAY_MS: 1500,      // Delay between requests (ms)
  BATCH_SIZE: 20,              // Process in batches
  BATCH_DELAY_MS: 5000,        // Delay between batches
  REQUEST_TIMEOUT_MS: 10000,   // Timeout per request

  // Retry logic
  MAX_RETRIES: 2,
  RETRY_DELAY_MS: 3000,

  // User agent rotation
  USER_AGENTS: [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  ],
};

// ============================================================================
// TYPES
// ============================================================================

interface ScrapeResult {
  canonical_id: string;
  name: string;
  website: string;
  instagramHandle: string | null;
  status: 'found' | 'not_found' | 'error' | 'invalid_url';
  error?: string;
}

interface Stats {
  total: number;
  found: number;
  notFound: number;
  errors: number;
  invalidUrls: number;
  updated: number;
}

// ============================================================================
// INSTAGRAM EXTRACTION
// ============================================================================

/**
 * Extract Instagram handle from HTML content
 * Looks for instagram.com links and extracts the username
 */
function extractInstagramHandle(html: string): string | null {
  // Patterns to match Instagram URLs
  const patterns = [
    // Standard instagram.com links
    /https?:\/\/(?:www\.)?instagram\.com\/([a-zA-Z0-9_.]+)\/?/gi,
    // With query params
    /https?:\/\/(?:www\.)?instagram\.com\/([a-zA-Z0-9_.]+)\?[^"'\s]*/gi,
    // href attribute specifically
    /href=["']https?:\/\/(?:www\.)?instagram\.com\/([a-zA-Z0-9_.]+)\/?["']/gi,
    // instagr.am short links
    /https?:\/\/instagr\.am\/([a-zA-Z0-9_.]+)\/?/gi,
  ];

  const foundHandles: string[] = [];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const handle = match[1].toLowerCase();
      
      // Skip common non-profile pages and template/platform accounts
      const skipHandles = [
        'p', 'reel', 'reels', 'stories', 'explore', 'accounts',
        'about', 'legal', 'privacy', 'terms', 'help', 'api',
        'developer', 'press', 'jobs', 'blog', 'share', 'direct',
        'tv', 'igtv', 'live', 'guides', 'nametag', 'qr', 'web',
        'squarespace', 'wix', 'wordpress', 'shopify', 'godaddy',
      ];
      
      if (skipHandles.includes(handle)) continue;
      
      // Validate handle format (Instagram rules)
      if (handle.length < 1 || handle.length > 30) continue;
      if (/^[0-9]/.test(handle)) continue; // Can't start with number
      if (!/^[a-z0-9_.]+$/.test(handle)) continue;
      
      foundHandles.push(handle);
    }
  }

  // Return the most common handle found (in case of multiple)
  if (foundHandles.length === 0) return null;

  // Count occurrences
  const counts = foundHandles.reduce((acc, h) => {
    acc[h] = (acc[h] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Sort by count, return most common
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return sorted[0][0];
}

/**
 * Normalize and validate website URL
 */
function normalizeUrl(url: string): string | null {
  try {
    let normalized = url.trim();
    
    // Add protocol if missing
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = 'https://' + normalized;
    }
    
    // Validate URL
    const parsed = new URL(normalized);
    
    // Skip social media sites (we want their own website, not their FB page)
    const skipDomains = [
      'facebook.com', 'fb.com', 'instagram.com', 'twitter.com', 'x.com',
      'tiktok.com', 'youtube.com', 'linkedin.com', 'yelp.com',
      'tripadvisor.com', 'google.com', 'maps.google.com',
    ];
    
    if (skipDomains.some(d => parsed.hostname.includes(d))) {
      return null;
    }
    
    return parsed.href;
  } catch {
    return null;
  }
}

// ============================================================================
// HTTP FETCH WITH RETRY
// ============================================================================

function getRandomUserAgent(): string {
  return CONFIG.USER_AGENTS[Math.floor(Math.random() * CONFIG.USER_AGENTS.length)];
}

async function fetchWithRetry(url: string, retries = CONFIG.MAX_RETRIES): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS);

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

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      throw new Error(`Invalid content type: ${contentType}`);
    }

    return await response.text();
  } catch (error) {
    clearTimeout(timeout);
    
    if (retries > 0 && !(error instanceof Error && error.name === 'AbortError')) {
      await sleep(CONFIG.RETRY_DELAY_MS);
      return fetchWithRetry(url, retries - 1);
    }
    
    throw error;
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

function parseArgs(): { dryRun: boolean; limit: number | null; batchSize: number; delay: number } {
  const args = process.argv.slice(2);
  
  return {
    dryRun: args.includes('--dry-run'),
    limit: args.find(a => a.startsWith('--limit='))
      ? parseInt(args.find(a => a.startsWith('--limit='))!.split('=')[1])
      : null,
    batchSize: args.find(a => a.startsWith('--batch-size='))
      ? parseInt(args.find(a => a.startsWith('--batch-size='))!.split('=')[1])
      : CONFIG.BATCH_SIZE,
    delay: args.find(a => a.startsWith('--delay='))
      ? parseInt(args.find(a => a.startsWith('--delay='))!.split('=')[1])
      : CONFIG.REQUEST_DELAY_MS,
  };
}

// ============================================================================
// MAIN SCRAPER
// ============================================================================

async function scrapeInstagramHandles() {
  const startTime = Date.now();
  const { dryRun, limit, batchSize, delay } = parseArgs();

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║       SAIKO MAPS — INSTAGRAM HANDLE SCRAPER                ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE — No database updates will be made\n');
  }

  // Fetch records needing Instagram handles
  console.log('📊 Fetching golden records with websites but no Instagram...');
  
  const whereClause = {
    website: { not: null },
    instagram_handle: null,
    county: 'Los Angeles',
  };

  const records = await prisma.golden_records.findMany({
    where: whereClause,
    select: {
      canonical_id: true,
      name: true,
      website: true,
      neighborhood: true,
    },
    orderBy: { data_completeness: 'desc' }, // Prioritize most complete records
    take: limit || undefined,
  });

  console.log(`   Found ${records.length} records to process\n`);

  if (records.length === 0) {
    console.log('✅ No records need Instagram backfill!');
    await prisma.$disconnect();
    return;
  }

  // Process in batches
  const stats: Stats = {
    total: records.length,
    found: 0,
    notFound: 0,
    errors: 0,
    invalidUrls: 0,
    updated: 0,
  };

  const results: ScrapeResult[] = [];
  const batches = Math.ceil(records.length / batchSize);

  console.log(`⚙️  Processing ${batches} batches of ${batchSize} records\n`);
  console.log('─'.repeat(60));

  for (let batchIndex = 0; batchIndex < batches; batchIndex++) {
    const batchStart = batchIndex * batchSize;
    const batchRecords = records.slice(batchStart, batchStart + batchSize);
    
    console.log(`\n📦 Batch ${batchIndex + 1}/${batches}`);

    for (let i = 0; i < batchRecords.length; i++) {
      const record = batchRecords[i];
      const overallIndex = batchStart + i + 1;
      
      // Progress indicator
      const progress = Math.round((overallIndex / records.length) * 100);
      process.stdout.write(`\r   [${progress.toString().padStart(3)}%] ${record.name.substring(0, 35).padEnd(35)} `);

      // Normalize URL
      const url = normalizeUrl(record.website!);
      if (!url) {
        results.push({
          canonical_id: record.canonical_id,
          name: record.name,
          website: record.website!,
          instagramHandle: null,
          status: 'invalid_url',
        });
        stats.invalidUrls++;
        console.log('⚠️  Invalid URL');
        continue;
      }

      // Fetch and extract
      try {
        const html = await fetchWithRetry(url);
        const handle = extractInstagramHandle(html);

        if (handle) {
          results.push({
            canonical_id: record.canonical_id,
            name: record.name,
            website: url,
            instagramHandle: handle,
            status: 'found',
          });
          stats.found++;
          console.log(`✅ @${handle}`);

          // Update database
          if (!dryRun) {
            await prisma.golden_records.update({
              where: { canonical_id: record.canonical_id },
              data: {
                instagram_handle: handle,
                updated_at: new Date(),
              },
            });
            stats.updated++;
          }
        } else {
          results.push({
            canonical_id: record.canonical_id,
            name: record.name,
            website: url,
            instagramHandle: null,
            status: 'not_found',
          });
          stats.notFound++;
          console.log('—  No IG found');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({
          canonical_id: record.canonical_id,
          name: record.name,
          website: url,
          instagramHandle: null,
          status: 'error',
          error: errorMessage,
        });
        stats.errors++;
        console.log(`❌ ${errorMessage.substring(0, 30)}`);
      }

      // Rate limit delay
      if (i < batchRecords.length - 1) {
        await sleep(delay);
      }
    }

    // Batch delay
    if (batchIndex < batches - 1) {
      console.log(`\n   ⏳ Waiting ${CONFIG.BATCH_DELAY_MS / 1000}s before next batch...`);
      await sleep(CONFIG.BATCH_DELAY_MS);
    }
  }

  // ============================================================================
  // SUMMARY
  // ============================================================================

  const duration = Date.now() - startTime;

  console.log('\n\n' + '═'.repeat(60));
  console.log('                         SUMMARY');
  console.log('═'.repeat(60));
  console.log(`
   Total processed:    ${stats.total}
   ✅ Instagram found: ${stats.found} (${Math.round((stats.found / stats.total) * 100)}%)
   —  Not found:       ${stats.notFound}
   ⚠️  Invalid URLs:    ${stats.invalidUrls}
   ❌ Errors:          ${stats.errors}
   ${dryRun ? '🔍 Dry run' : `💾 Updated:`}         ${stats.updated}
   
   ⏱️  Duration:        ${formatDuration(duration)}
   📈 Rate:            ${(stats.total / (duration / 1000 / 60)).toFixed(1)} records/min
  `);

  // Output found handles for review
  if (stats.found > 0) {
    console.log('─'.repeat(60));
    console.log('                   FOUND HANDLES');
    console.log('─'.repeat(60));
    
    const foundResults = results.filter(r => r.status === 'found');
    for (const result of foundResults.slice(0, 20)) {
      console.log(`   ${result.name.padEnd(30)} @${result.instagramHandle}`);
    }
    if (foundResults.length > 20) {
      console.log(`   ... and ${foundResults.length - 20} more`);
    }
  }

  // Output errors for debugging
  if (stats.errors > 0) {
    console.log('\n' + '─'.repeat(60));
    console.log('                   ERRORS (first 10)');
    console.log('─'.repeat(60));
    
    const errorResults = results.filter(r => r.status === 'error');
    for (const result of errorResults.slice(0, 10)) {
      console.log(`   ${result.name.substring(0, 25).padEnd(25)} ${result.error}`);
    }
  }

  console.log('\n' + '═'.repeat(60) + '\n');

  await prisma.$disconnect();
}

// ============================================================================
// RUN
// ============================================================================

scrapeInstagramHandles().catch(async (error) => {
  console.error('\n❌ Fatal error:', error);
  await prisma.$disconnect();
  process.exit(1);
});
