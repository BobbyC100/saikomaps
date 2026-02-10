#!/usr/bin/env node
/**
 * Simple Resolver Pipeline
 * 
 * Finds candidate matches for unprocessed raw records using H3 blocking
 * and basic feature comparison. Creates review queue items for human review.
 * 
 * Usage:
 *   node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/resolver-pipeline.ts
 *   node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/resolver-pipeline.ts --dry-run
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { haversineDistance } from '../lib/haversine';
import { createReviewQueueItem } from '../lib/review-queue';

// Simple string similarity without external deps
function jaroWinklerSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1;
  if (!s1 || !s2) return 0;
  
  s1 = s1.toLowerCase();
  s2 = s2.toLowerCase();
  if (s1 === s2) return 1;
  
  const len1 = s1.length;
  const len2 = s2.length;
  const matchWindow = Math.floor(Math.max(len1, len2) / 2) - 1;
  
  let matches = 0;
  const s1Matches = new Array(len1).fill(false);
  const s2Matches = new Array(len2).fill(false);
  
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, len2);
    
    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }
  
  if (matches === 0) return 0;
  
  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }
  
  const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;
  
  let prefix = 0;
  for (let i = 0; i < Math.min(4, Math.min(len1, len2)); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }
  
  return jaro + prefix * 0.1 * (1 - jaro);
}

function normalizeName(name: string | null | undefined): string {
  if (!name) return '';
  let normalized = name.toLowerCase().trim();
  const substitutions: [RegExp, string][] = [
    [/\b(the|a|an)\b/g, ''],
    [/[\'"`]/g, ''],
    [/\s+/g, ' '],
    [/\b(restaurant|cafe|bar|grill|kitchen|eatery|bistro)\b/g, ''],
    [/[^\w\s]/g, ''],
  ];
  for (const [pattern, replacement] of substitutions) {
    normalized = normalized.replace(pattern, replacement);
  }
  return normalized.trim();
}

function normalizeAddress(address: string | null | undefined): string {
  if (!address) return '';
  let normalized = address.toLowerCase().trim();
  const substitutions: [RegExp, string][] = [
    [/\bstreet\b/g, 'st'],
    [/\bavenue\b/g, 'ave'],
    [/\bboulevard\b/g, 'blvd'],
    [/\bdrive\b/g, 'dr'],
    [/\broad\b/g, 'rd'],
    [/\bwest\b/g, 'w'],
    [/\beast\b/g, 'e'],
    [/\bnorth\b/g, 'n'],
    [/\bsouth\b/g, 's'],
    [/[^\w\s]/g, ''],
    [/\s+/g, ' '],
  ];
  for (const [pattern, replacement] of substitutions) {
    normalized = normalized.replace(pattern, replacement);
  }
  return normalized.trim();
}

const prisma = new PrismaClient();

const isDryRun = process.argv.includes('--dry-run');

// Matching thresholds
const AUTO_LINK_THRESHOLD = 0.90;  // Above this, auto-link
const REVIEW_THRESHOLD = 0.70;      // Between this and auto-link, send to review
// Below review threshold, treat as separate entities

async function main() {
  console.log('🔍 Running resolver pipeline\n');
  
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }
  
  // Phase 1: Google Place ID exact match
  await googlePlaceIdPrepass();
  
  // Phase 2: Placekey pre-pass (exact matches)
  await placekeyPrepass();
  
  // Phase 2: H3 blocking + ML comparison
  await resolveUnprocessedRecords();
  
  console.log('\n✅ Resolver pipeline complete!');
}

/**
 * Phase 0: Google Place ID exact match
 * Auto-link records with identical Google Place IDs to existing places
 */
async function googlePlaceIdPrepass() {
  console.log('📍 Phase 1: Google Place ID exact match\n');
  
  const recordsWithGoogleId = await prisma.raw_records.findMany({
    where: {
      is_processed: false,
      raw_json: {
        path: ['google_place_id'],
        not: Prisma.JsonNull,
      },
    },
  });
  
  console.log(`Found ${recordsWithGoogleId.length} unprocessed records with Google Place IDs`);
  
  let autoLinked = 0;
  
  for (const record of recordsWithGoogleId) {
    const googlePlaceId = record.raw_json?.google_place_id;
    if (!googlePlaceId) continue;
    
    // Find existing raw_record with same Google Place ID that's already linked
    const existingRecord = await prisma.raw_records.findFirst({
      where: {
        raw_id: { not: record.raw_id },
        is_processed: true,
        raw_json: {
          path: ['google_place_id'],
          equals: googlePlaceId,
        },
      },
      include: {
        entity_links_from: {
          where: { is_active: true },
          take: 1,
        },
      },
    });
    
    if (existingRecord && existingRecord.entity_links_from[0]) {
      // Auto-link to same canonical entity
      const canonicalId = existingRecord.entity_links_from[0].canonical_id;
      
      if (!isDryRun) {
        await prisma.entity_links.create({
          data: {
            canonical_id: canonicalId,
            raw_id: record.raw_id,
            match_confidence: new Prisma.Decimal(1.0),
            match_method: 'google_place_id_exact',
            linked_by: 'system:google_place_id_prepass',
          },
        });
        
        await prisma.raw_records.update({
          where: { raw_id: record.raw_id },
          data: { is_processed: true },
        });
      }
      
      autoLinked++;
      console.log(`✓ Auto-linked via Google Place ID: ${record.name_normalized} (${googlePlaceId})`);
    }
  }
  
  console.log(`\n✅ Google Place ID pre-pass: ${autoLinked} records auto-linked\n`);
}

