#!/usr/bin/env node
/**
 * Spot Check Unrecoverable Places
 *
 * Samples 5 random places from the unrecoverable set (no address, 0,0 coords,
 * no Place ID) for manual review before bulk deletion.
 *
 * Usage:
 *   npm run spot-check:unrecoverable
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function spotCheckUnrecoverable() {
  // Get curated place IDs
  const curatedIds = await prisma.provenance
    .findMany({ select: { place_id: true } })
    .then((r) => r.map((p) => p.place_id));

  // Get the unrecoverable places (no address, 0,0 coords, no Place ID)
  const unrecoverable = await prisma.places.findMany({
    where: {
      id: { in: curatedIds },
      googlePlaceId: null,
      address: null,
      latitude: 0,
      longitude: 0,
    },
    select: {
      id: true,
      slug: true,
      name: true,
      neighborhood: true,
      category: true,
      createdAt: true,
    },
    orderBy: { name: 'asc' },
  });

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('SPOT CHECK: UNRECOVERABLE PLACES');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log(`Total unrecoverable places: ${unrecoverable.length}\n`);

  if (unrecoverable.length === 0) {
    console.log('✅ No unrecoverable places found!\n');
    return;
  }

  // Randomly sample 5
  const sampleSize = Math.min(5, unrecoverable.length);
  const shuffled = [...unrecoverable].sort(() => Math.random() - 0.5);
  const sample = shuffled.slice(0, sampleSize);

  console.log(`SPOT CHECK: ${sampleSize} Random Unrecoverable Places\n`);
  console.log('═'.repeat(80));
  
  sample.forEach((place, index) => {
    const searchQuery = place.neighborhood
      ? `${place.name} ${place.neighborhood}`
      : `${place.name} Los Angeles`;
    
    console.log(`\n${index + 1}. ${place.name} (${place.slug})`);
    console.log(`   Neighborhood: ${place.neighborhood || 'NULL'}`);
    console.log(`   Category: ${place.category || 'Unknown'}`);
    console.log(`   Created: ${place.createdAt.toLocaleDateString()}`);
    console.log(`   🔍 Google Search: https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`);
    console.log(`   ID: ${place.id}`);
  });

  console.log('\n' + '═'.repeat(80));
  console.log('\n📋 MANUAL REVIEW CHECKLIST:\n');
  console.log('Open each Google search link and check:\n');
  
  sample.forEach((place, index) => {
    console.log(`${index + 1}. ${place.name}`);
    console.log(`   [ ] Found via Google search? YES / NO`);
    console.log(`   [ ] Currently open? YES / NO / UNKNOWN`);
    console.log(`   [ ] In LA County? YES / NO`);
    console.log(`   [ ] Worth saving? YES / NO`);
    console.log(`   Notes: _____________________________________\n`);
  });

  // Show breakdown by neighborhood
  const byNeighborhood = unrecoverable.reduce((acc, place) => {
    const hood = place.neighborhood || 'NULL';
    if (!acc[hood]) acc[hood] = [];
    acc[hood].push(place);
    return acc;
  }, {} as Record<string, typeof unrecoverable>);

  console.log('═'.repeat(80));
  console.log('\n📊 BREAKDOWN BY NEIGHBORHOOD:\n');
  
  const sorted = Object.entries(byNeighborhood).sort((a, b) => b[1].length - a[1].length);
  sorted.slice(0, 15).forEach(([hood, places]) => {
    console.log(`${hood.padEnd(30)} ${places.length} places`);
  });
  
  if (sorted.length > 15) {
    console.log(`... and ${sorted.length - 15} more neighborhoods`);
  }

  // Show breakdown by category
  const byCategory = unrecoverable.reduce((acc, place) => {
    const cat = place.category || 'Unknown';
    if (!acc[cat]) acc[cat] = 0;
    acc[cat]++;
    return acc;
  }, {} as Record<string, number>);

  console.log('\n📊 BREAKDOWN BY CATEGORY:\n');
  Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => {
      console.log(`${cat.padEnd(20)} ${count}`);
    });

  // Export full list for reference
  const exportData = {
    summary: {
      total: unrecoverable.length,
      sampleSize: sample.length,
      generatedAt: new Date().toISOString(),
    },
    sample: sample.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      neighborhood: p.neighborhood,
      category: p.category,
      searchUrl: `https://www.google.com/search?q=${encodeURIComponent(
        p.neighborhood ? `${p.name} ${p.neighborhood}` : `${p.name} Los Angeles`
      )}`,
    })),
    all: unrecoverable.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      neighborhood: p.neighborhood,
      category: p.category,
      createdAt: p.createdAt,
    })),
  };

  const exportPath = path.join(process.cwd(), 'logs', 'unrecoverable-places.json');
  
  const logsDir = path.dirname(exportPath);
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
  
  console.log('\n' + '═'.repeat(80));
  console.log(`\n📄 Full list exported to: ${exportPath}`);
  
  console.log('\n💡 NEXT STEPS:\n');
  console.log('1. Review the 5 sampled places using Google search links');
  console.log('2. Fill out the manual review checklist above');
  console.log('3. If most are low-quality/closed, run:');
  console.log('   npm run cleanup:unrecoverable -- --execute');
  console.log('4. If many are valuable, keep them for manual cleanup\n');
}

spotCheckUnrecoverable()
  .then(() => {
    prisma.$disconnect();
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    prisma.$disconnect();
    process.exit(1);
  });
