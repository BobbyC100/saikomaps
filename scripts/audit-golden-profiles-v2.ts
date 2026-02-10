/**
 * Saiko Maps - Golden Profile Audit
 * 
 * Measures data completeness and calculates "Golden Profile" percentage.
 * A Golden Profile = place with ≥90% of required fields populated.
 * 
 * Usage: npx ts-node scripts/audit-golden-profiles.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Required fields for a Golden Profile (all must be present for 100%)
const REQUIRED_FIELDS = [
  'address',
  'neighborhood', 
  'category',
  'phone',
  'hours',
  'photos',
] as const;

// Optional fields (nice to have, but don't affect Golden status)
const OPTIONAL_FIELDS = [
  'website',
  'instagram',
  'cuisine',
  'priceLevel',
] as const;

interface ProfileScore {
  id: string;
  name: string;
  neighborhood: string | null;
  score: number;
  missingFields: string[];
  isGolden: boolean;
}

async function auditGoldenProfiles() {
  console.log('🏆 GOLDEN PROFILE AUDIT');
  console.log('═'.repeat(60));
  console.log('');
  console.log('Golden Profile = ≥90% of required fields populated');
  console.log(`Required fields: ${REQUIRED_FIELDS.join(', ')}`);
  console.log('');

  const places = await prisma.goldenRecord.findMany({
    where: {
      lifecycleStatus: 'ACTIVE',
    },
    select: {
      id: true,
      name: true,
      neighborhood: true,
      address: true,
      category: true,
      phone: true,
      hours: true,
      photos: true,
      website: true,
      instagram: true,
      cuisine: true,
      priceLevel: true,
    }
  });

  console.log(`Analyzing ${places.length} active places...\n`);

  const scores: ProfileScore[] = [];
  const fieldStats: Record<string, number> = {};
  
  // Initialize field stats
  REQUIRED_FIELDS.forEach(f => fieldStats[f] = 0);
  OPTIONAL_FIELDS.forEach(f => fieldStats[f] = 0);

  for (const place of places) {
    const missingFields: string[] = [];
    let fieldsPresent = 0;

    // Check required fields
    for (const field of REQUIRED_FIELDS) {
      const value = place[field as keyof typeof place];
      const hasValue = value !== null && value !== undefined && 
        (Array.isArray(value) ? value.length > 0 : true);
      
      if (hasValue) {
        fieldsPresent++;
        fieldStats[field]++;
      } else {
        missingFields.push(field);
      }
    }

    // Track optional fields (for stats, not scoring)
    for (const field of OPTIONAL_FIELDS) {
      const value = place[field as keyof typeof place];
      const hasValue = value !== null && value !== undefined;
      if (hasValue) {
        fieldStats[field]++;
      }
    }

    const score = (fieldsPresent / REQUIRED_FIELDS.length) * 100;
    
    scores.push({
      id: place.id,
      name: place.name,
      neighborhood: place.neighborhood,
      score,
      missingFields,
      isGolden: score >= 90,
    });
  }

  // Calculate distribution
  const distribution = {
    golden: scores.filter(s => s.score >= 90).length,
    good: scores.filter(s => s.score >= 70 && s.score < 90).length,
    partial: scores.filter(s => s.score >= 50 && s.score < 70).length,
    sparse: scores.filter(s => s.score < 50).length,
  };

  const goldenPercentage = Math.round((distribution.golden / places.length) * 100);

  // Print results
  console.log('📊 COMPLETENESS DISTRIBUTION');
  console.log('─'.repeat(40));
  console.log(`  🏆 Golden (≥90%):   ${distribution.golden} places (${goldenPercentage}%)`);
  console.log(`  ✓  Good (70-89%):   ${distribution.good} places`);
  console.log(`  ◐  Partial (50-69%): ${distribution.partial} places`);
  console.log(`  ○  Sparse (<50%):   ${distribution.sparse} places`);
  console.log('');

  // Field-by-field breakdown
  console.log('📋 FIELD COVERAGE');
  console.log('─'.repeat(40));
  console.log('Required:');
  for (const field of REQUIRED_FIELDS) {
    const pct = Math.round((fieldStats[field] / places.length) * 100);
    const bar = '█'.repeat(Math.floor(pct / 5)) + '░'.repeat(20 - Math.floor(pct / 5));
    console.log(`  ${field.padEnd(14)} ${bar} ${pct}%`);
  }
  console.log('');
  console.log('Optional:');
  for (const field of OPTIONAL_FIELDS) {
    const pct = Math.round((fieldStats[field] / places.length) * 100);
    const bar = '█'.repeat(Math.floor(pct / 5)) + '░'.repeat(20 - Math.floor(pct / 5));
    console.log(`  ${field.padEnd(14)} ${bar} ${pct}%`);
  }
  console.log('');

  // Show worst offenders (most missing data)
  const sparse = scores
    .filter(s => s.score < 50)
    .sort((a, b) => a.score - b.score)
    .slice(0, 10);

  if (sparse.length > 0) {
    console.log('⚠️  MOST INCOMPLETE (need attention)');
    console.log('─'.repeat(40));
    sparse.forEach(p => {
      console.log(`  ${p.name} (${p.neighborhood || 'no neighborhood'})`);
      console.log(`    Score: ${Math.round(p.score)}% | Missing: ${p.missingFields.join(', ')}`);
    });
    console.log('');
  }

  // Summary
  console.log('═'.repeat(60));
  if (goldenPercentage >= 80) {
    console.log(`✅ EXCELLENT: ${goldenPercentage}% Golden Profiles`);
  } else if (goldenPercentage >= 50) {
    console.log(`⚠️  GOOD: ${goldenPercentage}% Golden Profiles — room for improvement`);
  } else {
    console.log(`❌ NEEDS WORK: Only ${goldenPercentage}% Golden Profiles`);
    console.log('   Run: npm run enrich:google to backfill missing data');
  }
  console.log('═'.repeat(60));

  return {
    total: places.length,
    golden: distribution.golden,
    goldenPercentage,
    fieldStats,
  };
}

async function main() {
  try {
    await auditGoldenProfiles();
  } catch (error) {
    console.error('Audit failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
