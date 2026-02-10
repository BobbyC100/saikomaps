/**
 * Saiko Maps — Menu & Wine List Scraper
 * 
 * Scrapes restaurant websites to extract identity signals:
 * - Menu URLs and raw content
 * - Wine list URLs and raw content  
 * - About page copy
 * 
 * Usage:
 *   npx tsx scripts/scrape-menus-from-websites.ts [options]
 * 
 * Options:
 *   --dry-run     Don't write to database
 *   --limit=N     Process only N records
 *   --verbose     Show detailed extraction info
 *   --place=NAME  Process single place by name (for testing)
 * 
 * Examples:
 *   npx tsx scripts/scrape-menus-from-websites.ts --dry-run --limit=10
 *   npx tsx scripts/scrape-menus-from-websites.ts --place="Donna's"
 *   npx tsx scripts/scrape-menus-from-websites.ts --verbose
 */

import { PrismaClient } from '@prisma/client';
import {
  GoldenRecordInput,
  WebsiteIdentitySnapshot,
  ScrapeStatus,
} from '../lib/website-crawler/types';
import {
  extractMenu,
  extractWineList,
  discoverAboutPage,
  extractAboutCopy,
  extractPageRawText,
} from '../lib/website-crawler/extractors';
import {
  fetchHybrid,
  fetchDiscoveredPage,
  processBatches,
  DEFAULT_CONFIG,
} from '../lib/website-crawler/fetcher';

// ============================================================================
// CLI ARGUMENT PARSING
// ============================================================================

