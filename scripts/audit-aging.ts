#!/usr/bin/env node
/**
 * Saiko Maps - Aging Audit
 * 
 * Flags places that need review based on age and source tier:
 * - Tier 3 places older than 5 years → FLAG_FOR_REVIEW
 * - Tier 2 places older than 8 years → FLAG_FOR_REVIEW
 * - LEGACY_FAVORITE status exempts from aging rules
 * 
 * Usage: npm run audit:aging
 * 
 * Exit codes:
 *   0 = No action needed
 *   1 = Places flagged for review
 */

import { PrismaClient, LifecycleStatus } from '@prisma/client';

const prisma = new PrismaClient();

// Aging thresholds by tier (in years)
const AGING_THRESHOLDS: Record<number, number> = {
  1: Infinity,  // Tier 1 (Bobby's picks) never age out
  2: 8,         // Premium editorial: 8 years
  3: 5,         // Secondary editorial: 5 years
  4: 3,         // Community sources: 3 years
};

interface AgingPlace {
  canonical_id: string;
  name: string;
  neighborhood: string | null;
  age_years: number;
  tier: number;
  lifecycle_status: LifecycleStatus;
  import_batch: string | null;
}

async function runAgingAudit(): Promise<AgingPlace[]> {
  console.log('⏰ SAIKO MAPS AGING AUDIT');
  console.log('═'.repeat(60));
  console.log('');
  
  const now = new Date();
  const fiveYearsAgo = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());
  const eightYearsAgo = new Date(now.getFullYear() - 8, now.getMonth(), now.getDate());
  
  // Get all active places with their provenance
  const places = await prisma.golden_records.findMany({
    where: {
      lifecycle_status: {
        in: ['ACTIVE', 'FLAG_FOR_REVIEW']
      }
    },
    include: {
      provenance: {
        orderBy: { created_at: 'asc' },
        take: 1, // Get oldest provenance (when place was first added)
      }
    }
  });
  
  console.log(`Analyzing ${places.length} active places...\n`);
  
  const agingPlaces: AgingPlace[] = [];
  const byTier: Record<number, number> = {};
  
  for (const place of places) {
    const prov = place.provenance[0];
    if (!prov || !prov.source_tier) continue;
    
    const tier = prov.source_tier;
    const ageMs = now.getTime() - prov.created_at.getTime();
    const ageYears = ageMs / (1000 * 60 * 60 * 24 * 365.25);
    
    const threshold = AGING_THRESHOLDS[tier] || 5;
    
    // Skip LEGACY_FAVORITE - Bobby has blessed these
    if (place.lifecycle_status === 'LEGACY_FAVORITE') {
      continue;
    }
    
    // Check if aged out
    if (ageYears > threshold) {
      agingPlaces.push({
        canonical_id: place.canonical_id,
        name: place.name,
        neighborhood: place.neighborhood,
        age_years: Math.round(ageYears * 10) / 10,
        tier: tier,
        lifecycle_status: place.lifecycle_status,
        import_batch: prov.import_batch,
      });
      
      byTier[tier] = (byTier[tier] || 0) + 1;
    }
  }
  
  // Print results
  console.log('📊 SUMMARY');
  console.log('─'.repeat(40));
  console.log(`  Total active places: ${places.length}`);
  console.log(`  Aged out: ${agingPlaces.length}`);
  console.log('');
  
  if (agingPlaces.length > 0) {
    console.log('🚨 PLACES NEEDING REVIEW (Aged Out)');
    console.log('─'.repeat(40));
    
    // Group by tier
    [2, 3, 4].forEach(tier => {
      const count = byTier[tier] || 0;
      if (count > 0) {
        const threshold = AGING_THRESHOLDS[tier];
        console.log(`\nTier ${tier} (>${threshold} years old): ${count} places`);
        console.log('─'.repeat(40));
        
        const tierPlaces = agingPlaces.filter(p => p.tier === tier).slice(0, 10);
        tierPlaces.forEach(p => {
          const status = p.lifecycle_status === 'FLAG_FOR_REVIEW' ? '🚩 Already flagged' : '⚠️  Needs flag';
          console.log(`  ${status} ${p.name}`);
          console.log(`     Age: ${p.age_years} years`);
          console.log(`     Location: ${p.neighborhood || 'Unknown'}`);
          console.log(`     Batch: ${p.import_batch || 'Unknown'}`);
          console.log('');
        });
        
        if (agingPlaces.filter(p => p.tier === tier).length > 10) {
          console.log(`  ... and ${agingPlaces.filter(p => p.tier === tier).length - 10} more\n`);
        }
      }
    });
  }
  
  // Final verdict
  console.log('═'.repeat(60));
  if (agingPlaces.length === 0) {
    console.log('✅ NO AGING ISSUES');
    console.log('All places are within their tier aging thresholds.');
  } else {
    console.log('⚠️  AGING REVIEW NEEDED');
    console.log(`${agingPlaces.length} places have aged beyond their tier thresholds.`);
    console.log('');
    console.log('Actions:');
    console.log('  1. Review each place - is it still operating and relevant?');
    console.log('  2. If YES: Mark as LEGACY_FAVORITE to exempt from aging');
    console.log('  3. If NO: Mark as ARCHIVED or CLOSED_PERMANENTLY');
    console.log('');
    console.log('Commands:');
    console.log('  - Flag for review: UPDATE golden_records SET lifecycle_status = \'FLAG_FOR_REVIEW\' WHERE canonical_id = \'...\';');
    console.log('  - Bless as legacy: UPDATE golden_records SET lifecycle_status = \'LEGACY_FAVORITE\' WHERE canonical_id = \'...\';');
    console.log('  - Archive: UPDATE golden_records SET lifecycle_status = \'ARCHIVED\', archive_reason = \'AGED_OUT\' WHERE canonical_id = \'...\';');
  }
  console.log('═'.repeat(60));
  
  return agingPlaces;
}

async function main() {
  try {
    const agingPlaces = await runAgingAudit();
    process.exit(agingPlaces.length > 0 ? 1 : 0);
  } catch (error) {
    console.error('Error during aging audit:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
