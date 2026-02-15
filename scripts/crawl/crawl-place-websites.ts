/**
 * Saiko Maps — Place Website Crawler (CHECKPOINT 5.12C+D)
 * 
 * Crawls place websites to extract:
 * - Instagram handles, phone, reservations (homepage)
 * - Menu URLs (from target pages)
 * - Wine list URLs (from target pages)
 * - About copy (from target pages)
 * 
 * CHECKPOINT 5.12C+D: Homepage + Target Page Fetching
 * - Fetches homepage + up to 3 candidate pages (menu/wine/about)
 * - Max 1 per type, max 3 total per place
 * - Max 4 requests total per domain (1 homepage + 3 candidates)
 * - Domain lock: only fetches same-domain URLs
 * 
 * Safety:
 * - Global concurrency = 3
 * - Per-domain jitter 500-1200ms
 * - Per-domain request cap = 4
 * - Robots.txt checking (best-effort)
 * - Disk cache with 7-day TTL
 * 
 * Usage:
 *   tsx scripts/crawl/crawl-place-websites.ts --limit=10
 *   tsx scripts/crawl/crawl-place-websites.ts --max-pages-per-place=3
 *   tsx scripts/crawl/crawl-place-websites.ts --types=menu,wine,about
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { getOrFetch } from './lib/url-cache';
import { fetchHtml, waitForDomain, extractDomain } from './lib/html-fetcher';
import { checkRobots } from './lib/robots-checker';
import { parseHomepage, CandidateLink } from './lib/page-parser';
import { extractMenuUrl, extractWinelistUrl, extractAboutCopy } from './lib/target-parser';

const prisma = new PrismaClient();

// ============================================================================
// TYPES
// ============================================================================

interface PlaceInput {
  id: string;
  name: string;
  website: string;
  slug: string;
  neighborhood?: string | null;
}

interface PageFetch {
  placeId: string;
  placeName: string;
  baseUrl: string;
  pageType: 'menu' | 'wine' | 'about';
  pageUrl: string;
  finalUrl: string;
  status: 'success' | 'failed' | 'blocked';
  fromCache: boolean;
  bytes: number;
  blockedByRobots: boolean;
  notes: string;
  evidence: string;
}

interface CrawlResult {
  placeId: string;
  placeName: string;
  website: string;
  finalUrl: string;
  status: 'success' | 'robots_blocked' | 'fetch_failed' | 'no_website';
  instagram_url: string | null;
  phone: string | null;
  reservations_url: string | null;
  reservations_vendor: string | null;
  menu_url: string | null;
  menu_evidence: string | null;
  winelist_url: string | null;
  winelist_evidence: string | null;
  about_url: string | null;
  about_copy: string | null;
  about_evidence: string | null;
  candidateLinks: CandidateLink[];
  pageFetches: PageFetch[];
  evidence_json: any[];
  error?: string;
  fromCache: boolean;
}

interface Stats {
  total: number;
  success: number;
  robotsBlocked: number;
  fetchFailed: number;
  cacheHits: number;
  instagramFound: number;
  phoneFound: number;
  reservationsFound: number;
  menuFound: number;
  winelistFound: number;
  aboutFound: number;
  pagesFetched: number;
  pagesFromCache: number;
}

// ============================================================================
// CLI ARGUMENTS
// ============================================================================

interface CliArgs {
  limit: number | null;
  city: string | null;
  skipRobots: boolean;
  maxPagesPerPlace: number;
  types: ('menu' | 'wine' | 'about')[];
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  
  const maxPages = args.find(a => a.startsWith('--max-pages-per-place='))
    ? parseInt(args.find(a => a.startsWith('--max-pages-per-place='))!.split('=')[1])
    : 3;
  
  const typesArg = args.find(a => a.startsWith('--types='));
  const types = typesArg
    ? typesArg.split('=')[1].split(',').filter(t => ['menu', 'wine', 'about'].includes(t)) as ('menu' | 'wine' | 'about')[]
    : ['menu', 'wine', 'about'];
  
  return {
    limit: args.find(a => a.startsWith('--limit='))
      ? parseInt(args.find(a => a.startsWith('--limit='))!.split('=')[1])
      : null,
    city: args.find(a => a.startsWith('--city='))
      ? args.find(a => a.startsWith('--city='))!.split('=')[1]
      : null,
    skipRobots: args.includes('--skip-robots'),
    maxPagesPerPlace: maxPages,
    types,
  };
}

// ============================================================================
// CONCURRENCY CONTROL
// ============================================================================

class ConcurrencyController {
  private activeCount = 0;
  private queue: (() => void)[] = [];
  
  constructor(private maxConcurrent: number) {}
  
  async run<T>(fn: () => Promise<T>): Promise<T> {
    // Wait for slot
    while (this.activeCount >= this.maxConcurrent) {
      await new Promise<void>(resolve => this.queue.push(resolve));
    }
    
    this.activeCount++;
    
    try {
      return await fn();
    } finally {
      this.activeCount--;
      
      // Release next in queue
      const next = this.queue.shift();
      if (next) next();
    }
  }
  
  getActiveCount(): number {
    return this.activeCount;
  }
}

// ============================================================================
// DOMAIN LOCK
// ============================================================================

/**
 * Check if URL is same domain as base (with www. handling)
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

// ============================================================================
// CANDIDATE PAGE SELECTION
// ============================================================================

/**
 * Select candidate pages to fetch
 * - Max 1 per type
 * - Max maxPagesPerPlace total
 * - Only same-domain links
 */
