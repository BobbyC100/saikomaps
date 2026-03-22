#!/usr/bin/env node
/**
 * Coverage Source Discovery — Phase 2
 *
 * Sweeps approved editorial sources against EAT-category entities to find
 * editorial coverage. Uses Claude Haiku + web_search (same pattern as
 * discover-social.ts and smart-enrich.ts Phase 1).
 *
 * For each entity, asks Haiku to search discovery-enabled approved
 * publications for coverage articles. Found URLs are filtered against
 * the approved source registry and inserted into coverage_sources as INGESTED.
 *
 * Usage:
 *   npx tsx scripts/discover-coverage-sources.ts [--dry-run] [--limit=N] [--slug=<slug>] [--vertical=EAT] [--verbose]
 *
 * Flags:
 *   --dry-run       Show what would be discovered, no DB writes
 *   --limit=N       Process at most N entities (default: unlimited)
 *   --slug=<slug>   Process a single entity by slug
 *   --vertical=X    Filter by primary vertical (default: EAT)
 *   --all-verticals Process all verticals (overrides --vertical)
 *   --verbose       Show full discovery output per entity
 *   --skip-covered  Skip entities that already have ≥3 coverage sources
 *   --sources=a,b   Comma-separated source IDs to search (default: all discovery-enabled)
 *
 * Cost: ~$0.01/entity (Haiku + web_search)
 *
 * Reads:  entities, coverage_sources (for dedup)
 * Writes: coverage_sources (enrichment_stage = INGESTED)
 */

import { config } from 'dotenv';
config({ path: '.env' });
if (!process.env.SAIKO_DB_FROM_WRAPPER) {
  config({ path: '.env.local', override: true });
}

import Anthropic from '@anthropic-ai/sdk';
import { db } from '../lib/db';
import {
  getDiscoverySources,
  isApprovedEditorialUrl,
  findApprovedSource,
} from '../lib/source-registry';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 2048;
const RATE_LIMIT_MS = 600;
const CONCURRENCY = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const verbose = args.includes('--verbose');
const skipCovered = args.includes('--skip-covered');
const allVerticals = args.includes('--all-verticals');

const limitArg = args.find((a) => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined;

const slugArg = args.find((a) => a.startsWith('--slug='));
const slug = slugArg ? slugArg.split('=')[1] : undefined;

const verticalArg = args.find((a) => a.startsWith('--vertical='));
const vertical = verticalArg ? verticalArg.split('=')[1] : 'EAT';

const sourcesArg = args.find((a) => a.startsWith('--sources='));
const sourceFilter = sourcesArg ? sourcesArg.split('=')[1].split(',').map((s) => s.trim()) : undefined;

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

function buildDiscoveryPrompt(
  entityName: string,
  neighborhood: string | null,
  category: string | null,
  domains: string[],
): { system: string; user: string } {
  const domainList = domains.join(', ');

  const system = `You are an editorial research assistant. Your job is to find published articles about a specific restaurant or place from a curated list of approved publications.

Search these publication domains ONLY: ${domainList}

For each publication where you find coverage of the place, return the specific article URL(s).

Return JSON (no markdown fences):
{
  "articles": [
    { "url": "https://...", "title": "Article title if found", "publication": "Publication Name" }
  ],
  "searched": ${domains.length},
  "notes": "brief summary of what was found or not found"
}

Rules:
- Only return URLs from the approved publication domains listed above
- Only return articles that are clearly about this specific place (not just a mention in passing)
- Do NOT return aggregator links (Yelp, TripAdvisor, Google Maps, DoorDash, etc.)
- Do NOT return the place's own website
- If no editorial coverage is found, return "articles": []
- Include the actual article URL, not the publication homepage`;

  const hood = neighborhood ? ` in ${neighborhood}` : '';
  const cat = category ?? 'restaurant';
  const user = `Find editorial coverage of: ${entityName}${hood}, Los Angeles (${cat})

Search these specific publication sites for articles, reviews, or features about this place: ${domainList}`;

  return { system, user };
}

// ---------------------------------------------------------------------------
// Discovery call
// ---------------------------------------------------------------------------

interface DiscoveredArticle {
  url: string;
  title: string | null;
  publication: string | null;
}

interface DiscoveryResult {
  entityId: string;
  slug: string;
  entityName: string;
  articles: DiscoveredArticle[];
  newInserted: number;
  duplicatesSkipped: number;
  filteredOut: number;
  error: string | null;
}

async function discoverForEntity(
  client: Anthropic | null,
  entity: {
    id: string;
    slug: string | null;
    name: string;
    neighborhood: string | null;
    category: string | null;
  },
  existingUrls: Set<string>,
  discoveryDomains: string[],
): Promise<DiscoveryResult> {
  const result: DiscoveryResult = {
    entityId: entity.id,
    slug: entity.slug ?? '???',
    entityName: entity.name,
    articles: [],
    newInserted: 0,
    duplicatesSkipped: 0,
    filteredOut: 0,
    error: null,
  };

  if (dryRun || !client) {
    return result;
  }

  const { system, user } = buildDiscoveryPrompt(
    entity.name,
    entity.neighborhood,
    entity.category,
    discoveryDomains,
  );

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system,
      tools: [{ type: 'web_search_20250305' as any, name: 'web_search' } as any],
      messages: [{ role: 'user', content: user }],
    });

    const textBlocks = response.content.filter((b: any) => b.type === 'text');
    const fullText = textBlocks.map((b: any) => b.text).join('\n');

    // Parse JSON from response
    const jsonMatch = fullText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      result.error = 'No JSON in response';
      return result;
    }

    let parsed: any;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      result.error = 'JSON parse failed';
      return result;
    }

    const articles = Array.isArray(parsed.articles) ? parsed.articles : [];

    for (const article of articles) {
      if (!article.url || typeof article.url !== 'string') continue;

      const url = article.url.trim();

      // Filter: must be from an approved source
      if (!isApprovedEditorialUrl(url)) {
        result.filteredOut++;
        continue;
      }

      // Dedup: skip if already in coverage_sources for this entity
      if (existingUrls.has(url)) {
        result.duplicatesSkipped++;
        continue;
      }

      const approvedSource = findApprovedSource(url);
      const publicationName = approvedSource?.displayName ?? article.publication ?? 'Unknown';

      result.articles.push({
        url,
        title: typeof article.title === 'string' ? article.title : null,
        publication: publicationName,
      });

      // Insert into coverage_sources
      try {
        await db.coverage_sources.create({
          data: {
            entityId: entity.id,
            url,
            publicationName,
            articleTitle: typeof article.title === 'string' ? article.title : null,
            enrichmentStage: 'INGESTED',
          },
        });
        result.newInserted++;
        existingUrls.add(url); // prevent duplicates within same batch
      } catch (err: any) {
        // Unique constraint violation = already exists
        if (err.code === 'P2002') {
          result.duplicatesSkipped++;
        } else {
          throw err;
        }
      }
    }
  } catch (err: any) {
    result.error = err.message?.slice(0, 200) ?? 'Unknown error';
  }

  return result;
}

