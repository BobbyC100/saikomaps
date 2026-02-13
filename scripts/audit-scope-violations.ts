#!/usr/bin/env node
/**
 * Audit Scope Violations
 *
 * Finds places that violate the LA County restaurant scope:
 * - Outside California (Hawaii, Colorado, Florida, etc.)
 * - Non-restaurant entities (streets, parks, trails)
 * - Potentially closed businesses
 *
 * Usage:
 *   npm run audit:scope
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// States to exclude (not California)
const EXCLUDED_STATES = ['HI', 'CO', 'FL', 'NY', 'NJ', 'TX', 'NV', 'OR', 'WA', 'AZ'];

// Non-restaurant entity patterns
const NON_RESTAURANT_PATTERNS = [
  /\bStreet\b/i,
  /\bDrive\b/i,
  /\bWay\b/i,
  /\bRoad\b/i,
  /\bAvenue\b/i,
  /\bTrail\b/i,
  /\bPark\b/i,
  /\bHotel\b/i,
  /\bCondominium\b/i,
  /\bLounge\b/i,
  /\bVillage\b/i,
];

// Non-restaurant Google Types
const NON_RESTAURANT_TYPES = [
  'route',
  'street_address',
  'park',
  'lodging',
  'hotel',
  'trail',
  'natural_feature',
  'premise',
  'subpremise',
];

async function auditScopeViolations() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('SCOPE VIOLATION AUDIT - LA COUNTY RESTAURANTS ONLY');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Get all curated places
  const curatedIds = await prisma.provenance
    .findMany({ select: { place_id: true } })
    .then((r) => r.map((p) => p.place_id));

  const curatedPlaces = await prisma.places.findMany({
    where: { id: { in: curatedIds } },
    select: {
      id: true,
      slug: true,
      name: true,
      address: true,
      neighborhood: true,
      category: true,
      googleTypes: true,
    },
    orderBy: { name: 'asc' },
  });

  console.log(`Total curated places: ${curatedPlaces.length}\n`);

  const violations = {
    outsideCalifornia: [] as typeof curatedPlaces,
    nonRestaurantName: [] as typeof curatedPlaces,
    nonRestaurantType: [] as typeof curatedPlaces,
    noAddress: [] as typeof curatedPlaces,
  };

  for (const place of curatedPlaces) {
    // Check 1: Outside California
    if (place.address) {
      const addressUpper = place.address.toUpperCase();
      
      // Check if address doesn't contain "CA" or contains other state codes
      const hasCA = addressUpper.includes(', CA ') || addressUpper.endsWith(', CA');
      const hasOtherState = EXCLUDED_STATES.some(state => 
        addressUpper.includes(`, ${state} `) || addressUpper.includes(`, ${state},`)
      );
      
      // Special check for countries (Croatia, etc.)
      const isInternational = 
        addressUpper.includes('CROATIA') ||
        addressUpper.includes('FRANCE') ||
        addressUpper.includes('MEXICO') ||
        addressUpper.includes('CANADA');

      if (!hasCA || hasOtherState || isInternational) {
        violations.outsideCalifornia.push(place);
      }
    } else if (!place.neighborhood) {
      // No address and no neighborhood = suspicious
      violations.noAddress.push(place);
    }

    // Check 2: Non-restaurant name patterns
    const matchesPattern = NON_RESTAURANT_PATTERNS.some(pattern => 
      pattern.test(place.name)
    );
    if (matchesPattern) {
      violations.nonRestaurantName.push(place);
    }

    // Check 3: Non-restaurant Google Types
    if (place.googleTypes && place.googleTypes.length > 0) {
      const hasNonRestaurantType = place.googleTypes.some(type =>
        NON_RESTAURANT_TYPES.includes(type)
      );
      if (hasNonRestaurantType) {
        violations.nonRestaurantType.push(place);
      }
    }
  }

  // Deduplicate (a place can violate multiple rules)
  const allViolations = new Map<string, typeof curatedPlaces[0]>();
  
  violations.outsideCalifornia.forEach(p => allViolations.set(p.id, p));
  violations.nonRestaurantName.forEach(p => allViolations.set(p.id, p));
  violations.nonRestaurantType.forEach(p => allViolations.set(p.id, p));
  violations.noAddress.forEach(p => allViolations.set(p.id, p));

  const uniqueViolations = Array.from(allViolations.values());

  // Display results
  console.log('═'.repeat(80));
  console.log('\n🚨 SCOPE VIOLATIONS FOUND\n');

  if (violations.outsideCalifornia.length > 0) {
    console.log(`\n❌ OUTSIDE CALIFORNIA (${violations.outsideCalifornia.length}):\n`);
    violations.outsideCalifornia.forEach((p, i) => {
      console.log(`${i + 1}. ${p.name} (${p.slug})`);
      console.log(`   Address: ${p.address || 'NULL'}`);
      console.log('');
    });
  }

  if (violations.nonRestaurantName.length > 0) {
    console.log(`\n❌ NON-RESTAURANT NAME PATTERNS (${violations.nonRestaurantName.length}):\n`);
    violations.nonRestaurantName.forEach((p, i) => {
      console.log(`${i + 1}. ${p.name} (${p.slug})`);
      console.log(`   Category: ${p.category || 'NULL'}`);
      console.log('');
    });
  }

  if (violations.nonRestaurantType.length > 0) {
    console.log(`\n❌ NON-RESTAURANT GOOGLE TYPES (${violations.nonRestaurantType.length}):\n`);
    violations.nonRestaurantType.forEach((p, i) => {
      console.log(`${i + 1}. ${p.name} (${p.slug})`);
      console.log(`   Types: ${p.googleTypes?.join(', ')}`);
      console.log('');
    });
  }

  if (violations.noAddress.length > 0) {
    console.log(`\n⚠️  NO ADDRESS (${violations.noAddress.length}):\n`);
    violations.noAddress.forEach((p, i) => {
      console.log(`${i + 1}. ${p.name} (${p.slug})`);
      console.log(`   Neighborhood: ${p.neighborhood || 'NULL'}`);
      console.log('');
    });
  }

  console.log('═'.repeat(80));
  console.log('\n📊 SUMMARY\n');
  console.log(`Total curated places: ${curatedPlaces.length}`);
  console.log(`Scope violations: ${uniqueViolations.length}`);
  console.log(`Clean places: ${curatedPlaces.length - uniqueViolations.length}\n`);

  console.log('Breakdown:');
  console.log(`  Outside California: ${violations.outsideCalifornia.length}`);
  console.log(`  Non-restaurant names: ${violations.nonRestaurantName.length}`);
  console.log(`  Non-restaurant types: ${violations.nonRestaurantType.length}`);
  console.log(`  No address: ${violations.noAddress.length}\n`);

  if (uniqueViolations.length > 0) {
    console.log('💡 NEXT STEP:\n');
    console.log('Review the violations above, then run:');
    console.log('  npm run delete:scope-violations -- --execute\n');

    // Export for deletion script
    const fs = require('fs');
    fs.writeFileSync(
      'scope-violations.json',
      JSON.stringify(uniqueViolations.map(p => ({ id: p.id, name: p.name, slug: p.slug })), null, 2)
    );
    console.log('Violations exported to scope-violations.json\n');
  } else {
    console.log('✅ No scope violations found! Database is clean.\n');
  }
}

auditScopeViolations()
  .then(() => {
    prisma.$disconnect();
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    prisma.$disconnect();
    process.exit(1);
  });