function selectCandidatePages(
  candidates: CandidateLink[],
  finalUrl: string,
  maxPages: number,
  allowedTypes: ('menu' | 'wine' | 'about')[]
): CandidateLink[] {
  const selected: CandidateLink[] = [];
  const typesSeen = new Set<string>();
  
  // Filter to same-domain and allowed types
  const filtered = candidates.filter(c => 
    isSameDomain(c.url, finalUrl) && allowedTypes.includes(c.type as any)
  );
  
  // Sort by score descending
  filtered.sort((a, b) => b.score - a.score);
  
  // Select max 1 per type, up to maxPages total
  for (const candidate of filtered) {
    if (typesSeen.has(candidate.type)) continue;
    typesSeen.add(candidate.type);
    selected.push(candidate);
    if (selected.length >= maxPages) break;
  }
  
  return selected;
}

// ============================================================================
// CRAWL LOGIC
// ============================================================================

/**
 * Crawl a single place website (homepage + target pages)
 */
async function crawlPlace(
  place: PlaceInput,
  skipRobots: boolean,
  maxPagesPerPlace: number,
  allowedTypes: ('menu' | 'wine' | 'about')[]
): Promise<CrawlResult> {
  const result: CrawlResult = {
    placeId: place.id,
    placeName: place.name,
    website: place.website,
    finalUrl: place.website,
    status: 'fetch_failed',
    instagram_url: null,
    phone: null,
    reservations_url: null,
    reservations_vendor: null,
    menu_url: null,
    menu_evidence: null,
    winelist_url: null,
    winelist_evidence: null,
    about_url: null,
    about_copy: null,
    about_evidence: null,
    candidateLinks: [],
    pageFetches: [],
    evidence_json: [],
    fromCache: false,
  };
  
  // Check robots.txt
  if (!skipRobots) {
    const robotsCheck = await checkRobots(place.website);
    if (robotsCheck.status === 'disallowed') {
      result.status = 'robots_blocked';
      result.error = robotsCheck.reason;
      return result;
    }
  }
  
  // Enforce per-domain delay
  await waitForDomain(place.website);
  
  // Fetch homepage with cache
  const fetchResult = await getOrFetch(
    place.website,
    async (url, conditionalHeaders) => {
      return await fetchHtml(url, { conditionalHeaders });
    },
    { ttlDays: 7 }
  );
  
  result.fromCache = fetchResult.fromCache;
  result.finalUrl = fetchResult.finalUrl;
  
  // Handle fetch failure
  if (!fetchResult.html || fetchResult.status !== 200) {
    result.status = 'fetch_failed';
    result.error = fetchResult.error || `HTTP ${fetchResult.status}`;
    return result;
  }
  
  // Parse homepage
  const parsed = parseHomepage(fetchResult.html, fetchResult.finalUrl);
  
  result.status = 'success';
  result.instagram_url = parsed.instagram_url;
  result.phone = parsed.phone;
  result.reservations_url = parsed.reservations_url;
  result.reservations_vendor = parsed.reservations_vendor;
  result.candidateLinks = parsed.candidateLinks;
  result.evidence_json = parsed.evidence_json;
  
  // Select candidate pages to fetch
  const selectedPages = selectCandidatePages(
    parsed.candidateLinks,
    fetchResult.finalUrl,
    maxPagesPerPlace,
    allowedTypes
  );
  
  // Fetch each selected page
  for (const candidate of selectedPages) {
    await waitForDomain(candidate.url);
    
    const pageFetch: PageFetch = {
      placeId: place.id,
      placeName: place.name,
      baseUrl: fetchResult.finalUrl,
      pageType: candidate.type as 'menu' | 'wine' | 'about',
      pageUrl: candidate.url,
      finalUrl: candidate.url,
      status: 'failed',
      fromCache: false,
      bytes: 0,
      blockedByRobots: false,
      notes: '',
      evidence: candidate.text,
    };
    
    // Fetch target page
    const targetFetch = await getOrFetch(
      candidate.url,
      async (url, conditionalHeaders) => {
        return await fetchHtml(url, { conditionalHeaders });
      },
      { ttlDays: 7 }
    );
    
    pageFetch.fromCache = targetFetch.fromCache;
    pageFetch.finalUrl = targetFetch.finalUrl;
    
    if (targetFetch.html && targetFetch.status === 200) {
      pageFetch.status = 'success';
      pageFetch.bytes = targetFetch.html.length;
      
      // Extract content based on page type
      if (candidate.type === 'menu') {
        const menuExtract = extractMenuUrl(targetFetch.html, targetFetch.finalUrl);
        if (menuExtract.menu_url) {
          result.menu_url = menuExtract.menu_url;
          result.menu_evidence = menuExtract.menu_evidence;
        }
      } else if (candidate.type === 'wine') {
        const wineExtract = extractWinelistUrl(targetFetch.html, targetFetch.finalUrl);
        if (wineExtract.winelist_url) {
          result.winelist_url = wineExtract.winelist_url;
          result.winelist_evidence = wineExtract.winelist_evidence;
        }
      } else if (candidate.type === 'about') {
        const aboutExtract = extractAboutCopy(targetFetch.html, targetFetch.finalUrl);
        if (aboutExtract.about_copy) {
          result.about_url = aboutExtract.about_url;
          result.about_copy = aboutExtract.about_copy;
          result.about_evidence = aboutExtract.about_evidence;
        }
      }
    } else {
      pageFetch.status = 'failed';
      pageFetch.notes = targetFetch.error || `HTTP ${targetFetch.status}`;
    }
    
    result.pageFetches.push(pageFetch);
  }
  
  return result;
}

