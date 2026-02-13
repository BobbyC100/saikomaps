#!/usr/bin/env node
/**
 * Tag Place Scopes
 *
 * Automatically detects and tags places as 'la_county', 'travel', or 'archive'
 * based on ZIP code, city, state, and neighborhood.
 *
 * Detection priority:
 * 1. ZIP code (strongest signal - unambiguous)
 * 2. City + State (strong)
 * 3. Neighborhood + State (medium, only if CA confirmed)
 * 4. Address parsing (weakest, last resort)
 *
 * Usage:
 *   npm run tag:scopes              # dry run
 *   npm run tag:scopes -- --execute # apply changes
 *   npm run tag:scopes -- --force   # override manual archive tags
 */

import { PrismaClient } from '@prisma/client';
import { writeFileSync } from 'fs';

const prisma = new PrismaClient();

const DRY_RUN = !process.argv.includes('--execute');
const FORCE = process.argv.includes('--force');

// LA County ZIP code ranges (complete)
const LA_COUNTY_ZIP_RANGES = [
  [90001, 90089], // Central LA
  [90091, 90095], // UCLA, VA
  [90201, 90213], // South LA (Compton, Lynwood, etc.)
  [90220, 90280], // South Bay (Torrance, Hawthorne, etc.)
  [90290, 90296], // Beach cities (Manhattan, Hermosa, Venice)
  [90301, 90311], // Inglewood area
  [90401, 90411], // Santa Monica
  [90501, 90510], // Torrance
  [90601, 90610], // Whittier
  [90640, 90660], // East LA (Montebello, Pico Rivera)
  [90701, 90716], // Gateway Cities (Artesia, Cerritos, etc.)
  [90717, 90747], // Wilmington, San Pedro, Harbor
  [90755, 90810], // Long Beach, Signal Hill
  [91001, 91025], // Pasadena area
  [91030, 91031], // South Pasadena
  [91040, 91046], // Sunland, Tujunga
  [91101, 91126], // Pasadena proper
  [91201, 91210], // Glendale
  [91301, 91372], // San Fernando Valley (parts)
  [91401, 91499], // Valley: Van Nuys, Sherman Oaks, Encino, Tarzana
  [91501, 91526], // Burbank area
  [91601, 91618], // North Hollywood, Valley Village
  [91701, 91716], // San Gabriel Valley (parts)
  [91722, 91793], // SGV: West Covina, Diamond Bar, Temple City, Walnut
  [91801, 91899], // SGV: Alhambra, San Gabriel, etc.
];

// LA County cities
const LA_COUNTY_CITIES = [
  'los angeles',
  'santa monica',
  'venice',
  'culver city',
  'manhattan beach',
  'hermosa beach',
  'redondo beach',
  'el segundo',
  'hawthorne',
  'inglewood',
  'torrance',
  'carson',
  'long beach',
  'pasadena',
  'glendale',
  'burbank',
  'alhambra',
  'monterey park',
  'san gabriel',
  'arcadia',
  'monrovia',
  'west covina',
  'pomona',
  'compton',
  'lynwood',
  'south gate',
  'downey',
  'norwalk',
  'whittier',
  'pico rivera',
  'montebello',
  'el monte',
  'baldwin park',
  'la puente',
  'west hollywood',
  'beverly hills',
  'malibu',
  'marina del rey',
  'san pedro',
  'wilmington',
  'cerritos',
  'artesia',
  'bellflower',
  'lakewood',
  'signal hill',
  'paramount',
  'maywood',
  'huntington park',
  'bell',
  'bell gardens',
  'cudahy',
  'vernon',
  'commerce',
  'walnut',
  'diamond bar',
  'la mirada',
  'san dimas',
  'la verne',
  'claremont',
  'glendora',
  'azusa',
  'duarte',
  'sierra madre',
  'south pasadena',
  'san marino',
  'temple city',
  'rosemead',
  'san fernando',
  'la cañada flintridge',
  'la canada flintridge',
  'calabasas',
  'agoura hills',
  'westlake village',
  'hidden hills',
  'rolling hills',
  'rolling hills estates',
  'palos verdes estates',
  'rancho palos verdes',
  'lawndale',
  'gardena',
  'lennox',
  'westmont',
];

