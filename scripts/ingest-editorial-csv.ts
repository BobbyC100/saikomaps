#!/usr/bin/env node
/**
 * Editorial CSV Ingestion Pipeline
 *
 * Ingests editorial / research batch data from CSV into raw_records.
 *
 * Accepts two header formats — whichever is present in the file:
 *
 *   Preferred (new minimal format):
 *     name, source, source_url, notes, category, address, city, neighborhood,
 *     website, instagram, phone, latitude, longitude, google_place_id
 *
 *   Legacy format (still supported):
 *     Name, Neighborhood, Category, Address, Source, SourceURL, Phone,
 *     Website, Instagram, Latitude, Longitude, GooglePlaceID
 *
 *   Research sheet aliases (mapped automatically):
 *     entity_name → name
 *     entity_type → category
 *
 * Only `name` is required. `source` is filled from the CLI arg when omitted.
 *
 * Usage:
 *   npm run ingest:csv -- <path-to-csv> <source-name>
 *   npm run ingest:csv -- data/intake/TRACES_BEVERAGE_RESEARCH_2026_03_07.csv editorial_traces_research
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { readFileSync } from 'fs';
import { parse } from 'papaparse';
import { latLngToCell, gridDisk } from 'h3-js';
import slugify from 'slugify';

// ---------------------------------------------------------------------------
// Name normalization (unchanged)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Row normalization — accepts any supported header format
// ---------------------------------------------------------------------------

/**
 * Raw parsed row from papaparse — keys are whatever the CSV headers say.
 * We intentionally use a loose type here so we can probe multiple aliases.
 */
type RawRow = Record<string, string | undefined>;

/** Canonical shape used internally after field resolution. */
interface NormalizedRow {
  name:           string;
  source:         string | null;
  source_url:     string | null;
  notes:          string | null;
  category:       string | null;
  address:        string | null;
  city:           string | null;
  neighborhood:   string | null;
  website:        string | null;
  instagram:      string | null;
  phone:          string | null;
  latitude:       string | null;
  longitude:      string | null;
  google_place_id: string | null;
}

/** Pick the first non-empty value from a list of candidate keys. */
function pick(row: RawRow, ...keys: string[]): string | null {
  for (const key of keys) {
    const v = row[key]?.trim();
    if (v) return v;
  }
  return null;
}

function normalizeRow(raw: RawRow, fallbackSource: string): NormalizedRow {
  return {
    name:            pick(raw, 'name', 'Name', 'entity_name')  ?? '',
    source:          pick(raw, 'source', 'Source')             ?? fallbackSource,
    source_url:      pick(raw, 'source_url', 'SourceURL'),
    notes:           pick(raw, 'notes', 'Notes'),
    category:        pick(raw, 'category', 'Category', 'entity_type'),
    address:         pick(raw, 'address', 'Address'),
    city:            pick(raw, 'city', 'City'),
    neighborhood:    pick(raw, 'neighborhood', 'Neighborhood'),
    website:         pick(raw, 'website', 'Website'),
    instagram:       pick(raw, 'instagram', 'Instagram'),
    phone:           pick(raw, 'phone', 'Phone'),
    latitude:        pick(raw, 'latitude', 'Latitude'),
    longitude:       pick(raw, 'longitude', 'Longitude'),
    google_place_id: pick(raw, 'google_place_id', 'GooglePlaceID'),
  };
}

