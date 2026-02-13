#!/usr/bin/env node
/**
 * Analyze Places with NULL Neighborhoods
 *
 * Identifies curated places without neighborhood data and provides insights
 * on which can be enriched via backfill.
 *
 * Usage:
 *   npm run analyze:null-neighborhoods
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function analyzeNullNeighborhoods() {
  // Get curated place IDs
  const curatedIds = await prisma.provenance
    .findMany({ select: { place_id: true } })
    .then((r) => r.map((p) => p.place_id));

  // Get curated places with NULL neighborhoods
  const nullNeighborhoodPlaces = await prisma.places.findMany({
    where: {
      id: { in: curatedIds },
      neighborhood: null,
    },
    select: {
      id: true,
      slug: true,
      name: true,
      address: true,
      latitude: true,
      longitude: true,
      googlePlaceId: true,
      placesDataCachedAt: true,
    },
    orderBy: { name: 'asc' },
  });

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('CURATED PLACES WITH NULL NEIGHBORHOODS');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log(`Total: ${nullNeighborhoodPlaces.length} places\n`);

  // Breakdown by enrichment status
  const withPlaceId = nullNeighborhoodPlaces.filter((p) => p.googlePlaceId);
  const withoutPlaceId = nullNeighborhoodPlaces.filter((p) => !p.googlePlaceId);
  const neverAttempted = withoutPlaceId.filter((p) => !p.placesDataCachedAt);
  const failedAttempts = withoutPlaceId.filter((p) => p.placesDataCachedAt);

  console.log('Breakdown by Google Place ID Status:');
  console.log('─'.repeat(60));
  console.log(`  ✅ Has Google Place ID: ${withPlaceId.length}`);
  console.log(`     (Can get neighborhood from Google)`);
  console.log(`  ❌ No Google Place ID: ${withoutPlaceId.length}`);
  console.log(`     - Never attempted backfill: ${neverAttempted.length}`);
  console.log(`     - Failed backfill attempts: ${failedAttempts.length}`);
  console.log('');

  // Breakdown by address availability
  const withAddress = nullNeighborhoodPlaces.filter((p) => p.address);
  const withoutAddress = nullNeighborhoodPlaces.filter((p) => !p.address);
  const withCoords = nullNeighborhoodPlaces.filter(
    (p) => p.latitude !== null && p.longitude !== null
  );

  console.log('Breakdown by Address/Location Data:');
  console.log('─'.repeat(60));
  console.log(
    `  With address: ${withAddress.length} (${Math.round((withAddress.length / nullNeighborhoodPlaces.length) * 100)}%)`
  );
  console.log(
    `  Without address: ${withoutAddress.length} (${Math.round((withoutAddress.length / nullNeighborhoodPlaces.length) * 100)}%)`
  );
  console.log(
    `  With coordinates: ${withCoords.length} (${Math.round((withCoords.length / nullNeighborhoodPlaces.length) * 100)}%)`
  );
  console.log('');

  // Actionable recommendations
  console.log('Recommended Actions:');
  console.log('─'.repeat(60));
  
  if (withPlaceId.length > 0) {
    console.log(
      `1. Re-run backfill for ${withPlaceId.length} places with Place IDs:`
    );
    console.log(`   npm run backfill:google --force`);
    console.log(`   (This will populate neighborhoods from Google)\n`);
  }

  if (neverAttempted.length > 0) {
    console.log(
      `2. Run backfill for ${neverAttempted.length} places never attempted:`
    );
    console.log(`   npm run backfill:google`);
    console.log(`   (These need Place IDs + neighborhoods)\n`);
  }

  if (withoutAddress.length > 0) {
    console.log(
      `3. ${withoutAddress.length} places lack addresses - manual review needed`
    );
    console.log(`   See exported JSON for details\n`);
  }

  // Export to JSON
  const exportData = {
    summary: {
      total: nullNeighborhoodPlaces.length,
      withPlaceId: withPlaceId.length,
      withoutPlaceId: withoutPlaceId.length,
      neverAttempted: neverAttempted.length,
      failedAttempts: failedAttempts.length,
      withAddress: withAddress.length,
      withoutAddress: withoutAddress.length,
      withCoords: withCoords.length,
    },
    places: nullNeighborhoodPlaces.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      address: p.address,
      latitude: p.latitude,
      longitude: p.longitude,
      googlePlaceId: p.googlePlaceId,
      status: p.googlePlaceId
        ? 'has_place_id'
        : p.placesDataCachedAt
          ? 'failed_backfill'
          : 'never_attempted',
    })),
    withPlaceId: withPlaceId.map((p) => ({
      slug: p.slug,
      name: p.name,
      googlePlaceId: p.googlePlaceId,
    })),
    needingBackfill: neverAttempted.map((p) => ({
      slug: p.slug,
      name: p.name,
      address: p.address,
    })),
    withoutAddress: withoutAddress.map((p) => ({
      slug: p.slug,
      name: p.name,
      hasCoords: p.latitude !== null && p.longitude !== null,
    })),
  };

  const exportPath = path.join(process.cwd(), 'logs', 'null-neighborhoods-analysis.json');
  
  // Ensure logs directory exists
  const logsDir = path.dirname(exportPath);
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));

  console.log('═'.repeat(60));
  console.log(`\n📊 Full analysis exported to: ${exportPath}\n`);

  // Sample of places for quick review
  console.log('Sample of places without neighborhoods (first 10):');
  console.log('─'.repeat(60));
  nullNeighborhoodPlaces.slice(0, 10).forEach((p) => {
    const status = p.googlePlaceId
      ? '✅'
      : p.placesDataCachedAt
        ? '⚠️'
        : '❌';
    console.log(`${status} ${p.name} (${p.slug})`);
    if (p.address) console.log(`   ${p.address}`);
  });

  if (nullNeighborhoodPlaces.length > 10) {
    console.log(`\n... and ${nullNeighborhoodPlaces.length - 10} more\n`);
  }
}

analyzeNullNeighborhoods()
  .then(() => {
    prisma.$disconnect();
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    prisma.$disconnect();
    process.exit(1);
  });
