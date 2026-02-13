#!/usr/bin/env node
/**
 * Migrate Scope & Region Data
 *
 * Migrates from old scope system to new scope + region system:
 * - Old: scope = 'la_county' | 'travel' | 'archive'
 * - New: scope = 'active' | 'future_region' | 'archive'
 *        region = 'la_county' | 'ojai' | 'napa' | null
 *
 * Detection logic (priority order):
 * 1. County field (if available) - most reliable
 * 2. City allowlist - strong signal
 * 3. Fallback to 'future_region' with null region
 *
 * Usage:
 *   npm run migrate:scope              # dry run, show report
 *   npm run migrate:scope -- --apply   # execute migration
 */

import { PrismaClient } from '@prisma/client';
import { writeFileSync } from 'fs';

const prisma = new PrismaClient();

const DRY_RUN = !process.argv.includes('--apply');

// LA County cities (curated allowlist)
const LA_COUNTY_CITIES = new Set([
  'los angeles', 'long beach', 'santa monica', 'venice', 'culver city',
  'manhattan beach', 'hermosa beach', 'redondo beach', 'el segundo',
  'hawthorne', 'inglewood', 'torrance', 'carson', 'pasadena', 'glendale',
  'burbank', 'alhambra', 'monterey park', 'san gabriel', 'arcadia',
  'temple city', 'rosemead', 'san marino', 'south pasadena', 'monrovia',
  'west covina', 'pomona', 'walnut', 'diamond bar', 'la puente',
  'compton', 'lynwood', 'downey', 'norwalk', 'whittier', 'pico rivera',
  'montebello', 'el monte', 'baldwin park', 'west hollywood', 'beverly hills',
  'malibu', 'marina del rey', 'san pedro', 'wilmington', 'cerritos',
  'artesia', 'bellflower', 'lakewood', 'signal hill', 'paramount',
  'maywood', 'huntington park', 'bell', 'bell gardens', 'cudahy',
  'vernon', 'commerce', 'la mirada', 'san dimas', 'la verne', 'claremont',
  'glendora', 'azusa', 'duarte', 'sierra madre', 'san fernando',
  'la cañada flintridge', 'la canada flintridge', 'calabasas',
  'agoura hills', 'westlake village', 'hidden hills', 'rolling hills',
  'rolling hills estates', 'palos verdes estates', 'rancho palos verdes',
  'lawndale', 'gardena', 'lennox', 'westmont', 'south el monte',
  'valinda', 'hacienda heights', 'rowland heights', 'industry',
  'la habra heights', 'bradbury', 'irwindale', 'covina', 'charter oak',
  'avocado heights', 'south san gabriel', 'altadena', 'la crescenta',
  'tujunga', 'sunland', 'sylmar', 'pacoima', 'arleta', 'sun valley',
  'north hollywood', 'valley village', 'studio city', 'sherman oaks',
  'van nuys', 'encino', 'tarzana', 'woodland hills', 'winnetka',
  'reseda', 'northridge', 'porter ranch', 'granada hills', 'chatsworth',
  'canoga park', 'west hills',
]);

function detectNewScope(place: any): {
  scope: 'active' | 'future_region' | 'archive';
  region: string | null;
  reason: string;
} {
  // Preserve archive status
  if (place.scope === 'archive') {
    return { scope: 'archive', region: null, reason: 'Already archived' };
  }

  // PRIORITY 1: County field (most reliable)
  if (place.county) {
    if (place.county === 'Los Angeles County') {
      return { scope: 'active', region: 'la_county', reason: `County: ${place.county}` };
    }
    // Non-LA County = future region
    return { scope: 'future_region', region: null, reason: `County: ${place.county}` };
  }

  // PRIORITY 2: City allowlist (strong signal)
  if (place.city && LA_COUNTY_CITIES.has(place.city.toLowerCase())) {
    return { scope: 'active', region: 'la_county', reason: `City: ${place.city}` };
  }

  // PRIORITY 3: Outside US = future region
  if (place.country && place.country !== 'US') {
    return { scope: 'future_region', region: null, reason: `Country: ${place.country}` };
  }

  // PRIORITY 4: Outside CA = future region
  if (place.state && place.state !== 'CA') {
    return { scope: 'future_region', region: null, reason: `State: ${place.state}` };
  }

  // PRIORITY 5: CA but not in city allowlist = future region
  if (place.state === 'CA') {
    return { scope: 'future_region', region: null, reason: 'CA - not LA County city' };
  }

  // FALLBACK: Missing location data = future region (manual review needed)
  return { scope: 'future_region', region: null, reason: 'No location data' };
}