/**
 * Phase 1: Placekey pre-pass
 * Auto-link records with identical placekeys
 */
async function placekeyPrepass() {
  console.log('📍 Phase 2: Placekey pre-pass\n');
  
  const recordsWithPlacekey = await prisma.raw_records.findMany({
    where: {
      placekey: { not: null },
      is_processed: false,
    },
  });
  
  console.log(`Found ${recordsWithPlacekey.length} unprocessed records with Placekeys`);
  
  // Group by Placekey
  const byPlacekey = new Map<string, any[]>();
  for (const record of recordsWithPlacekey) {
    if (record.placekey) {
      if (!byPlacekey.has(record.placekey)) {
        byPlacekey.set(record.placekey, []);
      }
      byPlacekey.get(record.placekey)!.push(record);
    }
  }
  
  let autoLinked = 0;
  
  for (const [placekey, records] of byPlacekey) {
    if (records.length > 1) {
      // Multiple records share placekey → auto-link
      const canonicalId = crypto.randomUUID();
      
      if (!isDryRun) {
        // Create golden_records first
        const firstRecord = records[0];
        await prisma.golden_records.create({
          data: {
            canonical_id: canonicalId,
            slug: `placekey-${canonicalId.split('-')[0]}`,
            name: firstRecord.raw_json.name || 'Unknown',
            lat: firstRecord.lat || new Prisma.Decimal(0),
            lng: firstRecord.lng || new Prisma.Decimal(0),
            source_attribution: {} as Prisma.JsonValue,
            cuisines: [],
            vibe_tags: [],
            signature_dishes: [],
            pro_tips: [],
          },
        });
        
        // Then create entity links for all matching records
        for (const record of records) {
          await prisma.entity_links.create({
            data: {
              canonical_id: canonicalId,
              raw_id: record.raw_id,
              match_confidence: new Prisma.Decimal(1.0),
              match_method: 'placekey_exact',
              linked_by: 'system:placekey_prepass',
            },
          });
          
          await prisma.raw_records.update({
            where: { raw_id: record.raw_id },
            data: { is_processed: true },
          });
        }
      }
      
      autoLinked += records.length;
      console.log(`✓ Auto-linked ${records.length} records with Placekey: ${placekey}`);
    }
  }
  
  console.log(`\n✅ Placekey pre-pass: ${autoLinked} records auto-linked\n`);
}

/**
 * Phase 2: H3 blocking + feature comparison
 */