// ---------------------------------------------------------------------------
// Batch runner
// ---------------------------------------------------------------------------

async function runBatch<T, R>(items: T[], fn: (item: T) => Promise<R>, maxConcurrent: number): Promise<R[]> {
  const results: R[] = [];
  let idx = 0;

  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i]);
      await sleep(RATE_LIMIT_MS);
    }
  }

  const workers = Array.from({ length: Math.min(maxConcurrent, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (dryRun) {
    console.log('\n🔍 DRY RUN — no API calls, no DB writes\n');
  } else {
    console.log('\n🔎 Discovering coverage sources...\n');
  }

  // Check API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey && !dryRun) {
    console.error('❌  ANTHROPIC_API_KEY not set.');
    process.exit(1);
  }

  const client = dryRun ? null : new Anthropic({ apiKey });

  // Get discovery-enabled sources (optionally filtered by --sources)
  let discoverySources = getDiscoverySources();
  if (sourceFilter) {
    discoverySources = discoverySources.filter((s) => sourceFilter.includes(s.id));
    const unknownIds = sourceFilter.filter((id) => !discoverySources.some((s) => s.id === id));
    if (unknownIds.length > 0) {
      console.error(`❌  Unknown or non-discovery source IDs: ${unknownIds.join(', ')}`);
      console.error(`    Available: ${getDiscoverySources().map((s) => s.id).join(', ')}`);
      process.exit(1);
    }
    if (discoverySources.length === 0) {
      console.error('❌  No matching discovery-enabled sources found.');
      process.exit(1);
    }
  }
  const discoveryDomains = discoverySources.map((s) => s.domains[0]);

  console.log(`  Model:          ${MODEL}`);
  console.log(`  Sources:        ${discoverySources.length} discovery-enabled publications${sourceFilter ? ' (filtered)' : ''}`);
  if (sourceFilter) {
    for (const s of discoverySources) {
      console.log(`                    → ${s.id} (${s.displayName})`);
    }
  }
  console.log(`  Vertical:       ${allVerticals ? 'ALL' : vertical}`);
  console.log(`  Skip covered:   ${skipCovered}`);
  if (limit) console.log(`  Limit:          ${limit}`);
  if (slug) console.log(`  Slug:           ${slug}`);
  console.log('');

  // ── Query entities ───────────────────────────────────────────────────────

  const where: any = {
    status: { in: ['OPEN', 'CANDIDATE'] },
  };

  if (slug) {
    where.slug = slug;
  } else if (!allVerticals) {
    where.primaryVertical = vertical;
  }

  const entities = await db.entities.findMany({
    where,
    select: {
      id: true,
      slug: true,
      name: true,
      neighborhood: true,
      category: true,
      _count: { select: { coverage_sources: true } },
    },
    orderBy: { name: 'asc' },
    ...(limit ? { take: limit } : {}),
  });

  // Filter out entities with enough coverage if --skip-covered
  const filtered = skipCovered
    ? entities.filter((e: any) => e._count.coverage_sources < 3)
    : entities;

  console.log(`Found ${filtered.length} entities to search.${skipCovered && entities.length !== filtered.length ? ` (${entities.length - filtered.length} skipped, already covered)` : ''}\n`);

  if (filtered.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  // ── Pre-load existing URLs for dedup ─────────────────────────────────────

  const entityIds = filtered.map((e: any) => e.id);
  const existingCoverage = await db.coverage_sources.findMany({
    where: { entityId: { in: entityIds } },
    select: { entityId: true, url: true },
  });

  const existingUrlsByEntity = new Map<string, Set<string>>();
  for (const row of existingCoverage) {
    if (!existingUrlsByEntity.has(row.entityId)) {
      existingUrlsByEntity.set(row.entityId, new Set());
    }
    existingUrlsByEntity.get(row.entityId)!.add(row.url);
  }

  // ── Process ──────────────────────────────────────────────────────────────

  let totalNew = 0;
  let totalDuplicates = 0;
  let totalFiltered = 0;
  let totalErrors = 0;
  const pubStats = new Map<string, number>();

  const results = await runBatch(
    filtered,
    async (entity: any) => {
      const existing = existingUrlsByEntity.get(entity.id) ?? new Set<string>();
      const prefix = dryRun ? '  [dry]' : '  ';

      if (dryRun) {
        console.log(`${prefix} ${entity.slug} — ${entity.name} (${entity._count.coverage_sources} existing)`);
        return null;
      }

      process.stdout.write(`${prefix} ${entity.slug} — `);

      const result = await discoverForEntity(client, entity, existing, discoveryDomains);

      if (result.error) {
        console.log(`✗ ${result.error}`);
        totalErrors++;
      } else if (result.newInserted > 0) {
        const pubs = result.articles.map((a) => a.publication).filter(Boolean);
        console.log(`✓ ${result.newInserted} new (${pubs.join(', ')})${result.duplicatesSkipped > 0 ? ` [${result.duplicatesSkipped} dupes]` : ''}`);

        if (verbose) {
          for (const article of result.articles) {
            console.log(`      ${article.publication}: ${article.url}`);
          }
        }

        for (const article of result.articles) {
          if (article.publication) {
            pubStats.set(article.publication, (pubStats.get(article.publication) ?? 0) + 1);
          }
        }
      } else {
        console.log(`— no new coverage${result.duplicatesSkipped > 0 ? ` [${result.duplicatesSkipped} dupes]` : ''}`);
      }

      totalNew += result.newInserted;
      totalDuplicates += result.duplicatesSkipped;
      totalFiltered += result.filteredOut;

      return result;
    },
    dryRun ? 1 : CONCURRENCY,
  );

  // ── Summary ────────────────────────────────────────────────────────────

  console.log('\n' + '═'.repeat(40));
  console.log(dryRun ? '  DRY RUN SUMMARY' : '  DISCOVERY SUMMARY');
  console.log('═'.repeat(40));
  console.log(`  Entities searched:  ${filtered.length}`);
  console.log(`  New sources found:  ${totalNew}`);
  console.log(`  Duplicates skipped: ${totalDuplicates}`);
  console.log(`  Filtered (non-approved): ${totalFiltered}`);
  if (totalErrors > 0) console.log(`  Errors:             ${totalErrors}`);

  if (pubStats.size > 0) {
    console.log('\n  New sources by publication:');
    for (const [pub, count] of Array.from(pubStats.entries()).sort((a, b) => b[1] - a[1])) {
      console.log(`    ${pub.padEnd(28)} ${count}`);
    }
  }

  // Estimated cost
  if (!dryRun) {
    const estCost = (filtered.length * 0.01).toFixed(2);
    console.log(`\n  Estimated cost:     ~$${estCost}`);
  }

  console.log('');
}

main()
  .catch((err) => {
    console.error('Fatal:', err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
