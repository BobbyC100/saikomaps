#!/usr/bin/env node
/**
 * Backfill Google Places "About" Attributes
 *
 * Fetches structured attribute data (Service options, Atmosphere, Parking, etc.)
 * from the Google Places API (New) v1 and stores as JSONB.
 *
 * Usage:
 *   npx tsx scripts/backfill-google-places-attributes.ts [options]
 *
 * Options:
 *   --dry-run           Don't write to database
 *   --limit=N           Process only N records (default: 100)
 *   --verbose           Show detailed output per record
 *   --reprocess         Re-fetch even if attributes already exist
 *   --from-text         Parse attributes from stdin text (copy-paste from Google Maps)
 *   --canonical-id=X    Target a specific golden record (required with --from-text)
 *   --slug=X            Target a specific golden record by slug
 *
 * Examples:
 *   npx tsx scripts/backfill-google-places-attributes.ts --dry-run --limit=5 --verbose
 *   npx tsx scripts/backfill-google-places-attributes.ts --limit=50
 *   npx tsx scripts/backfill-google-places-attributes.ts --from-text --slug=bestia < attrs.txt
 *
 * Requires: GOOGLE_PLACES_API_KEY in .env
 */

import { config } from 'dotenv';
config({ path: '.env' });
config({ path: '.env.local', override: true });

import { PrismaClient } from '@prisma/client';
import {
  fetchGooglePlacesAttributes,
  parseGooglePlacesAttributesText,
  type GooglePlacesAttributes,
} from '../lib/google-places-attributes';

const prisma = new PrismaClient();

// CLI args
const isDryRun = process.argv.includes('--dry-run');
const isVerbose = process.argv.includes('--verbose');
const isReprocess = process.argv.includes('--reprocess');
const isFromText = process.argv.includes('--from-text');

const limitArg = process.argv.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 100;

const canonicalIdArg = process.argv.find(arg => arg.startsWith('--canonical-id='));
const canonicalId = canonicalIdArg?.split('=')[1];

const slugArg = process.argv.find(arg => arg.startsWith('--slug='));
const slug = slugArg?.split('=')[1];

const RATE_LIMIT_MS = 150;

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Text mode: parse stdin and write to a single record
// ---------------------------------------------------------------------------

async function handleTextMode() {
  if (!canonicalId && !slug) {
    console.error('--from-text requires --canonical-id=X or --slug=X');
    process.exit(1);
  }

  // Read stdin
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString('utf-8');

  if (!text.trim()) {
    console.error('No text provided on stdin');
    process.exit(1);
  }

  // Find the target record
  const where = canonicalId
    ? { canonical_id: canonicalId }
    : { slug: slug! };

  const record = await prisma.golden_records.findFirst({ where, select: { canonical_id: true, name: true, slug: true } });

  if (!record) {
    console.error(`Record not found: ${canonicalId || slug}`);
    process.exit(1);
  }

  // Parse text
  const attributes = parseGooglePlacesAttributesText(text);
  const categoryCount = Object.keys(attributes).length;
  const itemCount = Object.values(attributes).reduce((sum, arr) => sum + (arr?.length || 0), 0);

  console.log(`Parsed ${itemCount} attributes across ${categoryCount} categories for: ${record.name}`);

  if (isVerbose) {
    for (const [cat, items] of Object.entries(attributes)) {
      if (items && items.length > 0) {
        console.log(`  ${cat}: ${items.join(', ')}`);
      }
    }
  }

  if (!isDryRun) {
    await prisma.golden_records.update({
      where: { canonical_id: record.canonical_id },
      data: {
        google_places_attributes: attributes,
        google_places_attributes_fetched_at: new Date(),
      },
    });
    console.log(`Saved to: ${record.name} (${record.slug})`);
  } else {
    console.log('DRY RUN — no changes written');
    console.log(JSON.stringify(attributes, null, 2));
  }
}

// ---------------------------------------------------------------------------
// API mode: batch fetch from Google Places API (New) v1
// ---------------------------------------------------------------------------

async function handleApiMode() {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
    || process.env.GOOGLE_MAPS_API_KEY
    || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.error('GOOGLE_PLACES_API_KEY not found in environment');
    console.error('Get an API key: https://console.cloud.google.com/apis/credentials');
    console.error('Enable "Places API (New)": https://console.cloud.google.com/apis/library/places-backend.googleapis.com');
    process.exit(1);
  }

  console.log('Google Places Attributes Backfill\n');

  if (isDryRun) {
    console.log('DRY RUN MODE — no changes will be made\n');
  }

  // Build query filter
  const whereClause: any = {
    google_place_id: { not: null },
    lifecycle_status: 'ACTIVE',
  };

  // If targeting a specific record
  if (canonicalId) {
    whereClause.canonical_id = canonicalId;
  } else if (slug) {
    whereClause.slug = slug;
  } else {
    // Default: skip already-fetched
    if (!isReprocess) {
      whereClause.google_places_attributes_fetched_at = null;
    }
  }

  const records = await prisma.golden_records.findMany({
    where: whereClause,
    take: limit,
    select: {
      canonical_id: true,
      name: true,
      slug: true,
      google_place_id: true,
      neighborhood: true,
    },
    orderBy: { name: 'asc' },
  });

  console.log(`Found ${records.length} records to process (limit: ${limit})\n`);

  if (records.length === 0) {
    console.log('All records with Google Place IDs already have attributes fetched.');
    return;
  }

  let enriched = 0;
  let empty = 0;
  let errors = 0;

  for (const record of records) {
    try {
      if (isVerbose) {
        console.log(`Fetching: ${record.name} (${record.neighborhood || '?'})`);
      }

      const attributes = await fetchGooglePlacesAttributes(record.google_place_id!, apiKey);

      if (attributes && Object.keys(attributes).length > 0) {
        const itemCount = Object.values(attributes).reduce((sum, arr) => sum + (arr?.length || 0), 0);

        if (!isDryRun) {
          await prisma.golden_records.update({
            where: { canonical_id: record.canonical_id },
            data: {
              google_places_attributes: attributes,
              google_places_attributes_fetched_at: new Date(),
            },
          });
        }

        enriched++;

        if (isVerbose) {
          const cats = Object.keys(attributes).join(', ');
          console.log(`  ${itemCount} attributes [${cats}]`);
        } else {
          process.stdout.write('.');
        }
      } else {
        // No attributes returned — still mark as fetched to avoid re-processing
        if (!isDryRun) {
          await prisma.golden_records.update({
            where: { canonical_id: record.canonical_id },
            data: {
              google_places_attributes_fetched_at: new Date(),
            },
          });
        }

        empty++;
        if (isVerbose) {
          console.log('  (no attributes)');
        }
      }

      await sleep(RATE_LIMIT_MS);

    } catch (error: any) {
      console.error(`\nError for ${record.name}: ${error.message}`);

      // Still mark as attempted
      if (!isDryRun) {
        try {
          await prisma.golden_records.update({
            where: { canonical_id: record.canonical_id },
            data: { google_places_attributes_fetched_at: new Date() },
          });
        } catch (_) { /* ignore */ }
      }

      errors++;
    }
  }

  if (!isVerbose && enriched + empty > 0) {
    console.log(''); // newline after dots
  }

  console.log(`\nDone!`);
  console.log(`  Enriched: ${enriched}`);
  console.log(`  Empty:    ${empty}`);
  console.log(`  Errors:   ${errors}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (isFromText) {
    await handleTextMode();
  } else {
    await handleApiMode();
  }
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