async function main() {
  if (process.env.LEGACY_WRITES_FROZEN) {
    console.error('FREEZE: LEGACY_WRITES_FROZEN is set — legacy write paths are disabled for Fields v2 cutover. Exiting.');
    process.exit(1);
  }

  const csvPath    = process.argv[2];
  const sourceName = process.argv[3];

  if (!csvPath || !sourceName) {
    console.error('Usage: npm run ingest:csv -- <path-to-csv> <source-name>');
    console.error('Example: npm run ingest:csv -- data/intake/TRACES_BEVERAGE_RESEARCH_2026_03_07.csv editorial_traces_research');
    process.exit(1);
  }

  console.log(`Ingesting editorial CSV: ${csvPath}`);
  console.log(`  DB source_name tag: ${sourceName}\n`);

  const csvContent = readFileSync(csvPath, 'utf-8');
  const parsed     = parse<RawRow>(csvContent, { header: true, skipEmptyLines: true });

  if (parsed.errors.length > 0) {
    console.error('CSV parsing errors:', parsed.errors);
    process.exit(1);
  }

  const rows = parsed.data;
  console.log(`Found ${rows.length} rows in CSV\n`);

  // Show detected headers so operators can confirm field mapping
  const detectedHeaders = Object.keys(rows[0] ?? {});
  console.log(`  Headers detected: ${detectedHeaders.join(', ')}\n`);

  let ingested = 0;
  let skipped  = 0;
  let errors   = 0;

  for (const rawRow of rows) {
    const row = normalizeRow(rawRow, sourceName);

    if (!row.name) {
      console.warn(`  [skip] Row has no name — skipping`);
      skipped++;
      continue;
    }

    try {
      await ingestRow(row, sourceName);
      ingested++;
      if (ingested % 25 === 0) {
        console.log(`  Progress: ${ingested}/${rows.length}...`);
      }
    } catch (error: unknown) {
      console.error(`  [error] ${row.name}: ${error instanceof Error ? error.message : String(error)}`);
      errors++;
    }
  }

  console.log(`\nIngestion complete`);
  console.log(`  Ingested : ${ingested}`);
  if (skipped > 0) console.log(`  Skipped  : ${skipped}`);
  if (errors  > 0) console.log(`  Errors   : ${errors}`);
  console.log(`\nNext steps:`);
  console.log(`  resolver : npm run resolver:run`);
  console.log(`  review   : http://localhost:3000/admin/review`);
}

async function ingestRow(row: NormalizedRow, sourceName: string) {
  const { name } = row;

  // Coordinates — from CSV columns if present
  let lat: number | null = null;
  let lng: number | null = null;

  if (row.latitude && row.longitude) {
    lat = parseFloat(row.latitude);
    lng = parseFloat(row.longitude);
  } else if (row.address || row.neighborhood || row.city) {
    const geocodeResult = await geocodeAddress(
      row.address || row.neighborhood || row.city!,
      row.city || 'Los Angeles, CA',
    );
    if (geocodeResult) {
      lat = geocodeResult.lat;
      lng = geocodeResult.lng;
    }
  }

  // H3 spatial index
  let h3Index: bigint | null = null;
  let h3Neighbors: bigint[] = [];

  if (lat && lng) {
    const h3Cell  = latLngToCell(lat, lng, 9);
    h3Index       = BigInt(`0x${h3Cell}`);
    h3Neighbors   = gridDisk(h3Cell, 1).map((cell) => BigInt(`0x${cell}`));
  }

  // raw_json — store all intake fields for downstream enrichment
  const rawJson = {
    name,
    neighborhood:       row.neighborhood,
    category:           row.category,
    address_street:     row.address,
    city:               row.city,
    source_publication: row.source,
    source_url:         row.source_url,
    notes:              row.notes,
    phone:              row.phone,
    website:            row.website,
    instagram_handle:   row.instagram,
    google_place_id:    row.google_place_id,
    lat,
    lng,
  };

  // Stable external_id — prefer Google Place ID for exact dedup, else slug+location
  const locationSlug = row.neighborhood || row.city || 'unknown';
  const externalId   = row.google_place_id
    ? `${sourceName}:${row.google_place_id}`
    : `${sourceName}:${slugify(name, { lower: true })}:${slugify(locationSlug, { lower: true })}`;

  await prisma.raw_records.upsert({
    where: {
      source_name_external_id: {
        source_name: sourceName,
        external_id: externalId,
      },
    },
    create: {
      source_name:      sourceName,
      external_id:      externalId,
      source_url:       row.source_url,
      h3_index_r9:      h3Index,
      h3_neighbors_r9:  h3Neighbors,
      raw_json:         rawJson as Prisma.JsonValue,
      name_normalized:  normalizeName(name),
      lat:              lat ? new Prisma.Decimal(lat) : null,
      lng:              lng ? new Prisma.Decimal(lng) : null,
      observed_at:      new Date(),
      is_processed:     false,
    },
    update: {
      source_url:       row.source_url,
      h3_index_r9:      h3Index,
      h3_neighbors_r9:  h3Neighbors,
      raw_json:         rawJson as Prisma.JsonValue,
      name_normalized:  normalizeName(name),
      lat:              lat ? new Prisma.Decimal(lat) : null,
      lng:              lng ? new Prisma.Decimal(lng) : null,
      observed_at:      new Date(),
    },
  });

  const location = row.neighborhood || row.city || 'no location';
  console.log(`  + ${name} (${location})`);
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