interface CliArgs {
  dryRun: boolean;
  limit: number | null;
  verbose: boolean;
  placeName: string | null;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  
  return {
    dryRun: args.includes('--dry-run'),
    limit: args.find(a => a.startsWith('--limit='))
      ? parseInt(args.find(a => a.startsWith('--limit='))!.split('=')[1])
      : null,
    verbose: args.includes('--verbose'),
    placeName: args.find(a => a.startsWith('--place='))
      ? args.find(a => a.startsWith('--place='))!.split('=')[1].replace(/"/g, '')
      : null,
  };
}

// ============================================================================
// SCRAPER CORE
// ============================================================================

const prisma = new PrismaClient();

/**
 * Scrape a single place and return the identity snapshot
 * 
 * OPTIMIZATION: Parallelize discovered page fetches
 */
async function scrapePlace(
  record: GoldenRecordInput,
  verbose: boolean
): Promise<WebsiteIdentitySnapshot> {
  const startTime = Date.now();
  
  // No website? Nothing to do.
  if (!record.website) {
    return {
      scrapedAt: new Date(),
      scrapeStatus: 'no_website',
    };
  }

  if (verbose) {
    console.log(`\n  Fetching: ${record.website}`);
  }

  // Step 1: Fetch homepage and /about in parallel
  const { homepage, aboutPage } = await fetchHybrid(record.website, DEFAULT_CONFIG);

  if (homepage.status !== 'ok' || !homepage.html) {
    const status: ScrapeStatus = 
      homepage.status === 'blocked' ? 'blocked' :
      homepage.status === 'timeout' ? 'timeout' : 'failed';
    
    return {
      scrapedAt: new Date(),
      scrapeStatus: status,
      errorMessage: homepage.errorMessage,
    };
  }

  // Step 2: Extract links from homepage
  const menuResult = extractMenu(homepage.html, homepage.finalUrl);
  const wineListResult = extractWineList(homepage.html, homepage.finalUrl);
  const aboutDiscovery = discoverAboutPage(homepage.html, homepage.finalUrl);

  if (verbose) {
    console.log(`    Menu link: ${menuResult.menu?.url || 'not found'}`);
    console.log(`    Wine list: ${wineListResult.wineList?.url || 'not found'}`);
    console.log(`    About link: ${aboutDiscovery.aboutLink?.url || 'not found'}`);
  }

  // Step 3: Fetch discovered pages IN PARALLEL (optimization!)
  const pageFetches = [];
  
  if (menuResult.menu) {
    pageFetches.push(
      fetchDiscoveredPage(menuResult.menu.url, DEFAULT_CONFIG).then(result => ({ type: 'menu', result }))
    );
  }
  
  if (wineListResult.wineList) {
    pageFetches.push(
      fetchDiscoveredPage(wineListResult.wineList.url, DEFAULT_CONFIG).then(result => ({ type: 'wine', result }))
    );
  }
  
  // Only fetch discovered about link if we don't already have it from hybrid fetch
  if (!aboutPage && aboutDiscovery.aboutLink) {
    pageFetches.push(
      fetchDiscoveredPage(aboutDiscovery.aboutLink.url, DEFAULT_CONFIG).then(result => ({ type: 'about', result }))
    );
  }

  const fetchedPages = await Promise.all(pageFetches);

  // Step 4: Build snapshot from fetched pages
  const snapshot: WebsiteIdentitySnapshot = {
    scrapedAt: new Date(),
    scrapeStatus: 'success',
  };

  // Process menu page
  const menuFetch = fetchedPages.find(p => p.type === 'menu');
  if (menuFetch && menuFetch.result.status === 'ok' && menuFetch.result.html) {
    snapshot.menu = menuResult.menu!;
    snapshot.menuRawText = extractPageRawText(menuFetch.result.html);
    if (verbose) {
      console.log(`    Menu text: ${snapshot.menuRawText?.slice(0, 100)}...`);
    }
  }

  // Process wine list page
  const wineFetch = fetchedPages.find(p => p.type === 'wine');
  if (wineFetch && wineFetch.result.status === 'ok' && wineFetch.result.html) {
    snapshot.wineList = wineListResult.wineList!;
    snapshot.wineListRawText = extractPageRawText(wineFetch.result.html);
    if (verbose) {
      console.log(`    Wine text: ${snapshot.wineListRawText?.slice(0, 100)}...`);
    }
  }

  // Process about page (prefer direct fetch, fall back to discovered)
  let aboutHtml: string | null = null;
  let aboutSourceUrl: string | null = null;

  if (aboutPage?.html) {
    // Direct /about fetch succeeded
    aboutHtml = aboutPage.html;
    aboutSourceUrl = aboutPage.finalUrl;
  } else {
    const aboutFetch = fetchedPages.find(p => p.type === 'about');
    if (aboutFetch && aboutFetch.result.status === 'ok' && aboutFetch.result.html) {
      aboutHtml = aboutFetch.result.html;
      aboutSourceUrl = aboutFetch.result.finalUrl;
    }
  }

  if (aboutHtml && aboutSourceUrl) {
    const aboutCopy = extractAboutCopy(aboutHtml, aboutSourceUrl);
    if (aboutCopy.about) {
      snapshot.about = aboutCopy.about;
      if (verbose) {
        console.log(`    About text: ${snapshot.about.text.slice(0, 100)}...`);
      }
    }
  }

  // Determine final status
  const hasAnyExtraction = snapshot.menu || snapshot.wineList || snapshot.about;
  const hasAllExtractions = snapshot.menu && snapshot.about; // wine list is optional
  
  if (!hasAnyExtraction) {
    snapshot.scrapeStatus = 'partial'; // Got HTML but no extractions
  } else if (!hasAllExtractions) {
    snapshot.scrapeStatus = 'partial';
  }

  if (verbose) {
    const elapsed = Date.now() - startTime;
    console.log(`    Status: ${snapshot.scrapeStatus} (${elapsed}ms)`);
  }

  return snapshot;
}

/**
 * Sanitize text for PostgreSQL UTF-8 storage
 * Removes null bytes and other problematic characters
 */
function sanitizeText(text: string | null | undefined): string | null {
  if (!text) return null;
  // Remove null bytes and other control characters that PostgreSQL rejects
  return text.replace(/\x00/g, '').replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, '');
}

/**
 * Write snapshot to database
 */
