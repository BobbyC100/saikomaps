#!/usr/bin/env node
/**
 * Spot Check Ghost Entries
 *
 * Identifies "ghost entries" - curated places with no usable location data
 * (0,0 coords, no address) and provides a random sample for manual review.
 *
 * Usage:
 *   npm run spot-check:ghosts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function spotCheckGhostEntries() {
  // Get curated place IDs
  const curatedIds = await prisma.provenance
    .findMany({ select: { place_id: true } })
    .then((r) => r.map((p) => p.place_id));

  // Get ghost entries (0,0 coords, no address)
  const ghostEntries = await prisma.places.findMany({
    where: {
      id: { in: curatedIds },
      latitude: 0,
      longitude: 0,
      address: null,
    },
    select: {
      id: true,
      slug: true,
      name: true,
      address: true,
      neighborhood: true,
      googlePlaceId: true,
      createdAt: true,
      category: true,
    },
    orderBy: { name: 'asc' },
  });

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('GHOST ENTRIES ANALYSIS');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log(`Total ghost entries: ${ghostEntries.length}\n`);

  if (ghostEntries.length === 0) {
    console.log('✅ No ghost entries found!\n');
    return;
  }

  // Randomly sample 10 (or all if less than 10)
  const sampleSize = Math.min(10, ghostEntries.length);
  const shuffled = [...ghostEntries].sort(() => Math.random() - 0.5);
  const sample = shuffled.slice(0, sampleSize);

  console.log(`SPOT CHECK: ${sampleSize} Random Ghost Entries\n`);
  console.log('═'.repeat(80));
  
  sample.forEach((place, index) => {
    console.log(`\n${index + 1}. ${place.name} (${place.slug})`);
    console.log(`   Address: ${place.address || 'NULL'}`);
    console.log(`   Neighborhood: ${place.neighborhood || 'NULL'}`);
    console.log(`   Category: ${place.category || 'Unknown'}`);
    console.log(`   Google Place ID: ${place.googlePlaceId || 'NULL'}`);
    console.log(`   Added: ${place.createdAt.toLocaleDateString()}`);
    console.log(`   ID: ${place.id}`);
    console.log(`   🔍 Google Search: https://www.google.com/search?q=${encodeURIComponent(place.name)}`);
  });

  console.log('\n' + '═'.repeat(80));
  console.log('\nMANUAL RESEARCH TEMPLATE:\n');
  console.log('Copy this to a text file and fill in as you research:\n');
  
  sample.forEach((place, index) => {
    console.log(`${index + 1}. ${place.name} (${place.slug})`);
    console.log(`   [ ] Found address: _______________________________________`);
    console.log(`   [ ] City/Neighborhood: ___________________________________`);
    console.log(`   [ ] Still exists? YES / NO / CLOSED`);
    console.log(`   [ ] Action: KEEP & FIX / DELETE\n`);
  });

  console.log('═'.repeat(80));

  // Export full list and sample to JSON
  const exportData = {
    summary: {
      total: ghostEntries.length,
      sampleSize: sample.length,
      generatedAt: new Date().toISOString(),
    },
    sample: sample.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      category: p.category,
      googleSearchUrl: `https://www.google.com/search?q=${encodeURIComponent(p.name)}`,
      createdAt: p.createdAt,
    })),
    allGhosts: ghostEntries.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      category: p.category,
      createdAt: p.createdAt,
    })),
  };

  const exportPath = path.join(process.cwd(), 'logs', 'ghost-entries-spot-check.json');
  
  // Ensure logs directory exists
  const logsDir = path.dirname(exportPath);
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
  
  console.log(`\n📊 Full analysis exported to: ${exportPath}\n`);

  // Recommendations
  console.log('RECOMMENDATIONS:');
  console.log('─'.repeat(60));
  console.log('1. Research each sampled place using the Google search links');
  console.log('2. For places worth keeping:');
  console.log('   - Find their address and add it to the database');
  console.log('   - Run npm run backfill:google -- --slug <slug>');
  console.log('3. For closed/invalid places:');
  console.log('   - Delete them from the database\n');
}

spotCheckGhostEntries()
  .then(() => {
    prisma.$disconnect();
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    prisma.$disconnect();
    process.exit(1);
  });