// LA County neighborhoods (for when city is "Los Angeles")
const LA_COUNTY_NEIGHBORHOODS = [
  'downtown la',
  'downtown',
  'arts district',
  'little tokyo',
  'chinatown',
  'fashion district',
  'jewelry district',
  'toy district',
  'echo park',
  'silver lake',
  'los feliz',
  'highland park',
  'eagle rock',
  'mount washington',
  'cypress park',
  'glassell park',
  'lincoln heights',
  'el sereno',
  'boyle heights',
  'koreatown',
  'mid-city',
  'mid city',
  'west adams',
  'jefferson park',
  'leimert park',
  'crenshaw',
  'exposition park',
  'university park',
  'south la',
  'south los angeles',
  'watts',
  'florence',
  'westlake',
  'pico-union',
  'pico union',
  'macarthur park',
  'westside',
  'west la',
  'west los angeles',
  'sawtelle',
  'palms',
  'mar vista',
  'venice',
  'marina del rey',
  'playa vista',
  'playa del rey',
  'westchester',
  'century city',
  'beverlywood',
  'cheviot hills',
  'rancho park',
  'brentwood',
  'bel air',
  'pacific palisades',
  'sunset strip',
  'hollywood',
  'west hollywood',
  'east hollywood',
  'thai town',
  'little armenia',
  'hancock park',
  'larchmont',
  'windsor square',
  'miracle mile',
  'carthay',
  'fairfax',
  'grove',
  'melrose',
  'studio city',
  'north hollywood',
  'valley village',
  'van nuys',
  'sherman oaks',
  'encino',
  'tarzana',
  'woodland hills',
  'canoga park',
  'winnetka',
  'reseda',
  'northridge',
  'granada hills',
  'chatsworth',
  'porter ranch',
  'sylmar',
  'pacoima',
  'sun valley',
  'sunland',
  'tujunga',
  'verdugo city',
  'atwater village',
  'elysian valley',
  'elysian park',
  'griffith park',
  'san pedro',
  'wilmington',
  'harbor city',
  'harbor gateway',
];

function isLACountyZip(zip: string | null | undefined): boolean {
  if (!zip) return false;
  const zipNum = parseInt(zip.slice(0, 5), 10);
  if (isNaN(zipNum)) return false;

  return LA_COUNTY_ZIP_RANGES.some(
    ([min, max]) => zipNum >= min && zipNum <= max
  );
}

function detectScope(
  place: any
): 'la_county' | 'travel' | 'archive' {
  // Don't override manual archive tags unless --force
  if (!FORCE && place.scope === 'archive') return 'archive';

  const zip = place.zip;
  const state = (place.state || '').toLowerCase();
  const country = (place.country || '').toLowerCase();
  const city = (place.city || '').toLowerCase();
  const neighborhood = (place.neighborhood || '').toLowerCase();
  const address = (place.address || '').toLowerCase();

  // 1. ZIP CODE (strongest signal - unambiguous)
  if (zip) {
    if (isLACountyZip(zip)) return 'la_county';
    // US ZIP but not LA County = travel
    if (/^\d{5}$/.test(zip)) return 'travel';
  }

  // 2. MUST BE US + CA for LA County consideration
  const isCA =
    state === 'ca' ||
    state === 'california' ||
    address.includes(', ca ') ||
    address.includes(' california');

  const isUS =
    country === 'us' ||
    country === 'usa' ||
    country === 'united states' ||
    address.includes(' usa') ||
    address.includes(' united states') ||
    (!country && isCA); // Assume US if CA and no country specified

  if (!isUS || !isCA) return 'travel';

  // 3. CITY MATCH (strong signal within CA)
  if (city && LA_COUNTY_CITIES.includes(city)) {
    return 'la_county';
  }

  // 4. NEIGHBORHOOD MATCH (medium signal, only when CA/US confirmed)
  if (neighborhood && LA_COUNTY_NEIGHBORHOODS.includes(neighborhood)) {
    return 'la_county';
  }

  // 5. ADDRESS PARSING (weakest signal)
  // Check if address contains LA County city names
  if (address) {
    for (const laCity of LA_COUNTY_CITIES) {
      if (address.includes(`, ${laCity},`) || address.includes(` ${laCity}, ca`)) {
        return 'la_county';
      }
    }
  }

  // Still in CA/US but not clearly LA County (e.g., San Diego, SF)
  return 'travel';
}

