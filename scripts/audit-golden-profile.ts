#!/usr/bin/env node
/**
 * Golden Profile Analysis
 * 
 * Calculates data completeness for all golden_records.
 * A "Golden Profile" = ≥90% completeness on required fields.
 * 
 * Required fields (6):
 * - Address/Coordinates (lat/lng)
 * - Neighborhood
 * - Category
 * - Phone
 * - Hours
 * - Photos (≥1)
 * 
 * Usage: npm run audit:golden-profile
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Required fields for Golden Profile
const REQUIRED_FIELDS = [
  'address',      // lat/lng
  'neighborhood',
  'category',
  'phone',
  'hours',
  'photos',       // Google photos or user photos
];

interface GoldenProfileScore {
  canonical_id: string;
  name: string;
  neighborhood: string | null;
  score: number;
  missing_fields: string[];
  is_golden: boolean;
}

function calculateScore(place: any): GoldenProfileScore {
  const missing: string[] = [];
  let present = 0;
  const total = REQUIRED_FIELDS.length;
  
  // Check address/coordinates
  if (place.lat && place.lng) {
    present++;
  } else {
    missing.push('address');
  }
  
  // Check neighborhood
  if (place.neighborhood) {
    present++;
  } else {
    missing.push('neighborhood');
  }
  
  // Check category
  if (place.category) {
    present++;
  } else {
    missing.push('category');
  }
  
  // Check phone
  if (place.phone) {
    present++;
  } else {
    missing.push('phone');
  }
  
  // Check hours
  if (place.hours_json) {
    present++;
  } else {
    missing.push('hours');
  }
  
  // Check photos (could be google_photos JSON from raw_records)
  // For now, assume photos come from Google Places data
  // We'd need to check raw_records.raw_json.google_photos
  // Simplified: mark as missing for now
  missing.push('photos');
  
  const score = Math.round((present / total) * 100);
  const isGolden = score >= 90;
  
  return {
    canonical_id: place.canonical_id,
    name: place.name,
    neighborhood: place.neighborhood,
    score,
    missing_fields: missing,
    is_golden: isGolden,
  };
}

async function analyzeGoldenProfiles() {
  console.log('🏆 GOLDEN PROFILE ANALYSIS');
  console.log('═'.repeat(60));
  console.log('');
  
  const places = await prisma.golden_records.findMany({
    where: {
      lifecycle_status: 'ACTIVE'
    },
    select: {
      canonical_id: true,
      name: true,
      neighborhood: true,
      category: true,
      lat: true,
      lng: true,
      phone: true,
      hours_json: true,
    }
  });
  
  console.log(`Analyzing ${places.length} active places...\n`);
  
  const scores = places.map(calculateScore);
  
  // Calculate stats
  const goldenProfiles = scores.filter(s => s.is_golden);
  const byScore: Record<string, number> = {};
  
  scores.forEach(s => {
    const bucket = `${Math.floor(s.score / 10) * 10}-${Math.floor(s.score / 10) * 10 + 9}%`;
    byScore[bucket] = (byScore[bucket] || 0) + 1;
  });
  
  const avgScore = Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length);
  
  // Print results
  console.log('📊 SUMMARY');
  console.log('─'.repeat(40));
  console.log(`  Total places:        ${places.length}`);
  console.log(`  Golden Profiles:     ${goldenProfiles.length} (${Math.round(goldenProfiles.length / places.length * 100)}%)`);
  console.log(`  Average score:       ${avgScore}%`);
  console.log('');
  
  // Distribution
  console.log('📈 DISTRIBUTION');
  console.log('─'.repeat(40));
  ['90-99', '80-89', '70-79', '60-69', '50-59', '40-49', '30-39', '20-29', '10-19', '0-9'].forEach(bucket => {
    const count = byScore[`${bucket}%`] || 0;
    if (count > 0) {
      const bar = '█'.repeat(Math.round(count / places.length * 40));
      console.log(`  ${bucket}%: ${count.toString().padStart(4)} ${bar}`);
    }
  });
  console.log('');
  
  // Most common missing fields
  const missingFieldCounts: Record<string, number> = {};
  scores.forEach(s => {
    s.missing_fields.forEach(field => {
      missingFieldCounts[field] = (missingFieldCounts[field] || 0) + 1;
    });
  });
  
  console.log('❌ MOST COMMON GAPS');
  console.log('─'.repeat(40));
  Object.entries(missingFieldCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([field, count]) => {
      const pct = Math.round(count / places.length * 100);
      console.log(`  ${field.padEnd(15)}: ${count.toString().padStart(4)} (${pct}%)`);
    });
  console.log('');
  
  // Examples of non-golden profiles
  const needsWork = scores.filter(s => !s.is_golden).slice(0, 10);
  if (needsWork.length > 0) {
    console.log('⚠️  EXAMPLES NEEDING WORK (<90%)');
    console.log('─'.repeat(40));
    needsWork.forEach(s => {
      console.log(`  ${s.score}% - ${s.name} (${s.neighborhood || 'no neighborhood'})`);
      console.log(`       Missing: ${s.missing_fields.join(', ')}`);
    });
  }
  
  console.log('');
  console.log('═'.repeat(60));
  if (goldenProfiles.length === places.length) {
    console.log('🏆 PERFECTION!');
    console.log('All places have Golden Profiles (≥90% complete).');
  } else {
    const needsImprovement = places.length - goldenProfiles.length;
    console.log(`📈 IMPROVEMENT OPPORTUNITIES`);
    console.log(`${needsImprovement} places need work to reach Golden Profile status.`);
    console.log('');
    console.log('Next steps:');
    console.log('  1. Backfill missing phone numbers');
    console.log('  2. Backfill missing hours');
    console.log('  3. Import Google Photos data');
    console.log('  4. Fill in missing neighborhoods/categories');
  }
  console.log('═'.repeat(60));
}

async function main() {
  try {
    await analyzeGoldenProfiles();
  } catch (error) {
    console.error('Error during analysis:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