async function resolveUnprocessedRecords() {
  console.log('🧮 Phase 3: H3 blocking + ML comparison\n');
  
  const unprocessed = await prisma.raw_records.findMany({
    where: { is_processed: false },
    take: 100, // Process in batches
  });
  
  console.log(`Found ${unprocessed.length} unprocessed records\n`);
  
  let autoLinked = 0;
  let sentToReview = 0;
  let keptSeparate = 0;
  
  for (const record of unprocessed) {
    const candidates = await findCandidates(record);
    
    if (candidates.length === 0) {
      // No candidates found - create new canonical entity
      if (!isDryRun) {
        const canonicalId = crypto.randomUUID();
        
        // Create golden_records first
        await prisma.golden_records.create({
          data: {
            canonical_id: canonicalId,
            slug: `unknown-${canonicalId.split('-')[0]}`,
            name: record.raw_json.name || 'Unknown',
            lat: record.lat || new Prisma.Decimal(0),
            lng: record.lng || new Prisma.Decimal(0),
            source_attribution: {} as Prisma.JsonValue,
            cuisines: [],
            vibe_tags: [],
            signature_dishes: [],
            pro_tips: [],
          },
        });
        
        // Then create entity link
        await prisma.entity_links.create({
          data: {
            canonical_id: canonicalId,
            raw_id: record.raw_id,
            match_confidence: new Prisma.Decimal(1.0),
            match_method: 'new_entity',
            linked_by: 'system:resolver',
          },
        });
        
        await prisma.raw_records.update({
          where: { raw_id: record.raw_id },
          data: { is_processed: true },
        });
      }
      keptSeparate++;
      continue;
    }
    
    // Find best match
    let bestMatch = null;
    let bestScore = 0;
    
    for (const candidate of candidates) {
      const score = computeMatchScore(record, candidate);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = candidate;
      }
    }
    
    if (!bestMatch) continue;
    
    if (bestScore >= AUTO_LINK_THRESHOLD) {
      // Auto-link
      if (!isDryRun) {
        const canonicalId = bestMatch.canonical_id || crypto.randomUUID();
        
        await prisma.entity_links.create({
          data: {
            canonical_id: canonicalId,
            raw_id: record.raw_id,
            match_confidence: new Prisma.Decimal(bestScore),
            match_method: 'dedupe_ml',
            linked_by: 'system:resolver',
          },
        });
        
        await prisma.raw_records.update({
          where: { raw_id: record.raw_id },
          data: { is_processed: true },
        });
      }
      
      autoLinked++;
      console.log(`✓ Auto-linked: ${record.name_normalized} (${(bestScore * 100).toFixed(1)}%)`);
      
    } else if (bestScore >= REVIEW_THRESHOLD) {
      // Send to review queue
      if (!isDryRun) {
        await createReviewQueueItem({
          rawIdA: record.raw_id,
          rawIdB: bestMatch.raw_id,
          canonicalId: bestMatch.canonical_id,
          conflictType: 'low_confidence_match',
          matchConfidence: bestScore,
          priority: 5,
        });
      }
      
      sentToReview++;
      console.log(`? Review needed: ${record.name_normalized} (${(bestScore * 100).toFixed(1)}%)`);
      
    } else {
      // Keep separate
      if (!isDryRun) {
        const canonicalId = crypto.randomUUID();
        
        // Create golden_records first
        await prisma.golden_records.create({
          data: {
            canonical_id: canonicalId,
            slug: `unknown-${canonicalId.split('-')[0]}`,
            name: record.raw_json.name || 'Unknown',
            lat: record.lat || new Prisma.Decimal(0),
            lng: record.lng || new Prisma.Decimal(0),
            source_attribution: {} as Prisma.JsonValue,
            cuisines: [],
            vibe_tags: [],
            signature_dishes: [],
            pro_tips: [],
          },
        });
        
        // Then create entity link
        await prisma.entity_links.create({
          data: {
            canonical_id: canonicalId,
            raw_id: record.raw_id,
            match_confidence: new Prisma.Decimal(1.0),
            match_method: 'new_entity',
            linked_by: 'system:resolver',
          },
        });
        
        await prisma.raw_records.update({
          where: { raw_id: record.raw_id },
          data: { is_processed: true },
        });
      }
      
      keptSeparate++;
    }
  }
  
  console.log(`\n✅ Resolution complete:`);
  console.log(`   Auto-linked: ${autoLinked}`);
  console.log(`   Sent to review: ${sentToReview}`);
  console.log(`   Kept separate: ${keptSeparate}`);
}

/**
 * Find candidate matches using H3 blocking
 */
async function findCandidates(record: any): Promise<any[]> {
  if (!record.h3_index_r9 || !record.h3_neighbors_r9) {
    return [];
  }
  
  // Find records in same H3 cell or neighbors
  const candidates = await prisma.raw_records.findMany({
    where: {
      OR: [
        { h3_index_r9: { in: record.h3_neighbors_r9 } },
        { h3_neighbors_r9: { has: record.h3_index_r9 } },
      ],
      raw_id: { not: record.raw_id },
      is_processed: true,
    },
    include: {
      entity_links_from: {
        where: { is_active: true },
        take: 1,
        include: {
          golden_record: true, // Ensure golden_record exists
        },
      },
    },
  });
  
  // Only return candidates with valid golden_records
  return candidates
    .filter(c => c.entity_links_from[0]?.golden_record)
    .map(c => ({
      ...c,
      canonical_id: c.entity_links_from[0]?.canonical_id,
    }));
}

/**
 * Compute match score between two records
 */
function computeMatchScore(recordA: any, recordB: any): number {
  const features: number[] = [];
  
  // Name similarity (highest weight)
  const nameSim = jaroWinklerSimilarity(
    recordA.name_normalized || '',
    recordB.name_normalized || ''
  );
  features.push(nameSim * 0.5); // 50% weight
  
  // Distance (closer is better)
  if (recordA.lat && recordA.lng && recordB.lat && recordB.lng) {
    const distance = haversineDistance(
      parseFloat(recordA.lat.toString()),
      parseFloat(recordA.lng.toString()),
      parseFloat(recordB.lat.toString()),
      parseFloat(recordB.lng.toString())
    );
    const distanceScore = Math.max(0, 1 - distance / 100); // 0 at 100m+
    features.push(distanceScore * 0.3); // 30% weight
  }
  
  // Address similarity (if available)
  const jsonA = recordA.raw_json as any;
  const jsonB = recordB.raw_json as any;
  
  if (jsonA.address_street && jsonB.address_street) {
    const addrSim = jaroWinklerSimilarity(
      normalizeAddress(jsonA.address_street),
      normalizeAddress(jsonB.address_street)
    );
    features.push(addrSim * 0.2); // 20% weight
  }
  
  // Sum all features
  return features.reduce((sum, f) => sum + f, 0);
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
