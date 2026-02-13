#!/usr/bin/env node
/**
 * Google Places API Enrichment for Saiko Maps places table
 *
 * Fills missing data: googlePhotos, hours, phone, website.
 * Default: processes active LA County places (scope: active, region: la_county)
 * Uses GOOGLE_PLACES_API_KEY or GOOGLE_MAPS_API_KEY from .env
 *
 * Usage: npm run enrich:test | enrich:photos | enrich:hours | enrich:contact | enrich:all [--dry-run]
 * Options: --scope active --region la_county --curated (filter by provenance)
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const CURATED_ONLY = process.argv.includes('--curated');
const SCOPE = process.argv.includes('--scope')
  ? process.argv[process.argv.indexOf('--scope') + 1]
  : 'active'; // Default to active
const REGION = process.argv.includes('--region')
  ? process.argv[process.argv.indexOf('--region') + 1]
  : 'la_county'; // Default to LA County

const prisma = new PrismaClient();

const apiKey =
  process.env.GOOGLE_PLACES_API_KEY ||
  process.env.GOOGLE_MAPS_API_KEY ||
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

const CONFIG = {
  batchSize: 50,
  delayMs: 100,
  logFile: path.join(process.cwd(), 'logs', 'enrichment.log'),
  errorFile: path.join(process.cwd(), 'logs', 'enrichment-errors.log'),
};

const logDir = path.dirname(CONFIG.logFile);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

function log(message: string) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(message);
  fs.appendFileSync(CONFIG.logFile, logMessage);
}

function logError(message: string, error: unknown) {
  const timestamp = new Date().toISOString();
  const err = error instanceof Error ? error : new Error(String(error));
  const errorMessage = `[${timestamp}] ${message}\nError: ${err.message}\nStack: ${err.stack ?? 'N/A'}\n---\n`;
  console.error(message);
  fs.appendFileSync(CONFIG.errorFile, errorMessage);
}

function hasPhotos(googlePhotos: unknown): boolean {
  if (!googlePhotos) return false;
  if (typeof googlePhotos === 'string') {
    const t = googlePhotos.trim();
    return t !== '' && t !== '[]' && t !== 'null';
  }
  if (Array.isArray(googlePhotos)) return googlePhotos.length > 0;
  if (typeof googlePhotos === 'object' && googlePhotos !== null) {
    const arr = (googlePhotos as { length?: number }).length;
    return typeof arr === 'number' && arr > 0;
  }
  return false;
}

function hasHours(hours: unknown): boolean {
  if (!hours) return false;
  if (typeof hours === 'string') {
    const t = hours.trim();
    return t !== '' && t !== '{}' && t !== 'null';
  }
  if (typeof hours === 'object' && hours !== null) {
    return Object.keys(hours as object).length > 0;
  }
  return false;
}

interface GooglePlaceDetails {
  photos?: Array<{ photo_reference?: string; name?: string }>;
  opening_hours?: {
    weekday_text?: string[];
    open_now?: boolean;
    periods?: unknown[];
  };
  formatted_phone_number?: string;
  website?: string;
}

async function fetchPlaceDetails(googlePlaceId: string): Promise<GooglePlaceDetails | null> {
  const fields = [
    'photos',
    'opening_hours',
    'formatted_phone_number',
    'website',
    'name',
    'formatted_address',
  ].join(',');

  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${googlePlaceId}&fields=${fields}&key=${apiKey}`;

  const response = await fetch(url);
  const data = (await response.json()) as { status: string; error_message?: string; result?: GooglePlaceDetails };

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`API Error: ${data.status} - ${data.error_message ?? 'Unknown error'}`);
  }

  return data.result ?? null;
}

function extractGooglePhotos(placeData: GooglePlaceDetails): Array<{ photo_reference: string }> | null {
  if (!placeData?.photos || placeData.photos.length === 0) return null;
  const out: Array<{ photo_reference: string }> = [];
  for (const p of placeData.photos) {
    const ref = p.photo_reference ?? (p as { photoReference?: string }).photoReference;
    if (ref) {
      out.push({ photo_reference: ref });
      if (out.length >= 10) break;
    }
  }
  return out.length > 0 ? out : null;
}

function extractHours(placeData: GooglePlaceDetails): Record<string, unknown> | null {
  if (!placeData?.opening_hours) return null;
  const oh = placeData.opening_hours;
  return {
    weekday_text: oh.weekday_text ?? [],
    openNow: oh.open_now ?? null,
    periods: oh.periods ?? [],
  };
}

interface PlaceRow {
  id: string;
  name: string;
  googlePlaceId: string | null;
  googlePhotos: unknown;
  hours: unknown;
  phone: string | null;
  website: string | null;
}

async function enrichPlace(
  place: PlaceRow,
  mode: string,
  dryRun: boolean
): Promise<{ success: boolean; updates: Record<string, unknown>; reason: string }> {
  if (!place.googlePlaceId) {
    return { success: false, updates: {}, reason: 'no_google_place_id' };
  }

  try {
    const placeData = await fetchPlaceDetails(place.googlePlaceId);

    if (!placeData) {
      return { success: false, updates: {}, reason: 'no_data_from_api' };
    }

    const updates: Record<string, unknown> = {};

    if ((mode === 'all' || mode === 'photos') && !hasPhotos(place.googlePhotos)) {
      const photos = extractGooglePhotos(placeData);
      if (photos) {
        updates.googlePhotos = photos;
      }
    }

    if ((mode === 'all' || mode === 'hours') && !hasHours(place.hours)) {
      const hours = extractHours(placeData);
      if (hours) {
        updates.hours = hours;
      }
    }

    if ((mode === 'all' || mode === 'contact') && (!place.phone || String(place.phone).trim() === '')) {
      if (placeData.formatted_phone_number) {
        updates.phone = placeData.formatted_phone_number;
      }
    }

    if ((mode === 'all' || mode === 'contact') && (!place.website || String(place.website).trim() === '')) {
      if (placeData.website) {
        updates.website = placeData.website;
      }
    }

    if (Object.keys(updates).length > 0 && !dryRun) {
      await prisma.places.update({
        where: { id: place.id },
        data: updates,
      });
      return { success: true, updates, reason: 'updated' };
    }

    if (Object.keys(updates).length > 0) {
      return { success: true, updates, reason: 'dry_run' };
    }

    return { success: true, updates: {}, reason: 'no_new_data' };
  } catch (error) {
    logError(`Error enriching place: ${place.name} (ID: ${place.id})`, error);
    return { success: false, updates: {}, reason: 'api_error' };
  }
}

async function getPlacesNeedingEnrichment(mode: string): Promise<PlaceRow[]> {
  // Build where clause
  const where: any = {
    googlePlaceId: { not: null },
  };
  
  if (SCOPE) where.scope = SCOPE as any;
  if (REGION) where.region = REGION;

  let places = await prisma.places.findMany({
    where,
    select: {
      id: true,
      name: true,
      googlePlaceId: true,
      googlePhotos: true,
      hours: true,
      phone: true,
      website: true,
    },
  });

  // Optional: filter by provenance
  if (CURATED_ONLY) {
    const curatedIds = new Set(
      (await prisma.provenance.findMany({ select: { place_id: true } })).map((p) => p.place_id)
    );
    places = places.filter((p) => curatedIds.has(p.id));
  }

  return places.filter((p) => {
    if (mode === 'photos') return !hasPhotos(p.googlePhotos);
    if (mode === 'hours') return !hasHours(p.hours);
    if (mode === 'contact') {
      const noPhone = !p.phone || String(p.phone).trim() === '';
      const noWebsite = !p.website || String(p.website).trim() === '';
      return noPhone || noWebsite;
    }
    if (mode === 'all') {
      return (
        !hasPhotos(p.googlePhotos) ||
        !hasHours(p.hours) ||
        !p.phone ||
        String(p.phone).trim() === '' ||
        !p.website ||
        String(p.website).trim() === ''
      );
    }
    return false;
  }) as PlaceRow[];
}

async function run() {
  const args = process.argv.slice(2);
  const mode = args[0] ?? 'all';
  const dryRun = args.includes('--dry-run');
  const limit = args.includes('--test') ? 10 : null;

  if (!apiKey) {
    console.error('❌ GOOGLE_PLACES_API_KEY or GOOGLE_MAPS_API_KEY not found in environment');
    process.exit(1);
  }

  log('\n=== SAIKO MAPS - PLACE ENRICHMENT ===\n');
  log(`Mode: ${mode}`);
  log(`Dry Run: ${dryRun}`);
  log(`Test Mode: ${limit ? `Yes (${limit} places)` : 'No'}\n`);

  try {
    let places = await getPlacesNeedingEnrichment(mode);
    if (limit) {
      places = places.slice(0, limit);
    }

    log(`Found ${places.length} curated places needing enrichment\n`);

    if (places.length === 0) {
      log('✅ No places need enrichment!');
      return;
    }

    const batches: PlaceRow[][] = [];
    for (let i = 0; i < places.length; i += CONFIG.batchSize) {
      batches.push(places.slice(i, i + CONFIG.batchSize));
    }

    log(`Processing ${batches.length} batches...\n`);

    const allStats = {
      total: 0,
      updated: 0,
      failed: 0,
      noData: 0,
      skipped: 0,
      details: { photos: 0, hours: 0, phone: 0, website: 0 },
    };

    let processed = 0;
    for (let i = 0; i < batches.length; i++) {
      log(`\n--- Batch ${i + 1}/${batches.length} ---`);
      for (const place of batches[i]!) {
        processed++;
        const progress = `[${processed}/${places.length}]`;
        log(`${progress} Processing: ${place.name}`);

        if (dryRun) {
          const result = await enrichPlace(place, mode, true);
          if (Object.keys(result.updates).length > 0) {
            log(`${progress} DRY RUN - Would enrich: ${place.name} (${Object.keys(result.updates).join(', ')})`);
          }
          allStats.skipped++;
          await new Promise((r) => setTimeout(r, CONFIG.delayMs));
          continue;
        }

        const result = await enrichPlace(place, mode, false);

        if (result.success) {
          if (Object.keys(result.updates).length > 0) {
            allStats.updated++;
            if (result.updates.googlePhotos) allStats.details.photos++;
            if (result.updates.hours) allStats.details.hours++;
            if (result.updates.phone) allStats.details.phone++;
            if (result.updates.website) allStats.details.website++;
            const updatedFields = Object.keys(result.updates).join(', ');
            log(`${progress} ✅ ${place.name} - Updated: ${updatedFields}`);
          } else {
            allStats.noData++;
            log(`${progress} ⚠️  ${place.name} - No new data available`);
          }
        } else {
          allStats.failed++;
          log(`${progress} ❌ ${place.name} - Failed: ${result.reason}`);
        }

        await new Promise((r) => setTimeout(r, CONFIG.delayMs));
      }
    }
    allStats.total = processed;

    log('\n=== ENRICHMENT COMPLETE ===');
    log(`Total Processed: ${allStats.total}`);
    log(`✅ Updated: ${allStats.updated}`);
    log(`⚠️  No Data: ${allStats.noData}`);
    log(`❌ Failed: ${allStats.failed}`);
    if (dryRun) {
      log(`⏭️  Skipped (Dry Run): ${allStats.skipped}`);
    }
    log('\nFields Updated:');
    log(`  Photos: ${allStats.details.photos}`);
    log(`  Hours: ${allStats.details.hours}`);
    log(`  Phone: ${allStats.details.phone}`);
    log(`  Website: ${allStats.details.website}`);
    log('\n');
  } catch (error) {
    logError('Fatal error during enrichment', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();