async function tagAllPlaces() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('TAG PLACE SCOPES');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log(`Mode: ${DRY_RUN ? '⚠️  DRY RUN' : '✅ LIVE UPDATE'}`);
  if (FORCE) console.log('Force mode: Will override archive tags');
  console.log('');

  // Get all places
  const places = await prisma.places.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      neighborhood: true,
      address: true,
      city: true,
      state: true,
      country: true,
      zip: true,
      scope: true,
    },
    orderBy: { name: 'asc' },
  });

  console.log(`Total places: ${places.length}\n`);

  const updates: Array<{
    id: string;
    name: string;
    slug: string;
    oldScope: string | null;
    newScope: 'la_county' | 'travel' | 'archive';
    reason: string;
  }> = [];

  let unchanged = 0;

  for (const place of places) {
    const detectedScope = detectScope(place);

    // Skip if already correct
    if (place.scope === detectedScope) {
      unchanged++;
      continue;
    }

    // Skip manual overrides unless --force
    if (!FORCE && place.scope === 'archive') {
      unchanged++;
      continue;
    }

    // Determine detection reason
    let reason = '';
    if (place.zip && isLACountyZip(place.zip)) {
      reason = `ZIP: ${place.zip}`;
    } else if (place.city && LA_COUNTY_CITIES.includes(place.city.toLowerCase())) {
      reason = `City: ${place.city}`;
    } else if (place.neighborhood && LA_COUNTY_NEIGHBORHOODS.includes(place.neighborhood.toLowerCase())) {
      reason = `Neighborhood: ${place.neighborhood}`;
    } else if (place.state?.toLowerCase() === 'ca') {
      reason = 'Address parsing (CA)';
    } else {
      reason = place.country || place.state || 'No location data';
    }

    updates.push({
      id: place.id,
      name: place.name,
      slug: place.slug,
      oldScope: place.scope,
      newScope: detectedScope,
      reason,
    });
  }

  // Generate report
  const report = {
    timestamp: new Date().toISOString(),
    total: places.length,
    unchanged,
    toUpdate: updates.length,
    breakdown: {
      la_county: updates.filter((u) => u.newScope === 'la_county').length,
      travel: updates.filter((u) => u.newScope === 'travel').length,
      archive: updates.filter((u) => u.newScope === 'archive').length,
    },
    updates,
  };

  writeFileSync('scope-review.json', JSON.stringify(report, null, 2));

  console.log('═'.repeat(80));
  console.log('\n📊 SCOPE TAGGING REPORT\n');
  console.log(`Total places: ${report.total}`);
  console.log(`Unchanged: ${report.unchanged} (${Math.round((report.unchanged / report.total) * 100)}%)`);
  console.log(`To update: ${report.toUpdate} (${Math.round((report.toUpdate / report.total) * 100)}%)\n`);
  console.log('New scope distribution:');
  console.log(`  → LA County: ${report.breakdown.la_county}`);
  console.log(`  → Travel: ${report.breakdown.travel}`);
  console.log(`  → Archive: ${report.breakdown.archive}\n`);

  if (report.toUpdate > 0) {
    console.log('Sample changes:\n');
    updates.slice(0, 10).forEach((u, i) => {
      console.log(`${i + 1}. ${u.name}`);
      console.log(`   ${u.oldScope || 'null'} → ${u.newScope}`);
      console.log(`   Reason: ${u.reason}\n`);
    });

    if (updates.length > 10) {
      console.log(`... and ${updates.length - 10} more\n`);
    }
  }

  console.log('═'.repeat(80));
  console.log('\n📄 Full report saved to: scope-review.json\n');

  if (DRY_RUN) {
    console.log('💡 NEXT STEPS:\n');
    console.log('1. Review scope-review.json');
    console.log('2. Run with --execute to apply changes:');
    console.log('   npm run tag:scopes -- --execute\n');
    return;
  }

  // Apply updates
  console.log('⏳ Applying updates...\n');

  let updated = 0;
  for (const update of updates) {
    await prisma.places.update({
      where: { id: update.id },
      data: { scope: update.newScope },
    });
    updated++;
    if (updated % 50 === 0) {
      process.stdout.write(`\rUpdated: ${updated}/${updates.length}`);
    }
  }

  console.log(`\n\n✅ Updated ${updated} places\n`);
  console.log('═'.repeat(80));
  console.log('\nNext step: Verify results with audit:');
  console.log('  npm run enrich:audit:curated\n');
}

tagAllPlaces()
  .then(() => {
    prisma.$disconnect();
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    prisma.$disconnect();
    process.exit(1);
  });