async function writeSnapshot(
  canonicalId: string,
  snapshot: WebsiteIdentitySnapshot,
  dryRun: boolean
): Promise<void> {
  if (dryRun) return;

  await prisma.golden_records.update({
    where: { canonical_id: canonicalId },
    data: {
      menu_url: snapshot.menu?.url ?? null,
      menu_source_url: snapshot.menu?.sourceUrl ?? null,
      menu_raw_text: sanitizeText(snapshot.menuRawText),
      
      winelist_url: snapshot.wineList?.url ?? null,
      winelist_source_url: snapshot.wineList?.sourceUrl ?? null,
      winelist_raw_text: sanitizeText(snapshot.wineListRawText),
      
      about_copy: sanitizeText(snapshot.about?.text),
      about_source_url: snapshot.about?.sourceUrl ?? null,
      
      scraped_at: snapshot.scrapedAt,
      scrape_status: snapshot.scrapeStatus,
      
      updated_at: new Date(),
    },
  });
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  const args = parseArgs();
  
  console.log('\n🍽️  Saiko Maps — Menu & Wine List Scraper');
  console.log('=========================================');
  if (args.dryRun) console.log('🔸 DRY RUN MODE — no database writes');
  if (args.limit) console.log(`🔸 Limit: ${args.limit} records`);
  if (args.placeName) console.log(`🔸 Single place: "${args.placeName}"`);
  if (args.verbose) console.log('🔸 Verbose mode enabled');
  console.log('');

  // Fetch records (skip already scraped places unless doing a specific place)
  const whereClause: any = {
    website: { not: null },
    county: 'Los Angeles',
  };

  // Skip already scraped places (unless testing a specific place)
  if (!args.placeName) {
    whereClause.scraped_at = null;
  } else {
    whereClause.name = { contains: args.placeName, mode: 'insensitive' };
  }

  const records = await prisma.golden_records.findMany({
    where: whereClause,
    select: {
      canonical_id: true,
      name: true,
      website: true,
      neighborhood: true,
    },
    orderBy: { name: 'asc' },
    take: args.limit ?? undefined,
  });

  console.log(`📍 Found ${records.length} places with websites\n`);

  if (records.length === 0) {
    console.log('No records to process. Exiting.');
    return;
  }

  // Stats tracking
  const stats = {
    processed: 0,
    success: 0,
    partial: 0,
    failed: 0,
    blocked: 0,
    timeout: 0,
    menuFound: 0,
    wineListFound: 0,
    aboutFound: 0,
  };

  // Process all records
  const results = await processBatches(
    records as GoldenRecordInput[],
    async (record, index) => {
      const prefix = `[${index + 1}/${records.length}]`;
      console.log(`${prefix} ${record.name}`);

      const snapshot = await scrapePlace(record, args.verbose);
      await writeSnapshot(record.canonical_id, snapshot, args.dryRun);

      // Update stats
      stats.processed++;
      if (snapshot.scrapeStatus === 'success') stats.success++;
      else if (snapshot.scrapeStatus === 'partial') stats.partial++;
      else if (snapshot.scrapeStatus === 'blocked') stats.blocked++;
      else if (snapshot.scrapeStatus === 'timeout') stats.timeout++;
      else stats.failed++;

      if (snapshot.menu) stats.menuFound++;
      if (snapshot.wineList) stats.wineListFound++;
      if (snapshot.about) stats.aboutFound++;

      return snapshot;
    },
    DEFAULT_CONFIG,
    (completed, total) => {
      // Progress is logged in the processor
    }
  );

  // Print summary
  console.log('\n=========================================');
  console.log('📊 SCRAPE SUMMARY');
  console.log('=========================================');
  console.log(`Total processed:  ${stats.processed}`);
  console.log(`Success:          ${stats.success}`);
  console.log(`Partial:          ${stats.partial}`);
  console.log(`Failed:           ${stats.failed}`);
  console.log(`Blocked:          ${stats.blocked}`);
  console.log(`Timeout:          ${stats.timeout}`);
  console.log('');
  console.log(`Menu URLs found:      ${stats.menuFound} (${((stats.menuFound / stats.processed) * 100).toFixed(1)}%)`);
  console.log(`Wine list URLs found: ${stats.wineListFound} (${((stats.wineListFound / stats.processed) * 100).toFixed(1)}%)`);
  console.log(`About copy found:     ${stats.aboutFound} (${((stats.aboutFound / stats.processed) * 100).toFixed(1)}%)`);
  console.log('=========================================\n');

  if (args.dryRun) {
    console.log('🔸 DRY RUN — no changes written to database');
  } else {
    console.log('✅ Database updated');
  }
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
