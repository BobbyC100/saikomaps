/**
 * MWU — Populate entities.google_places_attributes + entities.address for GPID entities
 *
 * For entities where address IS NULL AND google_place_id IS NOT NULL, fetch
 * Google Place Details and write:
 *   - entities.google_places_attributes (JSONB with formatted_address)
 *   - entities.address (short street line, e.g. "1451 Carroll Ave")
 *
 * Scope: entities table only. No schema changes.
 *
 * Usage:
 *   npx tsx scripts/backfill-entities-address-from-google.ts --dry-run
 *   npx tsx scripts/backfill-entities-address-from-google.ts --limit 20
 *   npx tsx scripts/backfill-entities-address-from-google.ts
 *
 * Requires: GOOGLE_PLACES_API_KEY, GOOGLE_PLACES_ENABLED=true, DATABASE_URL
 */

import 'dotenv/config';
import { db } from '@/lib/db';
import { getPlaceDetails } from '@/lib/google-places';

const RATE_LIMIT_MS = 200;

function parseStreetShort(formattedAddress: string | null | undefined): string {
  const s = formattedAddress?.trim();
  if (!s) return '';
  const segments = s.split(',').map((x) => x.trim()).filter(Boolean);
  if (segments.length === 1) return segments[0];
  const first = segments[0];
  const hasDigit = /\d/.test(first);
  if (hasDigit) return first;
  return segments[1] ?? first;
}

interface EligibleRow {
  id: string;
  name: string;
  slug: string;
  googlePlaceId: string;
}

async function getEligibleEntities(limit?: number): Promise<EligibleRow[]> {
  const rows = await db.entities.findMany({
    where: {
      address: null,
      googlePlaceId: { not: null },
    },
    select: { id: true, name: true, slug: true, googlePlaceId: true },
    take: limit ?? undefined,
  });
  return rows.filter((r) => r.googlePlaceId != null) as EligibleRow[];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limitArg = args.indexOf('--limit');
  const limit = limitArg >= 0 ? parseInt(args[limitArg + 1] ?? '0', 10) : undefined;
  const effectiveLimit = limit && limit > 0 ? limit : undefined;

  console.log('═'.repeat(60));
  console.log('Backfill entities.address + google_places_attributes from Google');
  console.log('═'.repeat(60));
  if (dryRun) console.log('DRY RUN — no writes');
  if (effectiveLimit) console.log(`Limit: ${effectiveLimit}`);
  console.log('');

  const eligible = await getEligibleEntities(effectiveLimit);
  console.log(`Eligible (address IS NULL AND google_place_id IS NOT NULL): ${eligible.length}`);

  if (eligible.length === 0) {
    console.log('Nothing to do.');
    await db.$disconnect();
    return;
  }

  const sampleIds = eligible.slice(0, 5).map((r) => ({ id: r.id, name: r.name }));
  console.log('Sample IDs:', sampleIds);
  console.log('');

  if (dryRun) {
    console.log(`Dry-run complete. Would process ${eligible.length} entities.`);
    await db.$disconnect();
    return;
  }

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < eligible.length; i++) {
    const row = eligible[i];
    const label = `[${i + 1}/${eligible.length}] ${row.name} (${row.slug})`;
    try {
      const details = await getPlaceDetails(row.googlePlaceId);
      if (!details) {
        console.log(`  ${label} — NOT_FOUND`);
        failed++;
        await sleep(RATE_LIMIT_MS);
        continue;
      }
      const formattedAddress = details.formattedAddress?.trim();
      if (!formattedAddress) {
        console.log(`  ${label} — no formatted_address`);
        skipped++;
        await sleep(RATE_LIMIT_MS);
        continue;
      }
      const addressShort = parseStreetShort(formattedAddress);
      const attrs: Record<string, unknown> = {
        formatted_address: formattedAddress,
        _meta: { fetched_at: new Date().toISOString(), source: 'backfill-entities-address-from-google' },
      };
      await db.entities.update({
        where: { id: row.id },
        data: {
          googlePlacesAttributes: attrs as object,
          address: addressShort || formattedAddress,
        },
      });
      console.log(`  ✓ ${label} — ${addressShort || formattedAddress}`);
      updated++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ ${label} — ${msg}`);
      failed++;
    }
    await sleep(RATE_LIMIT_MS);
  }

  console.log('');
  console.log('─'.repeat(40));
  console.log('Summary:');
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Failed:  ${failed}`);
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