async function migrateScopeRegion() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('SCOPE & REGION MIGRATION');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log(`Mode: ${DRY_RUN ? '⚠️  DRY RUN' : '✅ LIVE UPDATE'}`);

  // Get all places
  const places = await prisma.places.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      city: true,
      state: true,
      country: true,
      county: true,
      scope: true,
      region: true,
    },
    orderBy: { name: 'asc' },
  });

  console.log(`Total places: ${places.length}\n`);

  const updates: Array<{
    id: string;
    name: string;
    slug: string;
    oldScope: string | null;
    oldRegion: string | null;
    newScope: 'active' | 'future_region' | 'archive';
    newRegion: string | null;
    reason: string;
  }> = [];

  let unchanged = 0;

  for (const place of places) {
    const detection = detectNewScope(place);

    // Check if changes needed
    const scopeChanged = place.scope !== detection.scope;
    const regionChanged = place.region !== detection.region;

    if (!scopeChanged && !regionChanged) {
      unchanged++;
      continue;
    }

    updates.push({
      id: place.id,
      name: place.name,
      slug: place.slug,
      oldScope: place.scope,
      oldRegion: place.region,
      newScope: detection.scope,
      newRegion: detection.region,
      reason: detection.reason,
    });
  }

  // Generate report
  const report = {
    timestamp: new Date().toISOString(),
    dryRun: DRY_RUN,
    total: places.length,
    unchanged,
    toUpdate: updates.length,
    breakdown: {
      active_la_county: updates.filter((u) => u.newScope === 'active' && u.newRegion === 'la_county')
        .length,
      active_other: updates.filter((u) => u.newScope === 'active' && u.newRegion !== 'la_county')
        .length,
      future_region: updates.filter((u) => u.newScope === 'future_region').length,
      archive: updates.filter((u) => u.newScope === 'archive').length,
    },
    updates,
  };

  writeFileSync('scope-migration-review.json', JSON.stringify(report, null, 2));

  console.log('═'.repeat(80));
  console.log('\n📊 SCOPE MIGRATION REPORT\n');
  console.log(`Total places: ${report.total}`);
  console.log(`Unchanged: ${report.unchanged} (${Math.round((report.unchanged / report.total) * 100)}%)`);
  console.log(`To update: ${report.toUpdate} (${Math.round((report.toUpdate / report.total) * 100)}%)\n`);
  
  console.log('New distribution:');
  console.log(`  → Active (LA County): ${report.breakdown.active_la_county}`);
  console.log(`  → Active (Other): ${report.breakdown.active_other}`);
  console.log(`  → Future Region: ${report.breakdown.future_region}`);
  console.log(`  → Archive: ${report.breakdown.archive}\n`);

  if (report.toUpdate > 0) {
    console.log('Sample changes:\n');
    updates.slice(0, 10).forEach((u, i) => {
      console.log(`${i + 1}. ${u.name}`);
      console.log(`   Scope: ${u.oldScope || 'null'} → ${u.newScope}`);
      console.log(`   Region: ${u.oldRegion || 'null'} → ${u.newRegion || 'null'}`);
      console.log(`   Reason: ${u.reason}\n`);
    });

    if (updates.length > 10) {
      console.log(`... and ${updates.length - 10} more\n`);
    }
  }

  console.log('═'.repeat(80));
  console.log('\n📄 Full report: scope-migration-review.json\n');

  if (DRY_RUN) {
    console.log('💡 NEXT STEPS:\n');
    console.log('1. Review scope-migration-review.json');
    console.log('2. Run with --apply to execute migration:');
    console.log('   npm run migrate:scope -- --apply\n');
    return;
  }

  // Apply updates with batched transactions
  console.log('⏳ Applying updates...\n');

  // Group by scope/region combination for batch updates
  const byUpdate = new Map<string, string[]>();
  
  for (const update of updates) {
    const key = `${update.newScope}:${update.newRegion || 'null'}`;
    if (!byUpdate.has(key)) byUpdate.set(key, []);
    byUpdate.get(key)!.push(update.id);
  }

  let batchUpdated = 0;
  for (const [key, ids] of byUpdate.entries()) {
    const [scope, region] = key.split(':');
    const regionValue = region === 'null' ? null : region;

    await prisma.places.updateMany({
      where: { id: { in: ids } },
      data: {
        scope: scope as 'active' | 'future_region' | 'archive',
        region: regionValue,
      },
    });

    batchUpdated += ids.length;
    console.log(`Updated ${ids.length} places: scope=${scope}, region=${regionValue}`);
  }

  console.log(`\n✅ Updated ${batchUpdated} places\n`);
  console.log('═'.repeat(80));
  console.log('\nNext step: Verify results:');
  console.log('  npm run enrich:audit:curated\n');
}

migrateScopeRegion()
  .then(() => {
    prisma.$disconnect();
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    prisma.$disconnect();
    process.exit(1);
  });
