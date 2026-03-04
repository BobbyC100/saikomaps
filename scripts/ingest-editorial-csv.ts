#!/usr/bin/env node
/**
 * Editorial CSV Ingestion Pipeline
 *
 * Ingests editorial data from CSV files into raw_records table.
 * Expected CSV format: Name, Neighborhood, Category, Address, Source, SourceURL
 * Optional: Phone, Website, Instagram, Latitude, Longitude, GooglePlaceID, GoogleMapsURL
 *
 * Pre-ingest validation (--validate): Validates rows before ingestion. Rows must have
 * at least one identity anchor: GooglePlaceID, parsable GoogleMapsURL, or Address
 * (if geocoding implemented). Rejects are written to data/intake/_rejects/<batch>_rejects.csv
 *
 * Usage:
 *   ingest-editorial-csv.ts <path-to-csv> <source-name> [--validate] [--allow-failures]
 *   npm run ingest:csv -- data/intake/file.csv editorial_era_la --validate
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { readFileSync } from 'fs';
import { parse } from 'papaparse';
import { latLngToCell, gridDisk } from 'h3-js';
import slugify from 'slugify';
import {
  validateCsv,
  validateAndWriteRejects,
  writeRejects,
} from '@/lib/validate-intake-csv';
import { extractPlaceId } from '@/lib/utils/googleMapsParser';
import { writeTrace } from '@/lib/traces';
import { TraceSource, TraceEventType } from '@prisma/client';

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
  GoogleMapsURL?: string;
}

function parseArgs(): {
  csvPath: string;
  sourceName: string;
  validateOnly: boolean;
  allowFailures: boolean;
} {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const flags = process.argv.slice(2).filter((a) => a.startsWith('--'));
  const csvPath = args[0];
  const sourceName = args[1];
  const validateOnly = flags.includes('--validate');
  const allowFailures = flags.includes('--allow-failures');

  return { csvPath, sourceName, validateOnly, allowFailures };
}

/** Map flexible CSV row to EditorialRow (supports ERA + editorial column names) */
function toEditorialRow(row: Record<string, unknown>): EditorialRow {
  const get = (...keys: string[]) => {
    const k = Object.keys(row).find(
      (x) => keys.some((y) => x.toLowerCase() === y.toLowerCase())
    );
    return k ? String(row[k] ?? '').trim() || undefined : undefined;
  };
  return {
    Name: get('name', 'Name') ?? '',
    Neighborhood: get('neighborhood', 'Neighborhood'),
    Category: get('category', 'Category', 'primary_category'),
    Address: get('street_address', 'Address', 'address'),
    Source: get('source_name', 'Source'),
    SourceURL: get('source_url', 'SourceURL'),
    Phone: get('phone', 'Phone'),
    Website: get('website', 'Website'),
    Instagram: get('instagram', 'Instagram'),
    Latitude: get('latitude', 'Latitude'),
    Longitude: get('longitude', 'Longitude'),
    GooglePlaceID: get('google_place_id', 'GooglePlaceID'),
    GoogleMapsURL: get('google_maps_url', 'GoogleMapsURL'),
  };
}

