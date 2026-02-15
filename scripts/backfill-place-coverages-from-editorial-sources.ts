/**
 * Backfill place_coverages from editorialSources JSON
 * 
 * Scope: LA places only
 * Strategy: Idempotent - safe to run multiple times
 * 
 * Run: npx tsx scripts/backfill-place-coverages-from-editorial-sources.ts
 */

import { db } from '@/lib/db';

const LA_CITY_ID = 'cmln5lxe70004kf1yl8wdd4gl';

interface EditorialSourceJSON {
  url: string;
  publication?: string;
  name?: string;
  title?: string;
  content?: string;
  excerpt?: string;
  published_at?: string;
  publishedAt?: string;
}

function parseDate(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;
  try {
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? null : parsed;
  } catch {
    return null;
  }
}

function extractDomain(url: string): string {
  try {
    const domain = new URL(url).hostname.replace(/^www\./, '');
    // Capitalize first letter
    return domain.charAt(0).toUpperCase() + domain.slice(1);
  } catch {
    return 'Unknown';
  }
}

function normalizePublication(item: EditorialSourceJSON): string {
  return item.publication || item.name || extractDomain(item.url) || 'Unknown';
}

async function main() {
  console.log('🚀 Starting editorial sources migration...\n');

  // Fetch LA places with editorial sources
  const places = await db.places.findMany({
    where: {
      cityId: LA_CITY_ID,
      editorialSources: {
        not: null,
      },
    },
    select: {
      id: true,
      name: true,
      editorialSources: true,
    },
  });

  console.log(`📊 Found ${places.length} LA places with editorial sources\n`);

  let stats = {
    processed: 0,
    sourcesCreated: 0,
    coveragesCreated: 0,
    skippedNoUrl: 0,
    errors: 0,
  };

  for (const place of places) {
    try {
      const sources = place.editorialSources as unknown as EditorialSourceJSON[];
      if (!Array.isArray(sources)) {
        console.log(`⚠️  ${place.name}: editorialSources is not an array, skipping`);
        continue;
      }

      stats.processed++;

      for (const item of sources) {
        // Skip entries without URL
        if (!item.url || !item.url.trim()) {
          stats.skippedNoUrl++;
          continue;
        }

        const publication = normalizePublication(item);
        const title = item.title ?? null;
        const excerpt = item.excerpt ?? null;
        const quote = item.content ?? null;
        const publishedAt = parseDate(item.published_at || item.publishedAt);

        // Upsert source by name
        const source = await db.sources.upsert({
          where: { name: publication },
          update: {}, // No-op if exists
          create: {
            name: publication,
            type: 'PUBLICATION',
            status: 'APPROVED',
            approvedAt: new Date(),
          },
        });

        if (!source) {
          console.log(`❌ Failed to upsert source: ${publication}`);
          stats.errors++;
          continue;
        }

        // Only create if first time - check if coverage already exists
        const existing = await db.place_coverages.findFirst({
          where: {
            placeId: place.id,
            sourceId: source.id,
            url: item.url,
          },
        });

        if (existing) {
          // Already exists, skip
          continue;
        }

        stats.sourcesCreated++;

        // Create place coverage
        await db.place_coverages.create({
          data: {
            placeId: place.id,
            sourceId: source.id,
            cityId: LA_CITY_ID,
            url: item.url,
            title,
            excerpt,
            quote,
            quoteAuthor: null,
            publishedAt,
            status: 'APPROVED',
          },
        });

        stats.coveragesCreated++;
      }
    } catch (error) {
      console.error(`❌ Error processing ${place.name}:`, error);
      stats.errors++;
    }
  }

  console.log('\n✅ Migration complete!\n');
  console.log('📊 Final Stats:');
  console.log(`   Processed: ${stats.processed} places`);
  console.log(`   Sources created: ${stats.sourcesCreated}`);
  console.log(`   Coverages created: ${stats.coveragesCreated}`);
  console.log(`   Skipped (no URL): ${stats.skippedNoUrl}`);
  console.log(`   Errors: ${stats.errors}`);

  // Verification query
  const totalCoverages = await db.place_coverages.count();
  const totalSources = await db.sources.count();
  
  console.log('\n🔍 Verification:');
  console.log(`   Total place_coverages in DB: ${totalCoverages}`);
  console.log(`   Total sources in DB: ${totalSources}`);
}

main()
  .catch((e) => {
    console.error('Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