// ============================================================================
// CSV OUTPUT
// ============================================================================

/**
 * Write discovery CSV (candidate links)
 */
function writeDiscoveryCSV(results: CrawlResult[], outputPath: string): void {
  const rows: string[] = [];
  rows.push('place_id,place_name,website,final_url,link_url,link_text,link_type,score');
  
  for (const result of results) {
    if (result.status === 'success' && result.candidateLinks.length > 0) {
      for (const link of result.candidateLinks) {
        rows.push([
          result.placeId,
          escapeCSV(result.placeName),
          escapeCSV(result.website),
          escapeCSV(result.finalUrl),
          escapeCSV(link.url),
          escapeCSV(link.text),
          link.type,
          link.score,
        ].join(','));
      }
    }
  }
  
  fs.writeFileSync(outputPath, rows.join('\n'), 'utf-8');
}

/**
 * Write page fetches CSV (new)
 */
function writePagesCSV(results: CrawlResult[], outputPath: string): void {
  const rows: string[] = [];
  rows.push('place_id,name,base_url,page_type,page_url,final_url,status,from_cache,bytes,blocked_by_robots,notes,evidence');
  
  for (const result of results) {
    for (const fetch of result.pageFetches) {
      rows.push([
        fetch.placeId,
        escapeCSV(fetch.placeName),
        escapeCSV(fetch.baseUrl),
        fetch.pageType,
        escapeCSV(fetch.pageUrl),
        escapeCSV(fetch.finalUrl),
        fetch.status,
        fetch.fromCache ? 'yes' : 'no',
        fetch.bytes.toString(),
        fetch.blockedByRobots ? 'yes' : 'no',
        escapeCSV(fetch.notes),
        escapeCSV(fetch.evidence),
      ].join(','));
    }
  }
  
  fs.writeFileSync(outputPath, rows.join('\n'), 'utf-8');
}

