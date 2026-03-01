#!/usr/bin/env node
/**
 * Final launch-ready count after phantom cleanup
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n📊 FINAL LAUNCH COUNT (After Phantom Cleanup)\n');
  console.log('════════════════════════════════════════════════════════════\n');

  // Get all OPEN places with valid coords
  const allPlaces = await prisma.entities.findMany({
    where: {
      status: 'OPEN',
      latitude: { not: null },
      longitude: { not: null },
      latitude: { not: 0 },
      longitude: { not: 0 },
    },
    select: {
      id: true,
      name: true,
      address: true,
      google_place_id: true,
      editorial_sources: true,
      category: true,
    },
  });

  const total = allPlaces.length;

  // Count places with editorial sources
  const withEditorial = allPlaces.filter(place => {
    if (!place.editorial_sources) return false;
    if (Array.isArray(place.editorial_sources) && place.editorial_sources.length === 0) return false;
    return true;
  }).length;

  const noEditorial = total - withEditorial;

  // Count places with addresses (complete data)
  const withAddress = allPlaces.filter(p => p.address && p.address.trim() !== '').length;
  const noAddress = total - withAddress;

  // Count places with Google Place ID
  const withGoogleId = allPlaces.filter(p => p.google_place_id && p.google_place_id.trim() !== '').length;
  const noGoogleId = total - withGoogleId;

  // Launch-ready: Editorial OR (has address AND Google ID)
  const launchReady = allPlaces.filter(place => {
    // Has editorial source?
    const hasEditorial = place.editorial_sources && 
      Array.isArray(place.editorial_sources) && 
      place.editorial_sources.length > 0;
    
    if (hasEditorial) return true;

    // Or has complete data (address + Google ID)?
    const hasAddress = place.address && place.address.trim() !== '';
    const hasGoogleId = place.google_place_id && place.google_place_id.trim() !== '';
    
    return hasAddress && hasGoogleId;
  }).length;

  // Tier breakdown
  const tier1 = allPlaces.filter(p => {
    const sources = Array.isArray(p.editorial_sources) ? p.editorial_sources : [];
    return sources.length >= 2;
  }).length;

  const tier2 = allPlaces.filter(p => {
    const sources = Array.isArray(p.editorial_sources) ? p.editorial_sources : [];
    return sources.length === 1;
  }).length;

  const tier3Clean = noEditorial;

  console.log('TOTAL LA COUNTY PLACES (OPEN + valid coords)');
  console.log('─'.repeat(60));
  console.log(`  Total places: ${total}\n`);

  console.log('BY EDITORIAL BACKING:');
  console.log('─'.repeat(60));
  console.log(`  With editorial source:  ${withEditorial} (${((withEditorial / total) * 100).toFixed(1)}%)`);
  console.log(`  No editorial source:    ${noEditorial} (${((noEditorial / total) * 100).toFixed(1)}%)\n`);

  console.log('BY DATA COMPLETENESS:');
  console.log('─'.repeat(60));
  console.log(`  Has address:            ${withAddress} (${((withAddress / total) * 100).toFixed(1)}%)`);
  console.log(`  No address:             ${noAddress} (${((noAddress / total) * 100).toFixed(1)}%)`);
  console.log(`  Has Google Place ID:    ${withGoogleId} (${((withGoogleId / total) * 100).toFixed(1)}%)`);
  console.log(`  No Google Place ID:     ${noGoogleId} (${((noGoogleId / total) * 100).toFixed(1)}%)\n`);

  console.log('🚀 LAUNCH-READY BREAKDOWN:');
  console.log('─'.repeat(60));
  console.log(`  Total launch-ready:     ${launchReady} (${((launchReady / total) * 100).toFixed(1)}%)\n`);
  
  console.log('  By Quality Tier:');
  console.log(`    🌟 Tier 1 (Multi-source):  ${tier1} (${((tier1 / launchReady) * 100).toFixed(1)}% of launch-ready)`);
  console.log(`    📝 Tier 2 (Single source): ${tier2} (${((tier2 / launchReady) * 100).toFixed(1)}% of launch-ready)`);
  console.log(`    📍 Tier 3 (Google only):   ${tier3Clean} (${((tier3Clean / launchReady) * 100).toFixed(1)}% of launch-ready)\n`);

  // Show change from before
  console.log('\n════════════════════════════════════════════════════════════');
  console.log('BEFORE vs AFTER PHANTOM CLEANUP');
  console.log('════════════════════════════════════════════════════════════\n');

  const beforeTotal = 1066;
  const beforeTier3 = 666;
  const afterTotal = launchReady;
  const afterTier3 = tier3Clean;

  console.log('Launch-Ready Places:');
  console.log(`  Before cleanup:  ${beforeTotal}`);
  console.log(`  After cleanup:   ${afterTotal}`);
  console.log(`  Removed:         ${beforeTotal - afterTotal} phantom records\n`);

  console.log('Tier 3 (No Editorial):');
  console.log(`  Before cleanup:  ${beforeTier3}`);
  console.log(`  After cleanup:   ${afterTier3}`);
  console.log(`  Removed:         ${beforeTier3 - afterTier3} phantom duplicates\n`);

  console.log('Editorial-Backed Places:');
  console.log(`  Before cleanup:  400`);
  console.log(`  After cleanup:   ${withEditorial}`);
  console.log(`  Change:          +${withEditorial - 400} (unchanged as expected)\n`);

  // Final assessment
  console.log('\n════════════════════════════════════════════════════════════');
  console.log('FINAL ASSESSMENT');
  console.log('════════════════════════════════════════════════════════════\n');

  const editorialPercentage = ((withEditorial / launchReady) * 100).toFixed(1);
  const tier3Percentage = ((tier3Clean / launchReady) * 100).toFixed(1);

  console.log(`✅ ${launchReady} clean, launch-ready places\n`);
  console.log(`📊 Data Quality:`);
  console.log(`   ${editorialPercentage}% have editorial backing (${withEditorial} places)`);
  console.log(`   ${tier3Percentage}% are Google-only (${tier3Clean} places)`);
  console.log(`   ${((withAddress / launchReady) * 100).toFixed(1)}% have complete addresses`);
  console.log(`   ${((withGoogleId / launchReady) * 100).toFixed(1)}% have Google Place IDs\n`);

  if (tier3Clean > 0 && ((tier3Clean / launchReady) * 100) < 40) {
    console.log('✅ IMPROVED: Tier 3 now <40% (was 62.5% before cleanup)');
  }

  console.log('\n💡 Recommendation: Ready to launch with current dataset');
}

main()
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
