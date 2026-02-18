/**
 * Read-only check: golden_records for the four validation places.
 * Queries by name (case-insensitive contains). Does not modify any data.
 *
 * Usage: npx tsx scripts/check-validation-records.ts
 */

import { db } from '@/lib/db';

const SEARCH_TERMS = ['dunsmoor', 'buvons', 'dan tana', 'covell'] as const;

async function main() {
  console.log('Checking golden_records for validation places (read-only)\n');
  console.log('Search terms:', SEARCH_TERMS.join(', '));
  console.log('');

  for (const term of SEARCH_TERMS) {
    const records = await db.golden_records.findMany({
      where: {
        name: { contains: term, mode: 'insensitive' },
      },
      select: {
        canonical_id: true,
        name: true,
        slug: true,
        google_place_id: true,
      },
    });

    console.log('─'.repeat(60));
    console.log(`Term: "${term}"`);
    console.log('─'.repeat(60));
    console.log('Found record(s)?', records.length > 0 ? `Y (${records.length})` : 'N');
    if (records.length === 0) {
      console.log('');
      continue;
    }
    if (records.length > 1) {
      console.log('Duplicates? Y — multiple rows match');
    } else {
      console.log('Duplicates? N');
    }
    console.log('');
    for (const r of records) {
      console.log('  id (canonical_id):', r.canonical_id);
      console.log('  name:             ', r.name);
      console.log('  slug:             ', r.slug);
      console.log('  google_place_id:  ', r.google_place_id ?? 'null');
      console.log('');
    }
  }

  console.log('─'.repeat(60));
  console.log('Done (read-only). No data modified.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
