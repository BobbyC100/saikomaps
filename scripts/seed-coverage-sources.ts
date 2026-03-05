/**
 * Seed coverage sources for entities.
 * Idempotent: uses upsert on (entity_id, url).
 *
 * Run: npx tsx scripts/seed-coverage-sources.ts
 */

import { db } from '../lib/db';

interface CoverageLink {
  slug: string;
  sourceName: string;
  url: string;
  excerpt?: string;
  publishedAt?: string;
}

const COVERAGE_LINKS: CoverageLink[] = [
  {
    slug: 'seco',
    sourceName: 'Eater',
    url: 'https://la.eater.com/2024/9/4/24236191/barr-seco-silver-lake-wine-bar-restaurant-los-angeles',
    publishedAt: '2024-09-04',
  },
  {
    slug: 'seco',
    sourceName: 'Substack',
    url: 'https://oliviavlopez.substack.com/p/seco',
  },
  {
    slug: 'seco',
    sourceName: 'The Infatuation',
    url: 'https://www.theinfatuation.com/los-angeles/reviews/barr-seco',
  },
  {
    slug: 'seco',
    sourceName: 'TimeOut',
    url: 'https://www.timeout.com/los-angeles/bars/seco',
  },
];

async function main() {
  console.log('Seeding coverage sources...\n');

  const slugs = [...new Set(COVERAGE_LINKS.map((l) => l.slug))];
  const entities = await db.entities.findMany({
    where: { slug: { in: slugs } },
    select: { id: true, slug: true },
  });

  const slugToId = new Map(entities.map((e) => [e.slug, e.id]));

  let created = 0;
  let skipped = 0;

  for (const link of COVERAGE_LINKS) {
    const entityId = slugToId.get(link.slug);
    if (!entityId) {
      console.warn(`  ⚠ Entity not found for slug "${link.slug}", skipping ${link.sourceName}`);
      skipped++;
      continue;
    }

    await db.coverage_sources.upsert({
      where: { entityId_url: { entityId, url: link.url } },
      create: {
        entityId,
        source_name: link.sourceName,
        url: link.url,
        excerpt: link.excerpt ?? null,
        published_at: link.publishedAt ? new Date(link.publishedAt) : null,
      },
      update: {
        source_name: link.sourceName,
        excerpt: link.excerpt ?? null,
        published_at: link.publishedAt ? new Date(link.publishedAt) : null,
      },
    });
    console.log(`  ✓ ${link.slug} — ${link.sourceName}`);
    created++;
  }

  console.log(`\n✅ Done. ${created} upserted, ${skipped} skipped.\n`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