/**
 * Write fields CSV (extended with new columns)
 */
function writeFieldsCSV(results: CrawlResult[], outputPath: string): void {
  const rows: string[] = [];
  rows.push('place_id,place_name,website,final_url,status,instagram_url,phone,reservations_url,reservations_vendor,menu_url,menu_evidence,winelist_url,winelist_evidence,about_url,about_copy,about_evidence,from_cache,error');
  
  for (const result of results) {
    rows.push([
      result.placeId,
      escapeCSV(result.placeName),
      escapeCSV(result.website),
      escapeCSV(result.finalUrl),
      result.status,
      escapeCSV(result.instagram_url || ''),
      escapeCSV(result.phone || ''),
      escapeCSV(result.reservations_url || ''),
      escapeCSV(result.reservations_vendor || ''),
      escapeCSV(result.menu_url || ''),
      escapeCSV(result.menu_evidence || ''),
      escapeCSV(result.winelist_url || ''),
      escapeCSV(result.winelist_evidence || ''),
      escapeCSV(result.about_url || ''),
      escapeCSV(result.about_copy || ''),
      escapeCSV(result.about_evidence || ''),
      result.fromCache ? 'yes' : 'no',
      escapeCSV(result.error || ''),
    ].join(','));
  }
  
  fs.writeFileSync(outputPath, rows.join('\n'), 'utf-8');
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  const args = parseArgs();
  
  console.log('\n🌐 Saiko Maps — Place Website Crawler (CHECKPOINT 5.12C+D)');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📌 Homepage + target page fetching');
  console.log(`📌 Max pages per place: ${args.maxPagesPerPlace}`);
  console.log(`📌 Types: ${args.types.join(', ')}`);
  if (args.limit) console.log(`📌 Limit: ${args.limit} places`);
  if (args.city) console.log(`📌 City: ${args.city}`);
  if (args.skipRobots) console.log('📌 Skipping robots.txt checks');
  console.log('');
  
  // Fetch places from database
  console.log('📊 Fetching places with websites...');
  
  const whereClause: any = {
    website: { not: null },
  };
  
  // City scoping
  if (args.city) {
    whereClause.cityRel = { slug: args.city };
  } else {
    // Default to active city (assuming Los Angeles for now)
    whereClause.cityRel = { slug: 'los-angeles' };
  }
  
  const places = await prisma.places.findMany({
    where: whereClause,
    select: {
      id: true,
      name: true,
      website: true,
      slug: true,
      neighborhood: true,
    },
    orderBy: { name: 'asc' },
    take: args.limit ?? undefined,
  });
  
  console.log(`   Found ${places.length} places with websites\n`);
  
  if (places.length === 0) {
    console.log('✅ No places to process. Exiting.');
    await prisma.$disconnect();
    return;
  }
  
  // Initialize stats
  const stats: Stats = {
    total: places.length,
    success: 0,
    robotsBlocked: 0,
    fetchFailed: 0,
    cacheHits: 0,
    instagramFound: 0,
    phoneFound: 0,
    reservationsFound: 0,
    menuFound: 0,
    winelistFound: 0,
    aboutFound: 0,
    pagesFetched: 0,
    pagesFromCache: 0,
  };
  
  // Initialize concurrency controller
  const concurrency = new ConcurrencyController(3);
  
  console.log('🚀 Starting crawl...');
  console.log('   Concurrency: 3');
  console.log('   Per-domain delay: 500-1200ms jitter');
  console.log('   Max requests per domain: 4 (1 homepage + 3 candidates)');
  console.log('');
  
  // Process all places
  const results: CrawlResult[] = [];
  const startTime = Date.now();
  
  const promises = places.map(async (place, index) => {
    return concurrency.run(async () => {
      const placeInput: PlaceInput = {
        id: place.id,
        name: place.name,
        website: place.website!,
        slug: place.slug,
        neighborhood: place.neighborhood,
      };
      
      const result = await crawlPlace(placeInput, args.skipRobots, args.maxPagesPerPlace, args.types);
      
      // Update stats
      if (result.status === 'success') stats.success++;
      else if (result.status === 'robots_blocked') stats.robotsBlocked++;
      else if (result.status === 'fetch_failed') stats.fetchFailed++;
      
      if (result.fromCache) stats.cacheHits++;
      if (result.instagram_url) stats.instagramFound++;
      if (result.phone) stats.phoneFound++;
      if (result.reservations_url) stats.reservationsFound++;
      if (result.menu_url) stats.menuFound++;
      if (result.winelist_url) stats.winelistFound++;
      if (result.about_copy) stats.aboutFound++;
      
      stats.pagesFetched += result.pageFetches.length;
      stats.pagesFromCache += result.pageFetches.filter(p => p.fromCache).length;
      
      // Progress logging
      const progress = Math.round(((index + 1) / places.length) * 100);
      const statusIcon = result.status === 'success' ? '✅' : 
                         result.status === 'robots_blocked' ? '🚫' : '❌';
      const cacheIcon = result.fromCache ? '💾' : '🌐';
      const pagesIcon = result.pageFetches.length > 0 ? `+${result.pageFetches.length}📄` : '';
      
      console.log(`[${progress.toString().padStart(3)}%] ${statusIcon} ${cacheIcon} ${result.placeName.substring(0, 35).padEnd(35)} ${pagesIcon}`);
      
      return result;
    });
  });
  
  const resolvedResults = await Promise.all(promises);
  results.push(...resolvedResults);
  
  const duration = Date.now() - startTime;
  
  // Write output CSVs
  console.log('\n📝 Writing output files...');
  
  const outDir = path.join(__dirname, 'out');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  
  const discoveryPath = path.join(outDir, 'place_site_discovery.csv');
  const pagesPath = path.join(outDir, 'place_site_pages.csv');
  const fieldsPath = path.join(outDir, 'place_site_fields.csv');
  
  writeDiscoveryCSV(results, discoveryPath);
  writePagesCSV(results, pagesPath);
  writeFieldsCSV(results, fieldsPath);
  
  console.log(`   ✅ ${discoveryPath}`);
  console.log(`   ✅ ${pagesPath}`);
  console.log(`   ✅ ${fieldsPath}`);
  
  // Print summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 CRAWL SUMMARY');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Total places:      ${stats.total}`);
  console.log(`✅ Success:        ${stats.success} (${Math.round((stats.success / stats.total) * 100)}%)`);
  console.log(`🚫 Robots blocked: ${stats.robotsBlocked}`);
  console.log(`❌ Fetch failed:   ${stats.fetchFailed}`);
  console.log(`💾 Cache hits:     ${stats.cacheHits} (${Math.round((stats.cacheHits / stats.total) * 100)}%)`);
  console.log('');
  console.log('📋 Extracted Fields (Homepage):');
  console.log(`   Instagram:     ${stats.instagramFound} (${Math.round((stats.instagramFound / stats.success) * 100)}%)`);
  console.log(`   Phone:         ${stats.phoneFound} (${Math.round((stats.phoneFound / stats.success) * 100)}%)`);
  console.log(`   Reservations:  ${stats.reservationsFound} (${Math.round((stats.reservationsFound / stats.success) * 100)}%)`);
  console.log('');
  console.log('📋 Extracted Fields (Target Pages):');
  console.log(`   Menu URL:      ${stats.menuFound} (${Math.round((stats.menuFound / stats.success) * 100)}%)`);
  console.log(`   Wine list URL: ${stats.winelistFound} (${Math.round((stats.winelistFound / stats.success) * 100)}%)`);
  console.log(`   About copy:    ${stats.aboutFound} (${Math.round((stats.aboutFound / stats.success) * 100)}%)`);
  console.log('');
  console.log('📄 Target Pages:');
  console.log(`   Total fetched: ${stats.pagesFetched}`);
  console.log(`   From cache:    ${stats.pagesFromCache} (${stats.pagesFetched > 0 ? Math.round((stats.pagesFromCache / stats.pagesFetched) * 100) : 0}%)`);
  console.log('');
  console.log(`⏱️  Duration:       ${(duration / 1000).toFixed(1)}s`);
  console.log(`📈 Rate:           ${(stats.total / (duration / 1000 / 60)).toFixed(1)} places/min`);
  console.log('═══════════════════════════════════════════════════════════\n');
}

main()
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
