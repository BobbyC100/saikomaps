#!/usr/bin/env node
/**
 * Clean Address-Named Places
 * 
 * Identifies and archives places with address-like names
 * (e.g., "1200 Rosecrans Ave", "12249 Venice Blvd.")
 * 
 * Usage: 
 *   npm run clean:addresses -- --dry-run   (preview only)
 *   npm run clean:addresses                (actually archive)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Patterns that indicate an address-like name
const ADDRESS_PATTERNS = [
  /^\d+\s+[A-Z]/i,                    // "1200 Rosecrans"
  /^\d{3,5}$/,                        // "715", "1642"
  /^\d+\s+(st|nd|rd|th)\s/i,         // "5th Street"
  /^[A-Z]?\d+[A-Z]?\s+\d+/i,         // "12249 Venice"
  /^\d+\s+[A-Z][\w\s]+Blvd/i,        // "Venice Blvd."
  /^\d+\s+[A-Z][\w\s]+Ave/i,         // "Rosecrans Ave"
  /^\d+\s+[A-Z][\w\s]+St/i,          // "Daly St"
  /^\d+\s+[A-Z][\w\s]+(Street|Avenue|Boulevard|Road|Drive)/i,
];

function looksLikeAddress(name: string): boolean {
  return ADDRESS_PATTERNS.some(pattern => pattern.test(name.trim()));
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  
  console.log('🧹 Cleaning Address-Named Places\n');
  console.log(`Mode: ${isDryRun ? '🔍 DRY RUN (preview only)' : '⚠️  LIVE (will archive)'}\n`);
  
  // Find places with address-like names
  const allPlaces = await prisma.golden_records.findMany({
    where: {
      lifecycle_status: 'ACTIVE',
    },
    select: {
      canonical_id: true,
      name: true,
      neighborhood: true,
      category: true,
      address_street: true,
      source_count: true,
    },
  });
  
  const addressNamedPlaces = allPlaces.filter(p => looksLikeAddress(p.name));
  
  console.log(`Found ${addressNamedPlaces.length} places with address-like names:\n`);
  
  // Group by pattern for better visibility
  const byPattern: Record<string, any[]> = {};
  
  for (const place of addressNamedPlaces) {
    const pattern = ADDRESS_PATTERNS.find(p => p.test(place.name))?.source || 'other';
    if (!byPattern[pattern]) byPattern[pattern] = [];
    byPattern[pattern].push(place);
  }
  
  // Show preview
  for (const [pattern, places] of Object.entries(byPattern)) {
    console.log(`Pattern: ${pattern}`);
    for (const place of places.slice(0, 5)) {
      console.log(`  - "${place.name}" (${place.neighborhood || 'unknown'}, sources: ${place.source_count})`);
    }
    if (places.length > 5) {
      console.log(`  ... and ${places.length - 5} more`);
    }
    console.log();
  }
  
  if (addressNamedPlaces.length === 0) {
    console.log('✅ No address-named places found!');
    return;
  }
  
  if (isDryRun) {
    console.log('\n📋 DRY RUN - No changes made');
    console.log(`\nTo archive these ${addressNamedPlaces.length} places, run:`);
    console.log('  npm run clean:addresses');
    return;
  }
  
  // Archive them
  console.log(`\n🗑️  Archiving ${addressNamedPlaces.length} places...`);
  
  const result = await prisma.golden_records.updateMany({
    where: {
      canonical_id: {
        in: addressNamedPlaces.map(p => p.canonical_id),
      },
    },
    data: {
      lifecycle_status: 'ARCHIVED',
      archive_reason: 'DATA_ERROR',
      archived_at: new Date(),
      archived_by: 'system:cleanup',
      updated_at: new Date(),
    },
  });
  
  console.log(`\n✅ Archived ${result.count} places with address-like names`);
  console.log('\n💡 These places are now hidden from:');
  console.log('   - Public site');
  console.log('   - Admin tools (Instagram backfill, etc.)');
  console.log('   - Search results');
  console.log('\n📊 Data is preserved in database for reporting');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
