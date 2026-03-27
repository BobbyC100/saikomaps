#!/usr/bin/env node
/**
 * bridge-instagram-photos.ts
 *
 * Layer 1 bridge from instagram_media -> place_photos.
 * Option A: ingest immediately; unknown dimensions remain ineligible (MISSING_DIM).
 *
 * Usage:
 *   npx tsx scripts/bridge-instagram-photos.ts
 *   npx tsx scripts/bridge-instagram-photos.ts --batch 200
 *   npx tsx scripts/bridge-instagram-photos.ts --entity-id <id>
 *   npx tsx scripts/bridge-instagram-photos.ts --dry-run
 */

import { config } from 'dotenv';
config({ path: '.env' });
if (!process.env.SAIKO_DB_FROM_WRAPPER) {
  config({ path: '.env.local', override: true });
}

import { PhotoSource, PrismaClient } from '@prisma/client';
import { evaluateEligibility, getSourceRank } from '@/lib/photo-eligibility';

const prisma = new PrismaClient();
const SOURCE: PhotoSource = PhotoSource.INSTAGRAM;

function getArgValue(name: string): string | undefined {
  const withEquals = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (withEquals) return withEquals.split('=').slice(1).join('=');
  const idx = process.argv.indexOf(name);
  if (idx >= 0) return process.argv[idx + 1];
  return undefined;
}

const isDryRun = process.argv.includes('--dry-run');
const entityId = getArgValue('--entity-id');
const batch = Number.parseInt(getArgValue('--batch') ?? '200', 10);

async function main() {
  const mediaRows = await prisma.instagram_media.findMany({
    where: {
      mediaType: 'IMAGE',
      account: entityId ? { entityId } : undefined,
    },
    select: {
      instagramMediaId: true,
      permalink: true,
      account: {
        select: {
          entityId: true,
        },
      },
    },
    orderBy: { timestamp: 'desc' },
    take: Number.isFinite(batch) && batch > 0 ? batch : 200,
  });

  if (mediaRows.length === 0) {
    console.log('[IG Bridge] No instagram_media rows matched the filter.');
    return;
  }

  console.log(`[IG Bridge] Rows matched: ${mediaRows.length}`);
  if (isDryRun) console.log('[IG Bridge] DRY RUN enabled.');

  let inserted = 0;
  let updated = 0;

  const eligibility = evaluateEligibility({
    widthPx: null,
    heightPx: null,
    aspectRatio: null,
  });

  for (const row of mediaRows) {
    const entityIdValue = row.account.entityId;
    const existing = await prisma.place_photos.findUnique({
      where: {
        entityId_source_sourceRef: {
          entityId: entityIdValue,
          source: SOURCE,
          sourceRef: row.instagramMediaId,
        },
      },
      select: { id: true },
    });

    if (!isDryRun) {
      await prisma.place_photos.upsert({
        where: {
          entityId_source_sourceRef: {
            entityId: entityIdValue,
            source: SOURCE,
            sourceRef: row.instagramMediaId,
          },
        },
        create: {
          entityId: entityIdValue,
          source: SOURCE,
          sourceRef: row.instagramMediaId,
          sourceUrl: row.permalink,
          widthPx: null,
          heightPx: null,
          aspectRatio: null,
          eligible: eligibility.eligible,
          ineligibleReason: eligibility.reason,
          sourceRank: getSourceRank(SOURCE),
        },
        update: {
          sourceUrl: row.permalink,
          widthPx: null,
          heightPx: null,
          aspectRatio: null,
          eligible: eligibility.eligible,
          ineligibleReason: eligibility.reason,
          sourceRank: getSourceRank(SOURCE),
        },
      });
    }

    if (existing) {
      updated++;
    } else {
      inserted++;
    }
  }

  console.log('[IG Bridge] Complete');
  console.log(`  Inserted: ${inserted}`);
  console.log(`  Updated:  ${updated}`);
  console.log(`  Total:    ${inserted + updated}`);
}

main()
  .catch((error) => {
    console.error('[IG Bridge] Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