async function main() {
  const { csvPath, sourceName, validateOnly, allowFailures } = parseArgs();

  if (!csvPath || !sourceName) {
    console.error('Usage: ingest-editorial-csv.ts <path-to-csv> <source-name> [--validate] [--allow-failures]');
    console.error('Example: ingest-editorial-csv.ts data/intake/file.csv editorial_era_la --validate');
    process.exit(1);
  }

  const batchId = sourceName;

  if (validateOnly) {
    // Validate-only mode: no DB writes
    console.log(`🔍 Validating intake CSV: ${csvPath}`);
    console.log(`   Source: ${sourceName}\n`);

    const { summary, rejectsPath } = validateAndWriteRejects(csvPath, batchId);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('PRE-INGEST VALIDATION SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`   Total rows:  ${summary.total}`);
    console.log(`   Pass:        ${summary.pass}`);
    console.log(`   Fail:        ${summary.fail}`);

    if (summary.fail > 0) {
      console.log('\n   Failures by reason:');
      for (const [reason, count] of Object.entries(summary.byReason)) {
        if (count > 0) {
          console.log(`     ${reason}: ${count}`);
        }
      }
      if (rejectsPath) {
        console.log(`\n   Rejects written to: ${rejectsPath}`);
      }
    }

    console.log('');
    if (summary.fail > 0 && !allowFailures) {
      console.log('❌ Validation failed. Fix rejects and re-run, or use --allow-failures to proceed.\n');
      process.exit(1);
    }
    if (summary.fail > 0) {
      console.log('⚠️  Validation complete with failures (--allow-failures). See rejects file.\n');
    } else {
      console.log('✅ Validation complete. All rows pass.\n');
    }
    process.exit(0);
  }

  // Ingest mode: validate first, skip failed rows, ingest only pass rows
  console.log(`📥 Ingesting editorial CSV: ${csvPath}`);
  console.log(`   Source: ${sourceName}\n`);

  const { results, summary, rows } = validateCsv(csvPath);

  if (summary.fail > 0) {
    const rejectsPath = writeRejects(csvPath, batchId, results, rows);
    console.log(`⚠️  ${summary.fail} rows failed validation (see ${rejectsPath})`);
    console.log(`   Ingesting ${summary.pass} passing rows only.\n`);
    if (!allowFailures) {
      console.log('   Use --allow-failures to suppress exit code 1 when failures exist.\n');
    }
  }

  const passIndices = new Set(
    results.filter((r) => r.pass).map((r) => r.rowIndex - 1)
  );
  const rowsToIngest = rows.filter((_, i) => passIndices.has(i));

  if (rowsToIngest.length === 0) {
    console.error('No rows to ingest. Fix validation failures first.\n');
    process.exit(1);
  }

  let ingested = 0;
  let errors = 0;

  for (const rawRow of rowsToIngest) {
    const row = toEditorialRow(rawRow);
    try {
      await ingestRow(row, sourceName);
      ingested++;

      if (ingested % 25 === 0) {
        console.log(`Progress: ${ingested}/${rowsToIngest.length} ingested...`);
      }
    } catch (error: unknown) {
      console.error(`✗ Failed to ingest ${row.Name}:`, (error as Error).message);
      errors++;
    }
  }

  console.log(`\n✅ Ingestion complete!`);
  console.log(`   Ingested: ${ingested}`);
  console.log(`   Skipped (validation): ${summary.fail}`);
  console.log(`   Errors: ${errors}`);

  if (summary.fail > 0 && !allowFailures) {
    process.exit(1);
  }

  console.log(`\n🔍 Next steps:`);
  console.log(`   1. Run resolver pipeline: npm run resolver:run`);
  console.log(`   2. Review queue at: http://localhost:3000/admin/review`);
}

async function ingestRow(row: EditorialRow, sourceName: string) {
  const name = row.Name?.trim();
  if (!name) {
    throw new Error('Name is required');
  }

  // Resolve Google Place ID: direct field, or extract from GoogleMapsURL
  let googlePlaceId = row.GooglePlaceID?.trim();
  if (!googlePlaceId && row.GoogleMapsURL?.trim()) {
    googlePlaceId = extractPlaceId(row.GoogleMapsURL) ?? undefined;
  }

  // Try to get coordinates from CSV first
  let lat: number | null = null;
  let lng: number | null = null;

  if (row.Latitude && row.Longitude) {
    lat = parseFloat(row.Latitude);
    lng = parseFloat(row.Longitude);
  } else if (row.Address || row.Neighborhood) {
    // Fallback to geocoding if no coordinates in CSV
    const geocodeResult = await geocodeAddress(
      row.Address || row.Neighborhood!,
      'Los Angeles, CA'
    );
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
    google_place_id: googlePlaceId,
    lat,
    lng,
  };

  // Generate external_id - use GooglePlaceID if available for exact matching
  const externalId = googlePlaceId
    ? `${sourceName}:${googlePlaceId}`
    : `${sourceName}:${slugify(name, { lower: true })}:${slugify(row.Neighborhood || 'unknown', { lower: true })}`;
  
  // Upsert raw_record
  const rawRecord = await prisma.raw_records.upsert({
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

  // TRACES: INGEST_SEEN — one per raw record (entity_id null; pre-entity)
  await writeTrace({
    rawId: rawRecord.raw_id,
    source: TraceSource.ingest,
    eventType: TraceEventType.INGEST_SEEN,
    newValue: { name, source_name: rawRecord.source_name, external_id: rawRecord.external_id },
    observedAt: rawRecord.observed_at ? new Date(rawRecord.observed_at) : undefined,
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
