#!/usr/bin/env node
/**
 * ingest-google-photos.ts
 *
 * Layer 1 photo registry ingestion for Google Places photos.
 * Writes canonical rows into place_photos with eligibility metadata.
 *
 * Usage:
 *   npx tsx scripts/ingest-google-photos.ts
 *   npx tsx scripts/ingest-google-photos.ts --batch 50
 *   npx tsx scripts/ingest-google-photos.ts --entity-id <id>
 *   npx tsx scripts/ingest-google-photos.ts --dry-run
 */

import { config } from 'dotenv';
config({ path: '.env' });
if (!process.env.SAIKO_DB_FROM_WRAPPER) {
  config({ path: '.env.local', override: true });
}

import { PhotoSource, PrismaClient } from '@prisma/client';
import { getPlaceDetails } from '@/lib/google-places';
import { evaluateEligibility, getSourceRank } from '@/lib/photo-eligibility';

const prisma = new PrismaClient();
const SOURCE: PhotoSource = PhotoSource.GOOGLE;

function getArgValue(name: string): string | undefined {
  const withEquals = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (withEquals) return withEquals.split('=').slice(1).join('=');
  const idx = process.argv.indexOf(name);
  if (idx >= 0) return process.argv[idx + 1];
  return undefined;
}

const isDryRun = process.argv.includes('--dry-run');
const entityId = getArgValue('--entity-id');
const batch = Number.parseInt(getArgValue('--batch') ?? '25', 10);
const delayMs = Number.parseInt(getArgValue('--delay-ms') ?? '350', 10);

type EntityRow = {
  id: string;
  name: string;
  googlePlaceId: string | null;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadEntities(): Promise<EntityRow[]> {
  if (entityId) {
    return prisma.entities.findMany({
      where: { id: entityId, googlePlaceId: { not: null } },
      select: { id: true, name: true, googlePlaceId: true },
    });
  }

  return prisma.entities.findMany({
    where: {
      googlePlaceId: { not: null },
      OR: [
        { publicationStatus: 'PUBLISHED' },
        { publicationStatus: null, status: 'OPEN' },
      ],
    },
    select: { id: true, name: true, googlePlaceId: true },
    orderBy: { name: 'asc' },
    take: Number.isFinite(batch) && batch > 0 ? batch : 25,
  });
}

async function upsertGooglePhoto(entityIdValue: string, photo: { photoReference: string; width?: number; height?: number }) {
  const widthPx = photo.width ?? null;
  const heightPx = photo.height ?? null;
  const aspectRatio =
    widthPx != null && heightPx != null && heightPx > 0
      ? widthPx / heightPx
      : null;
  const eligibility = evaluateEligibility({ widthPx, heightPx, aspectRatio });

  if (isDryRun) {
    return;
  }

  await prisma.place_photos.upsert({
    where: {
      entityId_source_sourceRef: {
        entityId: entityIdValue,
        source: SOURCE,
        sourceRef: photo.photoReference,
      },
    },
    create: {
      entityId: entityIdValue,
      source: SOURCE,
      sourceRef: photo.photoReference,
      sourceUrl: null,
      widthPx,
      heightPx,
      aspectRatio,
      eligible: eligibility.eligible,
      ineligibleReason: eligibility.reason,
      sourceRank: getSourceRank(SOURCE),
    },
    update: {
      sourceUrl: null,
      widthPx,
      heightPx,
      aspectRatio,
      eligible: eligibility.eligible,
      ineligibleReason: eligibility.reason,
      sourceRank: getSourceRank(SOURCE),
    },
  });
}

async function main() {
  const entities = await loadEntities();
  if (entities.length === 0) {
    console.log('[Google Photo Ingest] No entities matched the filter.');
    return;
  }

  console.log(`[Google Photo Ingest] Entities: ${entities.length}`);
  if (isDryRun) console.log('[Google Photo Ingest] DRY RUN enabled.');

  let processedEntities = 0;
  let failedEntities = 0;
  let discoveredPhotos = 0;
  let upsertedPhotos = 0;

  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i]!;
    if (!entity.googlePlaceId) continue;

    try {
      const details = await getPlaceDetails(entity.googlePlaceId);
      const photos = details?.photos ?? [];
      discoveredPhotos += photos.length;

      for (const photo of photos) {
        await upsertGooglePhoto(entity.id, photo);
        upsertedPhotos++;
      }

      processedEntities++;
      console.log(
        `[Google Photo Ingest] [${i + 1}/${entities.length}] ${entity.name}: ${photos.length} photos`
      );
    } catch (error) {
      failedEntities++;
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        `[Google Photo Ingest] [${i + 1}/${entities.length}] Failed for ${entity.name}: ${message}`
      );
    }

    if (delayMs > 0 && i < entities.length - 1) {
      await sleep(delayMs);
    }
  }

  console.log('');
  console.log('[Google Photo Ingest] Complete');
  console.log(`  Processed entities: ${processedEntities}`);
  console.log(`  Failed entities:    ${failedEntities}`);
  console.log(`  Photos discovered:  ${discoveredPhotos}`);
  console.log(`  Photos upserted:    ${upsertedPhotos}`);
}

main()
  .catch((error) => {
    console.error('[Google Photo Ingest] Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
