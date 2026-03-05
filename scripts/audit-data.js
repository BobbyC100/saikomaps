#!/usr/bin/env node
/**
 * Merchant Page Data Audit Script
 * 
 * Checks which places are missing key data fields for the merchant page
 * 
 * Usage:
 *   node scripts/audit-data.js --all           # Check all fields
 *   node scripts/audit-data.js --field name    # Check specific field
 *   node scripts/audit-data.js --summary       # Show summary stats
 *   node scripts/audit-data.js --complete      # Show places with complete data
 * 
 * Available fields:
 *   instagram, phone, website, pullQuote, curatorNote,
 *   sources, restaurantGroup, priceLevel
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Field configurations
const FIELDS = {
  instagram: {
    name: 'Instagram Handle',
    check: (place) => !place.instagram || place.instagram === '',
    importance: 'high',
    display: (place) => place.instagram || '—',
  },
  phone: {
    name: 'Phone Number',
    check: (place) => !place.phone || place.phone === '',
    importance: 'high',
    display: (place) => place.phone || '—',
  },
  website: {
    name: 'Website',
    check: (place) => !place.website || place.website === '' || place.website.includes('instagram.com'),
    importance: 'medium',
    display: (place) => place.website || '—',
  },
  pullQuote: {
    name: 'Pull Quote (Editorial)',
    check: (place) => !place.pullQuote || place.pullQuote === '',
    importance: 'medium',
    display: (place) => place.pullQuote ? '✓ Has quote' : '—',
  },
  curatorNote: {
    name: 'Curator Note',
    check: (place) => {
      // Curator notes are stored in mapPlaces.descriptor
      const hasMapNote = place.mapPlaces?.some(mp => mp.descriptor && mp.descriptor !== '');
      return !hasMapNote;
    },
    importance: 'low',
    display: (place) => {
      if (place.mapPlaces?.some(mp => mp.descriptor)) return '✓ Has note';
      return '—';
    },
  },
  sources: {
    name: 'Editorial Sources',
    check: (place) => {
      if (!place.sources) return true;
      const sources = typeof place.sources === 'string' 
        ? JSON.parse(place.sources)
        : place.sources;
      return !Array.isArray(sources) || sources.length === 0;
    },
    importance: 'medium',
    display: (place) => {
      if (!place.sources) return '—';
      try {
        const sources = typeof place.sources === 'string' 
          ? JSON.parse(place.sources)
          : place.sources;
        return Array.isArray(sources) && sources.length > 0 ? `${sources.length} sources` : '—';
      } catch {
        return '—';
      }
    },
  },
  priceLevel: {
    name: 'Price Level',
    check: (place) => !place.priceLevel || place.priceLevel === 0,
    importance: 'low',
    display: (place) => place.priceLevel ? '$'.repeat(place.priceLevel) : '—',
  },
  restaurantGroup: {
    name: 'Restaurant Group',
    check: (place) => !place.restaurantGroup,
    importance: 'low',
    display: (place) => place.restaurantGroup?.name || '—',
  },
};

async function auditField(fieldName) {
  const config = FIELDS[fieldName];
  if (!config) {
    console.error(`❌ Unknown field: ${fieldName}`);
    console.error(`   Available: ${Object.keys(FIELDS).join(', ')}\n`);
    process.exit(1);
  }

  console.log(`\n🔍 Auditing: ${config.name}\n`);

  const places = await prisma.place.findMany({
    select: {
      slug: true,
      name: true,
      [fieldName]: true,
      ...(fieldName === 'curatorNote' && { mapPlaces: { select: { descriptor: true } } }),
      ...(fieldName === 'restaurantGroup' && { restaurantGroup: { select: { name: true } } }),
    },
    orderBy: { name: 'asc' },
  });

  const missing = places.filter(config.check);
  const total = places.length;
  const percent = ((missing.length / total) * 100).toFixed(1);

  console.log(`📊 Stats:`);
  console.log(`   Missing: ${missing.length} / ${total} (${percent}%)`);
  console.log(`   Has data: ${total - missing.length} / ${total} (${(100 - percent).toFixed(1)}%)`);
  console.log(`   Importance: ${config.importance.toUpperCase()}\n`);

  if (missing.length > 0) {
    console.log(`Places missing ${config.name}:\n`);
    console.log('SLUG                          | NAME');
    console.log('------------------------------|--------------------------------');
    
    missing.slice(0, 50).forEach(place => {
      const slug = place.slug.padEnd(30);
      console.log(`${slug}| ${place.name}`);
    });

    if (missing.length > 50) {
      console.log(`\n... and ${missing.length - 50} more`);
    }
  }

  console.log('');
}

async function showSummary() {
  console.log('\n📊 Merchant Page Data Audit Summary\n');

  const places = await prisma.place.findMany({
    select: {
      slug: true,
      name: true,
      instagram: true,
      phone: true,
      website: true,
      pullQuote: true,
      sources: true,
      priceLevel: true,
      restaurantGroupId: true,
      mapPlaces: { select: { descriptor: true } },
      restaurantGroup: { select: { name: true } },
    },
  });

  const total = places.length;
  const stats = {};

  // Calculate stats for each field
  for (const [fieldName, config] of Object.entries(FIELDS)) {
    const missing = places.filter(config.check).length;
    const has = total - missing;
    const percent = ((has / total) * 100).toFixed(1);
    
    stats[fieldName] = {
      name: config.name,
      has,
      missing,
      percent,
      importance: config.importance,
    };
  }

  // Display by importance
  console.log('HIGH PRIORITY FIELDS:');
  console.log('─'.repeat(70));
  Object.entries(stats)
    .filter(([_, s]) => s.importance === 'high')
    .forEach(([field, s]) => {
      const bar = '█'.repeat(Math.floor(s.percent / 5)) + '░'.repeat(20 - Math.floor(s.percent / 5));
      console.log(`${s.name.padEnd(25)} ${bar} ${s.percent}% (${s.has}/${total})`);
    });

  console.log('\nMEDIUM PRIORITY FIELDS:');
  console.log('─'.repeat(70));
  Object.entries(stats)
    .filter(([_, s]) => s.importance === 'medium')
    .forEach(([field, s]) => {
      const bar = '█'.repeat(Math.floor(s.percent / 5)) + '░'.repeat(20 - Math.floor(s.percent / 5));
      console.log(`${s.name.padEnd(25)} ${bar} ${s.percent}% (${s.has}/${total})`);
    });

  console.log('\nLOW PRIORITY FIELDS:');
  console.log('─'.repeat(70));
  Object.entries(stats)
    .filter(([_, s]) => s.importance === 'low')
    .forEach(([field, s]) => {
      const bar = '█'.repeat(Math.floor(s.percent / 5)) + '░'.repeat(20 - Math.floor(s.percent / 5));
      console.log(`${s.name.padEnd(25)} ${bar} ${s.percent}% (${s.has}/${total})`);
    });

  console.log('\n💡 Recommended Actions:');
  console.log('   1. Focus on HIGH priority fields first (Instagram, Phone, Website)');
  console.log('   2. Editorial content (Pull Quote, Sources) improves page quality');
  console.log('   3. Curator Notes and Vibe Tags are nice-to-have\n');
}

async function showComplete() {
  console.log('\n✅ Places with Complete Data\n');

  const places = await prisma.place.findMany({
    select: {
      slug: true,
      name: true,
      instagram: true,
      phone: true,
      website: true,
      pullQuote: true,
      sources: true,
      priceLevel: true,
      mapPlaces: { select: { descriptor: true } },
      restaurantGroup: { select: { name: true } },
    },
    orderBy: { name: 'asc' },
  });

  const complete = places.filter(place => {
    return Object.values(FIELDS).every(config => !config.check(place));
  });

  if (complete.length === 0) {
    console.log('❌ No places have 100% complete data yet\n');
    
    // Show closest
    const scored = places.map(place => {
      const score = Object.values(FIELDS).filter(config => !config.check(place)).length;
      return { place, score };
    }).sort((a, b) => b.score - a.score);

    console.log('🎯 Closest to complete (top 10):\n');
    console.log('SLUG                          | NAME                           | Score');
    console.log('------------------------------|--------------------------------|-------');
    
    scored.slice(0, 10).forEach(({ place, score }) => {
      const slug = place.slug.padEnd(30);
      const name = place.name.padEnd(32);
      console.log(`${slug}| ${name}| ${score}/${Object.keys(FIELDS).length}`);
    });
  } else {
    console.log(`Found ${complete.length} places with complete data:\n`);
    console.log('SLUG                          | NAME');
    console.log('------------------------------|--------------------------------');
    
    complete.forEach(place => {
      const slug = place.slug.padEnd(30);
      console.log(`${slug}| ${place.name}`);
    });
  }

  console.log('');
}

async function auditAll() {
  console.log('\n🔍 Full Data Audit - All Fields\n');

  for (const fieldName of Object.keys(FIELDS)) {
    await auditField(fieldName);
    console.log('─'.repeat(70));
  }

  await showSummary();
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
📊 Merchant Page Data Audit

Usage:
  node scripts/audit-data.js --all
    Check all fields

  node scripts/audit-data.js --field FIELD_NAME
    Check specific field

  node scripts/audit-data.js --summary
    Show summary statistics

  node scripts/audit-data.js --complete
    Show places with complete data

Available Fields:
  ${Object.keys(FIELDS).join(', ')}

Examples:
  node scripts/audit-data.js --summary
  node scripts/audit-data.js --field instagram
  node scripts/audit-data.js --all
`);
    await prisma.$disconnect();
    process.exit(0);
  }

  const command = args[0];

  try {
    if (command === '--all' || command === '-a') {
      await auditAll();
    } else if (command === '--field' || command === '-f') {
      if (!args[1]) {
        console.error('❌ Please specify a field name\n');
        console.error(`   Available: ${Object.keys(FIELDS).join(', ')}\n`);
        process.exit(1);
      }
      await auditField(args[1]);
    } else if (command === '--summary' || command === '-s') {
      await showSummary();
    } else if (command === '--complete' || command === '-c') {
      await showComplete();
    } else {
      console.error(`❌ Unknown command: ${command}\n`);
      console.error('   Run with --help for usage information\n');
      process.exit(1);
    }
  } catch (error) {
    console.error(`\n❌ Fatal error: ${error.message}\n`);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
