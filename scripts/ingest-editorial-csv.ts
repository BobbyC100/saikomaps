#!/usr/bin/env node
/**
 * Editorial CSV Ingestion Pipeline
 * 
 * Ingests editorial data from CSV files into raw_records table.
 * Expected CSV format: Name, Neighborhood, Category, Address, Source, SourceURL
 * 
 * Usage:
 *   node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/ingest-editorial-csv.ts <path-to-csv> <source-name>
 *   node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/ingest-editorial-csv.ts data/eater-la.csv editorial_eater
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { readFileSync } from 'fs';
import { parse } from 'papaparse';
import { latLngToCell, gridDisk } from 'h3-js';
import slugify from 'slugify';

// Simple name normalization
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

const prisma = new PrismaClient();

interface EditorialRow {
  Name: string;
  Neighborhood?: string;
  Category?: string;
  Address?: string;
  Source?: string;
  SourceURL?: string;
  Phone?: string;
  Website?: string;
  Instagram?: string;
  Latitude?: string;
  Longitude?: string;
  GooglePlaceID?: string;
}

async function main() {
  const csvPath = process.argv[2];
  const sourceName = process.argv[3];
  
  if (!csvPath || !sourceName) {
    console.error('Usage: ingest-editorial-csv.ts <path-to-csv> <source-name>');
    console.error('Example: ingest-editorial-csv.ts data/eater-la.csv editorial_eater');
    process.exit(1);
  }
  
  console.log(`📥 Ingesting editorial CSV: ${csvPath}`);
  console.log(`   Source: ${sourceName}\n`);
  
  // Read and parse CSV
  const csvContent = readFileSync(csvPath, 'utf-8');
  const parsed = parse<EditorialRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
  });
  
  if (parsed.errors.length > 0) {
    console.error('CSV parsing errors:', parsed.errors);
    process.exit(1);
  }
  
  const rows = parsed.data;
  console.log(`Found ${rows.length} rows in CSV\n`);
  
  let ingested = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const row of rows) {
    try {
      await ingestRow(row, sourceName);
      ingested++;
      
      if (ingested % 25 === 0) {
        console.log(`Progress: ${ingested}/${rows.length} ingested...`);
      }
    } catch (error: any) {
      console.error(`✗ Failed to ingest ${row.Name}:`, error.message);
      errors++;
    }
  }
  
  console.log(`\n✅ Ingestion complete!`);
  console.log(`   Ingested: ${ingested}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Errors: ${errors}`);
  
  console.log(`\n🔍 Next steps:`);
  console.log(`   1. Run resolver pipeline: npm run resolver:run`);
  console.log(`   2. Review queue at: http://localhost:3000/admin/review`);
}

async function ingestRow(row: EditorialRow, sourceName: string) {
  const name = row.Name?.trim();
  if (!name) {
    throw new Error('Name is required');
  }
  
  // Try to get coordinates from CSV first
  let lat: number | null = null;
  let lng: number | null = null;
  
  if (row.Latitude && row.Longitude) {
    lat = parseFloat(row.Latitude);
    lng = parseFloat(row.Longitude);
  } else if (row.Address || row.Neighborhood) {
    // Fallback to geocoding if no coordinates in CSV
    const geocodeResult = await geocodeAddress(row.Address || row.Neighborhood!, 'Los Angeles, CA');
    if (geocodeResult) {
      lat = geocodeResult.lat;
      lng = geocodeResult.lng;
    }
  }
  
  // Calculate H3 index if we have coordinates
  let h3Index: bigint | null = null;
  let h3Neighbors: bigint[] = [];
  
  if (lat && lng) {
    const h3Cell = latLngToCell(lat, lng, 9);
    h3Index = BigInt(`0x${h3Cell}`); // H3 returns hex string, convert properly
    
    const neighbors = gridDisk(h3Cell, 1);
    h3Neighbors = neighbors.map((cell) => BigInt(`0x${cell}`));
  }
  
  // Build raw_json
  const rawJson = {
    name,
    neighborhood: row.Neighborhood,
    category: row.Category,
    address_street: row.Address,
    source_publication: row.Source,
    source_url: row.SourceURL,
    phone: row.Phone,
    website: row.Website,
    instagram_handle: row.Instagram,
    google_place_id: row.GooglePlaceID,
    lat,
    lng,
  };
  
  // Generate external_id - use GooglePlaceID if available for exact matching
  const externalId = row.GooglePlaceID 
    ? `${sourceName}:${row.GooglePlaceID}`
    : `${sourceName}:${slugify(name, { lower: true })}:${slugify(row.Neighborhood || 'unknown', { lower: true })}`;
  
  // Upsert raw_record
  await prisma.raw_records.upsert({
    where: {
      source_name_external_id: {
        source_name: sourceName,
        external_id: externalId,
      },
    },
    create: {
      source_name: sourceName,
      external_id: externalId,
      source_url: row.SourceURL,
      h3_index_r9: h3Index,
      h3_neighbors_r9: h3Neighbors,
      raw_json: rawJson as Prisma.JsonValue,
      name_normalized: normalizeName(name),
      lat: lat ? new Prisma.Decimal(lat) : null,
      lng: lng ? new Prisma.Decimal(lng) : null,
      observed_at: new Date(),
      is_processed: false, // Will be processed by resolver
    },
    update: {
      source_url: row.SourceURL,
      h3_index_r9: h3Index,
      h3_neighbors_r9: h3Neighbors,
      raw_json: rawJson as Prisma.JsonValue,
      name_normalized: normalizeName(name),
      lat: lat ? new Prisma.Decimal(lat) : null,
      lng: lng ? new Prisma.Decimal(lng) : null,
      observed_at: new Date(),
    },
  });
  
  console.log(`✓ Ingested: ${name} (${row.Neighborhood || 'no neighborhood'})`);
}

/**
 * Geocode an address using Google Geocoding API
 * In production, you'd use the actual Google API.
 * For now, return null to skip geocoding.
 */
async function geocodeAddress(address: string, city: string): Promise<{ lat: number; lng: number } | null> {
  // TODO: Implement Google Geocoding API call
  // const fullAddress = `${address}, ${city}`;
  // const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${process.env.GOOGLE_MAPS_API_KEY}`);
  // const data = await response.json();
  // if (data.results && data.results.length > 0) {
  //   return {
  //     lat: data.results[0].geometry.location.lat,
  //     lng: data.results[0].geometry.location.lng,
  //   };
  // }
  
  console.warn(`⚠ Geocoding not implemented - skipping coordinates for: ${address}`);
  return null;
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
