/**
 * Editorial Coverage Gap Audit
 *
 * Maps the full editorial data landscape across:
 *   1. coverage_sources (relational table — the intended target model)
 *   2. entities.editorialSources (legacy JSON field)
 *   3. entities.pullQuote* (legacy scalar fields)
 *   4. interpretation_cache PULL_QUOTE entries (AI-generated)
 *   5. entities.description + descriptionSource (generated descriptions)
 *
 * Goal: understand what editorial data already exists, where it lives,
 * and what could be migrated or generated to fill the coverage_sources gap.
 *
 * Usage:
 *   npx tsx scripts/audit-editorial-coverage.ts
 *   npx tsx scripts/audit-editorial-coverage.ts --samples   # show sample data
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const showSamples = process.argv.includes('--samples');

async function main() {
  const write = (s: string) => process.stderr.write(s + '\n');

  // Active entities
  const entities = await prisma.entities.findMany({
    where: { status: { in: ['OPEN', 'CANDIDATE'] } },
    select: {
      id: true,
      slug: true,
      name: true,
      primaryVertical: true,
      description: true,
      descriptionSource: true,
      editorialSources: true,
      pullQuote: true,
      pullQuoteAuthor: true,
      pullQuoteSource: true,
      pullQuoteType: true,
      pullQuoteUrl: true,
    },
  });

  write(`\n${'='.repeat(60)}`);
  write('  EDITORIAL COVERAGE GAP AUDIT');
  write(`  ${entities.length} active entities`);
  write(`${'='.repeat(60)}`);

  // ─── 1. coverage_sources (relational table) ──────────────────────────
  const coverageSources = await prisma.coverage_sources.findMany({
    select: { entityId: true, publicationName: true, url: true, enrichmentStage: true },
  });
  const coverageByEntity = new Map<string, typeof coverageSources>();
  for (const cs of coverageSources) {
    if (!coverageByEntity.has(cs.entityId)) coverageByEntity.set(cs.entityId, []);
    coverageByEntity.get(cs.entityId)!.push(cs);
  }

  const entitiesWithCoverage = new Set([...coverageByEntity.keys()].filter(id =>
    entities.some(e => e.id === id)
  ));

  write('\n── 1. coverage_sources (relational table) ──');
  write(`  Total rows: ${coverageSources.length}`);
  write(`  Active entities with rows: ${entitiesWithCoverage.size} / ${entities.length} (${pct(entitiesWithCoverage.size, entities.length)})`);

  if (showSamples && coverageSources.length > 0) {
    const sourceNames = [...new Set(coverageSources.map(cs => cs.publicationName))];
    write(`  Source names: ${sourceNames.join(', ')}`);
    for (const [entityId, rows] of coverageByEntity.entries()) {
      const entity = entities.find(e => e.id === entityId);
      if (entity) {
        write(`  ${entity.slug}: ${rows.map(r => r.publicationName).join(', ')}`);
      }
    }
  }

  // ─── 2. entities.editorialSources (legacy JSON) ──────────────────────
  const withEditorialSources = entities.filter(e => {
    if (!e.editorialSources) return false;
    if (typeof e.editorialSources === 'object' && Array.isArray(e.editorialSources)) {
      return (e.editorialSources as unknown[]).length > 0;
    }
    if (typeof e.editorialSources === 'string') return e.editorialSources.trim().length > 0;
    return JSON.stringify(e.editorialSources) !== '{}' && JSON.stringify(e.editorialSources) !== 'null';
  });

  write('\n── 2. entities.editorialSources (legacy JSON) ──');
  write(`  Entities with non-empty editorialSources: ${withEditorialSources.length} / ${entities.length} (${pct(withEditorialSources.length, entities.length)})`);

  if (showSamples && withEditorialSources.length > 0) {
    write('  Samples:');
    for (const e of withEditorialSources.slice(0, 5)) {
      const data = e.editorialSources;
      const summary = Array.isArray(data)
        ? `[${(data as unknown[]).length} items]`
        : JSON.stringify(data).slice(0, 120);
      write(`    ${e.slug}: ${summary}`);
    }
  }

  // ─── 3. entities.pullQuote* (legacy scalar fields) ────────────────────
  const withPullQuote = entities.filter(e => e.pullQuote?.trim());
  const withPullQuoteSource = entities.filter(e => e.pullQuoteSource?.trim());
  const withPullQuoteUrl = entities.filter(e => e.pullQuoteUrl?.trim());
  const withPullQuoteAuthor = entities.filter(e => e.pullQuoteAuthor?.trim());

  write('\n── 3. entities.pullQuote* (legacy scalar fields) ──');
  write(`  pullQuote:       ${withPullQuote.length} / ${entities.length} (${pct(withPullQuote.length, entities.length)})`);
  write(`  pullQuoteSource: ${withPullQuoteSource.length}`);
  write(`  pullQuoteUrl:    ${withPullQuoteUrl.length}`);
  write(`  pullQuoteAuthor: ${withPullQuoteAuthor.length}`);

  if (showSamples && withPullQuote.length > 0) {
    write('  Samples:');
    for (const e of withPullQuote.slice(0, 5)) {
      const quote = (e.pullQuote ?? '').slice(0, 80);
      write(`    ${e.slug}: "${quote}..." — ${e.pullQuoteSource ?? '(no source)'}`);
    }
  }

  // ─── 4. interpretation_cache PULL_QUOTE entries ───────────────────────
  const pullQuoteCacheEntries = await prisma.interpretation_cache.findMany({
    where: { outputType: 'PULL_QUOTE', isCurrent: true },
    select: { entityId: true, content: true, promptVersion: true },
  });

  const cacheEntityIds = new Set(pullQuoteCacheEntries.map(e => e.entityId));
  const activeCacheEntities = [...cacheEntityIds].filter(id => entities.some(e => e.id === id));

  write('\n── 4. interpretation_cache PULL_QUOTE entries ──');
  write(`  Total current PULL_QUOTE rows: ${pullQuoteCacheEntries.length}`);
  write(`  Active entities with PULL_QUOTE: ${activeCacheEntities.length} / ${entities.length} (${pct(activeCacheEntities.length, entities.length)})`);

  if (showSamples && pullQuoteCacheEntries.length > 0) {
    write('  Samples:');
    for (const entry of pullQuoteCacheEntries.slice(0, 5)) {
      const entity = entities.find(e => e.id === entry.entityId);
      const content = entry.content as Record<string, unknown> | null;
      const text = (content?.text as string ?? '').slice(0, 80);
      write(`    ${entity?.slug ?? entry.entityId}: "${text}..." (v${entry.promptVersion})`);
    }
  }

  // ─── 5. entities.description + descriptionSource ──────────────────────
  const withDescription = entities.filter(e => e.description?.trim());
  const descSourceCounts: Record<string, number> = {};
  for (const e of withDescription) {
    const src = e.descriptionSource ?? 'null';
    descSourceCounts[src] = (descSourceCounts[src] ?? 0) + 1;
  }

  write('\n── 5. entities.description + descriptionSource ──');
  write(`  Entities with description: ${withDescription.length} / ${entities.length} (${pct(withDescription.length, entities.length)})`);
  write('  By source:');
  for (const [src, count] of Object.entries(descSourceCounts).sort((a, b) => b[1] - a[1])) {
    write(`    ${src.padEnd(25)} ${count.toString().padStart(5)}  (${pct(count, entities.length)})`);
  }

  // ─── 6. interpretation_cache TAGLINE entries ──────────────────────────
  const taglineCacheEntries = await prisma.interpretation_cache.count({
    where: { outputType: 'TAGLINE', isCurrent: true },
  });

  write('\n── 6. interpretation_cache TAGLINE entries ──');
  write(`  Current TAGLINE rows: ${taglineCacheEntries}`);

  // ─── 7. Overlap analysis ──────────────────────────────────────────────
  write('\n── 7. Overlap & Gap Analysis ──');

  // Entities with ANY editorial signal
  const hasAnyEditorial = new Set<string>();
  for (const e of entities) {
    if (entitiesWithCoverage.has(e.id)) hasAnyEditorial.add(e.id);
    if (withEditorialSources.some(w => w.id === e.id)) hasAnyEditorial.add(e.id);
    if (e.pullQuote?.trim()) hasAnyEditorial.add(e.id);
    if (cacheEntityIds.has(e.id)) hasAnyEditorial.add(e.id);
  }

  const hasDescription = new Set(withDescription.map(e => e.id));
  const hasEditorialButNoCoverage = [...hasAnyEditorial].filter(id => !entitiesWithCoverage.has(id));
  const hasNothingEditorial = entities.filter(e => !hasAnyEditorial.has(e.id) && !hasDescription.has(e.id));

  write(`  Any editorial signal (excl description): ${hasAnyEditorial.size} / ${entities.length} (${pct(hasAnyEditorial.size, entities.length)})`);
  write(`  Has editorial signal but NOT in coverage_sources: ${hasEditorialButNoCoverage.length}`);
  write(`  Zero editorial signal AND no description: ${hasNothingEditorial.length} / ${entities.length} (${pct(hasNothingEditorial.length, entities.length)})`);

  // ─── 8. Backfill potential ────────────────────────────────────────────
  write('\n── 8. Backfill Potential ──');

  // pullQuote entries that have a URL → directly migratable to coverage_sources
  const migratable = withPullQuoteUrl.filter(e => e.pullQuoteUrl?.trim() && e.pullQuote?.trim());
  write(`  pullQuote with URL (→ coverage_sources): ${migratable.length}`);

  // editorialSources JSON that contains URLs → parse and migrate
  let editorialSourceUrls = 0;
  for (const e of withEditorialSources) {
    const data = e.editorialSources as Record<string, unknown> | unknown[] | null;
    if (!data) continue;
    // Handle {"sources": ["url1", "url2"]} structure
    if (typeof data === 'object' && !Array.isArray(data) && 'sources' in data) {
      const sources = (data as Record<string, unknown>).sources;
      if (Array.isArray(sources)) {
        for (const s of sources) {
          if (typeof s === 'string' && s.startsWith('http')) editorialSourceUrls++;
        }
      }
    }
    // Handle flat array of objects [{url: "..."}, ...]
    if (Array.isArray(data)) {
      for (const item of data as Record<string, unknown>[]) {
        if (item?.url || item?.link) editorialSourceUrls++;
      }
    }
  }
  write(`  editorialSources JSON entries with URLs: ${editorialSourceUrls}`);

  // Entities with website/surfaces that could be crawled for press mentions
  const withWebsite = entities.filter(e => e.description || hasAnyEditorial.has(e.id));
  const eatVertical = entities.filter(e => e.primaryVertical === 'EAT');
  const eatWithNoEditorial = eatVertical.filter(e => !hasAnyEditorial.has(e.id));

  write(`\n  EAT vertical: ${eatVertical.length} total, ${eatWithNoEditorial.length} with zero editorial signal`);

  // ─── Per-vertical summary ─────────────────────────────────────────────
  write('\n── 9. Per-Vertical Editorial Coverage ──');
  const verticals = [...new Set(entities.map(e => e.primaryVertical))].sort();

  write(`  ${'Vertical'.padEnd(14)} ${'Total'.padStart(6)} ${'CovSrc'.padStart(7)} ${'PullQt'.padStart(7)} ${'EdSrcs'.padStart(7)} ${'IntPQ'.padStart(7)} ${'Desc'.padStart(7)} ${'Zero'.padStart(7)}`);
  write(`  ${'─'.repeat(14)} ${'─'.repeat(6)} ${'─'.repeat(7)} ${'─'.repeat(7)} ${'─'.repeat(7)} ${'─'.repeat(7)} ${'─'.repeat(7)} ${'─'.repeat(7)}`);

  for (const v of verticals) {
    const vEntities = entities.filter(e => e.primaryVertical === v);
    const vCov = vEntities.filter(e => entitiesWithCoverage.has(e.id)).length;
    const vPQ = vEntities.filter(e => e.pullQuote?.trim()).length;
    const vES = vEntities.filter(e => withEditorialSources.some(w => w.id === e.id)).length;
    const vIPQ = vEntities.filter(e => cacheEntityIds.has(e.id)).length;
    const vDesc = vEntities.filter(e => e.description?.trim()).length;
    const vZero = vEntities.filter(e =>
      !entitiesWithCoverage.has(e.id) &&
      !e.pullQuote?.trim() &&
      !withEditorialSources.some(w => w.id === e.id) &&
      !cacheEntityIds.has(e.id) &&
      !e.description?.trim()
    ).length;

    write(`  ${v.padEnd(14)} ${vEntities.length.toString().padStart(6)} ${vCov.toString().padStart(7)} ${vPQ.toString().padStart(7)} ${vES.toString().padStart(7)} ${vIPQ.toString().padStart(7)} ${vDesc.toString().padStart(7)} ${vZero.toString().padStart(7)}`);
  }

  write('');
  await prisma.$disconnect();
}

function pct(n: number, total: number): string {
  if (total === 0) return '0.0%';
  return ((n / total) * 100).toFixed(1) + '%';
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
