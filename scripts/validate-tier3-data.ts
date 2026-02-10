#!/usr/bin/env node
/**
 * Comprehensive data quality validation for Tier 3 places (no editorial sources)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n🔍 TIER 3 DATA QUALITY VALIDATION\n');
  console.log('════════════════════════════════════════════════════════════\n');

  // Get all Tier 3 places
  const tier3Places = await prisma.places.findMany({
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
      neighborhood: true,
      category: true,
      google_place_id: true,
      latitude: true,
      longitude: true,
      editorial_sources: true,
    },
  });

  // Filter to only those without editorial sources
  const noEditorial = tier3Places.filter(place => {
    if (!place.editorial_sources) return true;
    if (Array.isArray(place.editorial_sources) && place.editorial_sources.length === 0) return true;
    return false;
  });

  console.log(`Total Tier 3 places (no editorial sources): ${noEditorial.length}\n`);

  // ============================================================
  // 1. BASIC DATA QUALITY CHECKS
  // ============================================================
  console.log('════════════════════════════════════════════════════════════');
  console.log('1. BASIC DATA QUALITY');
  console.log('════════════════════════════════════════════════════════════\n');

  const noName = noEditorial.filter(p => !p.name || p.name.trim() === '').length;
  const shortName = noEditorial.filter(p => p.name && p.name.length < 3).length;
  const noAddress = noEditorial.filter(p => !p.address || p.address.trim() === '').length;
  const noGoogleId = noEditorial.filter(p => !p.google_place_id).length;
  const badCoords = noEditorial.filter(p => {
    const lat = Number(p.latitude);
    const lng = Number(p.longitude);
    return lat === 0 || lng === 0 || isNaN(lat) || isNaN(lng);
  }).length;

  console.log(`Total places:           ${noEditorial.length}`);
  console.log(`No name:                ${noName} (${((noName / noEditorial.length) * 100).toFixed(1)}%)`);
  console.log(`Name too short (<3):    ${shortName} (${((shortName / noEditorial.length) * 100).toFixed(1)}%)`);
  console.log(`No address:             ${noAddress} (${((noAddress / noEditorial.length) * 100).toFixed(1)}%)`);
  console.log(`No Google Place ID:     ${noGoogleId} (${((noGoogleId / noEditorial.length) * 100).toFixed(1)}%)`);
  console.log(`Bad coordinates:        ${badCoords} (${((badCoords / noEditorial.length) * 100).toFixed(1)}%)`);

  const dataIssues = noName + shortName + noAddress + noGoogleId + badCoords;
  console.log(`\n⚠️  Total data issues:   ${dataIssues} records with problems`);

  // Show examples of data quality issues
  if (noName > 0) {
    console.log('\nExamples of places with no name:');
    noEditorial.filter(p => !p.name || p.name.trim() === '').slice(0, 3).forEach(p => {
      console.log(`  - ID: ${p.id}, Address: ${p.address || 'N/A'}`);
    });
  }

  if (shortName > 0) {
    console.log('\nExamples of places with short names (<3 chars):');
    noEditorial.filter(p => p.name && p.name.length < 3).slice(0, 3).forEach(p => {
      console.log(`  - "${p.name}" (${p.address || 'N/A'})`);
    });
  }

  // ============================================================
  // 2. POTENTIAL DUPLICATES
  // ============================================================
  console.log('\n\n════════════════════════════════════════════════════════════');
  console.log('2. POTENTIAL DUPLICATES (Same name)');
  console.log('════════════════════════════════════════════════════════════\n');

  const nameGroups = new Map<string, typeof noEditorial>();
  
  for (const place of noEditorial) {
    const normalizedName = place.name?.trim().toLowerCase() || '';
    if (!normalizedName) continue;
    
    if (!nameGroups.has(normalizedName)) {
      nameGroups.set(normalizedName, []);
    }
    nameGroups.get(normalizedName)!.push(place);
  }

  const duplicates = Array.from(nameGroups.entries())
    .filter(([, places]) => places.length > 1)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 20);

  if (duplicates.length === 0) {
    console.log('✅ No duplicate names found!');
  } else {
    console.log(`Found ${duplicates.length} duplicate name groups\n`);
    
    for (const [name, places] of duplicates) {
      console.log(`"${places[0].name}" - ${places.length} occurrences`);
      console.log(`  Neighborhoods: ${places.map(p => p.neighborhood || 'N/A').join(', ')}`);
      console.log(`  Addresses:`);
      for (const place of places) {
        console.log(`    • ${place.address || 'N/A'}`);
      }
      console.log('');
    }
  }

  // ============================================================
  // 3. CATEGORY BREAKDOWN
  // ============================================================
  console.log('\n════════════════════════════════════════════════════════════');
  console.log('3. CATEGORY BREAKDOWN');
  console.log('════════════════════════════════════════════════════════════\n');

  const categoryMap = new Map<string, number>();
  
  for (const place of noEditorial) {
    const category = place.category || 'Uncategorized';
    categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
  }

  const sortedCategories = Array.from(categoryMap.entries())
    .sort((a, b) => b[1] - a[1]);

  console.log('Top categories:\n');
  for (const [category, count] of sortedCategories) {
    const percentage = ((count / noEditorial.length) * 100).toFixed(1);
    console.log(`  ${category}: ${count} (${percentage}%)`);
  }

  // ============================================================
  // 4. RANDOM SAMPLES FROM TOP 5 CATEGORIES
  // ============================================================
  console.log('\n\n════════════════════════════════════════════════════════════');
  console.log('4. RANDOM SAMPLES (10 from each of top 5 categories)');
  console.log('════════════════════════════════════════════════════════════\n');

  const top5Categories = sortedCategories.slice(0, 5);

  for (const [category, count] of top5Categories) {
    console.log(`\n─────────────────────────────────────────────────────────`);
    console.log(`CATEGORY: ${category} (${count} total)`);
    console.log(`─────────────────────────────────────────────────────────\n`);

    const categoryPlaces = noEditorial
      .filter(p => (p.category || 'Uncategorized') === category)
      .sort(() => Math.random() - 0.5)
      .slice(0, 10);

    for (let i = 0; i < categoryPlaces.length; i++) {
      const place = categoryPlaces[i];
      console.log(`${i + 1}. ${place.name}`);
      console.log(`   Address: ${place.address || 'N/A'}`);
      console.log(`   Neighborhood: ${place.neighborhood || 'N/A'}`);
      console.log(`   Google Place ID: ${place.google_place_id || 'N/A'}`);
      console.log(`   Coords: ${place.latitude}, ${place.longitude}`);
      console.log('');
    }
  }

  // ============================================================
  // SUMMARY & RECOMMENDATIONS
  // ============================================================
  console.log('\n════════════════════════════════════════════════════════════');
  console.log('SUMMARY & RECOMMENDATIONS');
  console.log('════════════════════════════════════════════════════════════\n');

  const duplicateCount = duplicates.reduce((sum, [, places]) => sum + places.length, 0);
  
  console.log(`Total Tier 3 places:        ${noEditorial.length}`);
  console.log(`Data quality issues:        ${dataIssues} (${((dataIssues / noEditorial.length) * 100).toFixed(1)}%)`);
  console.log(`Duplicate names:            ${duplicateCount} places in ${duplicates.length} groups`);
  console.log(`Uncategorized:              ${categoryMap.get('Uncategorized') || 0} (${(((categoryMap.get('Uncategorized') || 0) / noEditorial.length) * 100).toFixed(1)}%)`);

  console.log('\n💡 ACTIONS NEEDED:\n');

  if (dataIssues > noEditorial.length * 0.05) {
    console.log(`   🚨 HIGH: ${dataIssues} data quality issues (${((dataIssues / noEditorial.length) * 100).toFixed(1)}%)`);
    console.log('      → Review and fix/remove bad records');
  }

  if (duplicateCount > 0) {
    console.log(`   ⚠️  MEDIUM: ${duplicateCount} potential duplicates in ${duplicates.length} groups`);
    console.log('      → Manually review and merge/delete duplicates');
  }

  if ((categoryMap.get('Uncategorized') || 0) > noEditorial.length * 0.3) {
    console.log(`   ⚠️  MEDIUM: ${categoryMap.get('Uncategorized')} uncategorized (${(((categoryMap.get('Uncategorized') || 0) / noEditorial.length) * 100).toFixed(1)}%)`);
    console.log('      → Auto-categorize from Google types');
  }

  const cleanPlaces = noEditorial.length - dataIssues - duplicateCount;
  console.log(`\n✅ Clean places ready to launch: ~${cleanPlaces}`);
}

main()
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
