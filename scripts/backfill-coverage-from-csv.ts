/**
 * Backfill coverage from CSV for high-priority places
 * 
 * CSV Format:
 *   slug,publication,url,quote,excerpt
 * 
 * Usage:
 *   npx tsx scripts/backfill-coverage-from-csv.ts coverage-backfill.csv
 */

import { db } from '@/lib/db';
import { requireActiveCityId } from '@/lib/active-city';
import Papa from 'papaparse';
import * as fs from 'fs';

interface CoverageRow {
  slug: string;
  publication: string;
  url: string;
  quote?: string;
  excerpt?: string;
}

async function main() {
  const csvPath = process.argv[2] || './coverage-backfill.csv';
  
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ CSV file not found: ${csvPath}`);
    process.exit(1);
  }

  const cityId = await requireActiveCityId();
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  
  // Parse CSV with Papa Parse (handles quoted fields, commas in content, etc.)
  const result = Papa.parse<CoverageRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (result.errors.length > 0) {
    console.error('❌ CSV parsing errors:', result.errors);
    process.exit(1);
  }

  const rows = result.data;
  
  console.log(`🚀 Processing ${rows.length} coverage entries...\n`);
  
  let stats = {
    processed: 0,
    created: 0,
    skipped: 0,
    errors: 0,
  };

  for (const row of rows) {
    try {
      // Validate required fields
      if (!row.slug?.trim() || !row.publication?.trim() || !row.url?.trim()) {
        console.warn(`⚠️  Skipping row (missing required fields):`, row);
        stats.skipped++;
        continue;
      }

      const slug = row.slug.trim();
      const publication = row.publication.trim();
      const url = row.url.trim();
      const quote = row.quote?.trim() || null;
      const excerpt = row.excerpt?.trim() || null;

      // Find place by slug (LA only)
      const place = await db.places.findFirst({
        where: { slug, cityId },
      });

      if (!place) {
        console.warn(`⚠️  Place not found: ${slug}`);
        stats.skipped++;
        continue;
      }

      // Upsert source by name (unique constraint)
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

      // Check if coverage already exists (no unique constraint, must query first)
      const existing = await db.place_coverages.findFirst({
        where: {
          placeId: place.id,
          sourceId: source.id,
          url,
        },
      });

      if (existing) {
        // Update existing coverage
        await db.place_coverages.update({
          where: { id: existing.id },
          data: {
            quote,
            excerpt,
          },
        });
        console.log(`✓ Updated: ${slug} → ${publication}`);
      } else {
        // Create new coverage
        await db.place_coverages.create({
          data: {
            placeId: place.id,
            sourceId: source.id,
            cityId,
            url,
            quote,
            excerpt,
            status: 'APPROVED',
          },
        });
        console.log(`✓ Created: ${slug} → ${publication}`);
        stats.created++;
      }

      stats.processed++;
    } catch (error) {
      console.error(`❌ Error processing ${row.slug}:`, error);
      stats.errors++;
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   Processed: ${stats.processed}`);
  console.log(`   Created: ${stats.created}`);
  console.log(`   Skipped: ${stats.skipped}`);
  console.log(`   Errors: ${stats.errors}`);

  // Show updated coverage rate
  const totalPlaces = await db.places.count({ where: { cityId } });
  const coveredPlaces = await db.places.count({
    where: {
      cityId,
      coverages: {
        some: {
          status: 'APPROVED',
        },
      },
    },
  });

  console.log(`\n📈 Coverage Rate:`);
  console.log(`   Total LA places: ${totalPlaces}`);
  console.log(`   With coverage: ${coveredPlaces}`);
  console.log(`   Rate: ${Math.round((coveredPlaces / totalPlaces) * 100)}%`);
}

main()
  .catch((e) => {
    console.error('Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
