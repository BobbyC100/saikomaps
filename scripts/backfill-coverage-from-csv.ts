/**
 * Backfill coverage from CSV for high-priority places
 * 
 * CSV Format:
 *   slug,publication,url,quote,excerpt
 * 
 * Usage:
 *   npx tsx scripts/backfill-coverage-from-csv.ts coverage-backfill.csv
 *   npx tsx scripts/backfill-coverage-from-csv.ts coverage-backfill.csv --strict --dry-run
 * 
 * Flags:
 *   --strict    Only process slugs from data/uncovered-la.csv (prevents double-coverage)
 *   --dry-run   Show what would be created without actually writing to DB
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
  // Parse command line arguments
  const args = process.argv.slice(2);
  
  const hasFlag = (f: string) => args.includes(f);
  const getArgValue = (f: string) => {
    const i = args.indexOf(f);
    return i >= 0 && i + 1 < args.length ? args[i + 1] : null;
  };

  const strictMode = hasFlag('--strict');
  const dryRun = hasFlag('--dry-run');
  const csvPath = getArgValue('--file') || args.find(arg => !arg.startsWith('--')) || './coverage-backfill.csv';
  
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ CSV file not found: ${csvPath}`);
    process.exit(1);
  }

  // Load uncovered slugs in strict mode
  let uncoveredSlugs: Set<string> | null = null;
  if (strictMode) {
    const uncoveredPath = './data/uncovered-la.csv';
    if (!fs.existsSync(uncoveredPath)) {
      console.error(`❌ Strict mode requires ${uncoveredPath}`);
      console.error('   Run: npx tsx scripts/get-uncovered-places.ts');
      process.exit(1);
    }
    const uncoveredCSV = fs.readFileSync(uncoveredPath, 'utf-8');
    const slugs = uncoveredCSV.split('\n').slice(1).map(line => line.split(',')[0]).filter(s => s);
    uncoveredSlugs = new Set(slugs);
    console.log(`🔒 Strict mode: Only processing ${uncoveredSlugs.size} uncovered places`);
  }

  if (dryRun) {
    console.log(`🔍 Dry run mode: No database writes will be performed`);
  }

  console.log('');

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
    wouldCreate: 0,
    created: 0,
    skipped: 0,
    skippedAlreadyCovered: 0,
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

      // Strict mode: check if slug is in uncovered list
      if (strictMode && uncoveredSlugs && !uncoveredSlugs.has(slug)) {
        console.warn(`⊘ ${slug} (already covered, skipping in strict mode)`);
        stats.skippedAlreadyCovered++;
        continue;
      }

      // Find place by slug (LA only)
      const place = await db.places.findFirst({
        where: { slug, cityId },
      });

      if (!place) {
        console.warn(`⚠️  Place not found: ${slug}`);
        stats.skipped++;
        continue;
      }

      // Dry run: show what would be created
      if (dryRun) {
        console.log(`[DRY RUN] Would create: ${slug} → ${publication}`);
        stats.wouldCreate++;
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
    } catch (error) {
      console.error(`❌ Error processing ${row.slug}:`, error);
      stats.errors++;
    }
  }

  console.log('\n📊 Summary:');
  if (dryRun) {
    console.log(`   Would create: ${stats.wouldCreate}`);
    console.log(`   Would skip (already covered): ${stats.skippedAlreadyCovered}`);
    console.log(`   Would skip (other): ${stats.skipped}`);
  } else {
    console.log(`   Created: ${stats.created}`);
    console.log(`   Skipped (already covered): ${stats.skippedAlreadyCovered}`);
    console.log(`   Skipped (other): ${stats.skipped}`);
  }
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
