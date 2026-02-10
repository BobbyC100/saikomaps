#!/usr/bin/env node
/**
 * Export Existing Places to Entity Resolution System
 * 
 * Seeds raw_records and entity_links from the existing places table.
 * This creates the foundation for the new MDM system.
 * 
 * Usage:
 *   node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/export-to-resolver.ts
 *   node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/export-to-resolver.ts --dry-run
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { latLngToCell, gridDisk } from 'h3-js';
import { updateGoldenRecord } from '../lib/survivorship';

// Simple name normalization without external deps
function normalizeName(name: string | null | undefined): string {
  if (!name) return '';
  
  let normalized = name.toLowerCase().trim();
  
  const substitutions: [RegExp, string][] = [
    [/\b(the|a|an)\b/g, ''],
    [/[\'"`]/g, ''],
    [/\s+/g, ' '],
    [/\b(restaurant|cafe|bar|grill|kitchen|eatery|bistro|brasserie)\b/g, ''],
    [/[^\w\s]/g, ''],
  ];
  
  for (const [pattern, replacement] of substitutions) {
    normalized = normalized.replace(pattern, replacement);
  }
  
  return normalized.trim();
}

const prisma = new PrismaClient();

const isDryRun = process.argv.includes('--dry-run');

interface PlaceExport {
  id: string;
  slug: string;
  name: string;
  google_place_id: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  website: string | null;
  instagram: string | null;
  hours: any;
  description: string | null;
  google_photos: any;
  google_types: string[];
  price_level: number | null;
  neighborhood: string | null;
  category: string | null;
  editorial_sources: any;
  pull_quote: string | null;
  pull_quote_source: string | null;
  pull_quote_url: string | null;
  vibe_tags: string[];
  address: string | null;
}

async function main() {
  console.log('🚀 Exporting existing places to entity resolution system\n');
  
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }
  
  // Fetch all places
  const places = await prisma.places.findMany({
    select: {
      id: true,
      slug: true,
      name: true,
      google_place_id: true,
      latitude: true,
      longitude: true,
      phone: true,
      website: true,
      instagram: true,
      hours: true,
      description: true,
      google_photos: true,
      google_types: true,
      price_level: true,
      neighborhood: true,
      category: true,
      editorial_sources: true,
      pull_quote: true,
      pull_quote_source: true,
      pull_quote_url: true,
      vibe_tags: true,
      address: true,
    },
    orderBy: { name: 'asc' },
  });
  
  console.log(`Found ${places.length} places to export\n`);
  
  let exported = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const place of places) {
    try {
      await exportPlace(place as any);
      exported++;
      
      if (exported % 50 === 0) {
        console.log(`Progress: ${exported}/${places.length} places exported...`);
      }
    } catch (error: any) {
      console.error(`✗ Failed to export ${place.name}:`, error.message);
      errors++;
    }
  }
  
  console.log('\n✅ Export complete!');
  console.log(`   Exported: ${exported}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Errors: ${errors}`);
  
  if (!isDryRun && exported > 0) {
    console.log('\n📊 Generating golden records from survivorship rules...');
    
    // Get all unique canonical IDs
    const canonicalIds = await prisma.entity_links.findMany({
      where: { is_active: true },
      select: { canonical_id: true },
      distinct: ['canonical_id'],
    });
    
    console.log(`Found ${canonicalIds.length} canonical entities to resolve\n`);
    
    let resolved = 0;
    for (const { canonical_id } of canonicalIds) {
      try {
        await updateGoldenRecord(canonical_id);
        resolved++;
        
        if (resolved % 25 === 0) {
          console.log(`Progress: ${resolved}/${canonicalIds.length} golden records resolved...`);
        }
      } catch (error: any) {
        console.error(`✗ Failed to resolve ${canonical_id}:`, error.message);
      }
    }
    
    console.log(`\n✅ Resolved ${resolved} golden records!`);
  }
}

async function exportPlace(place: PlaceExport) {
  const lat = place.lat ? parseFloat(place.lat.toString()) : null;
  const lng = place.lng ? parseFloat(place.lng.toString()) : null;
  
  // Calculate H3 index if we have coordinates
  let h3Index: bigint | null = null;
  let h3Neighbors: bigint[] = [];
  
  if (lat && lng) {
    const h3Cell = latLngToCell(lat, lng, 9); // Resolution 9 (~0.1 km²)
    h3Index = BigInt(h3Cell);
    
    // Get K-ring neighbors (center + 6 surrounding cells)
    const neighbors = gridDisk(h3Cell, 1);
    h3Neighbors = neighbors.map((cell) => BigInt(cell));
  }
  
  // Build raw_json with all data from the place
  const rawJson = {
    saiko_id: place.id,
    name: place.name,
    google_place_id: place.google_place_id,
    lat,
    lng,
    phone: place.phone,
    website: place.website,
    instagram_handle: place.instagram,
    hours: place.hours,
    description: place.description,
    google_photos: place.google_photos,
    google_types: place.google_types,
    price_level: place.price_level,
    neighborhood: place.neighborhood,
    category: place.category,
    editorial_sources: place.editorial_sources,
    pull_quote: place.pull_quote,
    pull_quote_source: place.pull_quote_source,
    pull_quote_url: place.pull_quote_url,
    vibe_tags: place.vibe_tags,
    address_street: place.address,
    slug: place.slug,
  };
  
  if (isDryRun) {
    console.log(`[DRY RUN] Would export: ${place.name}`);
    return;
  }
  
  // Create raw_record
  const rawRecord = await prisma.raw_records.upsert({
    where: {
      source_name_external_id: {
        source_name: 'saiko_seed',
        external_id: place.google_place_id || place.id,
      },
    },
    create: {
      source_name: 'saiko_seed',
      external_id: place.google_place_id || place.id,
      h3_index_r9: h3Index,
      h3_neighbors_r9: h3Neighbors,
      raw_json: rawJson as Prisma.JsonValue,
      name_normalized: normalizeName(place.name),
      lat: lat ? new Prisma.Decimal(lat) : null,
      lng: lng ? new Prisma.Decimal(lng) : null,
      observed_at: new Date(),
      is_processed: true, // Already in system
    },
    update: {
      h3_index_r9: h3Index,
      h3_neighbors_r9: h3Neighbors,
      raw_json: rawJson as Prisma.JsonValue,
      name_normalized: normalizeName(place.name),
      lat: lat ? new Prisma.Decimal(lat) : null,
      lng: lng ? new Prisma.Decimal(lng) : null,
    },
  });
  
  // Create canonical entity ID
  const canonicalId = crypto.randomUUID();
  
  // Create golden record FIRST (so entity_links foreign key works)
  await prisma.golden_records.upsert({
    where: { canonical_id: canonicalId },
    create: {
      canonical_id: canonicalId,
      slug: place.slug,
      name: place.name,
      lat: lat ? new Prisma.Decimal(lat) : new Prisma.Decimal(0),
      lng: lng ? new Prisma.Decimal(lng) : new Prisma.Decimal(0),
      source_attribution: {} as Prisma.JsonValue,
      cuisines: [],
      vibe_tags: [],
      signature_dishes: [],
      pro_tips: [],
    },
    update: {},
  });
  
  // Then create entity link
  await prisma.entity_links.upsert({
    where: {
      canonical_id_raw_id: {
        canonical_id: canonicalId,
        raw_id: rawRecord.raw_id,
      },
    },
    create: {
      canonical_id: canonicalId,
      raw_id: rawRecord.raw_id,
      match_confidence: new Prisma.Decimal(1.0),
      match_method: 'seed_record',
      linked_by: 'system:export',
    },
    update: {},
  });
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
