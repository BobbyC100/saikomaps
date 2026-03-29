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
import { imageSize } from 'image-size';
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

type Dimensions = { widthPx: number | null; heightPx: number | null; aspectRatio: number | null };
type ResolvedImage = Dimensions & { resolvedImageUrl: string | null };

async function probeDimensionsFromImageUrl(url: string): Promise<Dimensions> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Saiko Photos Bot)',
      },
    });
    if (!response.ok) {
      return { widthPx: null, heightPx: null, aspectRatio: null };
    }

    const buf = Buffer.from(await response.arrayBuffer());
    const size = imageSize(buf);
    const widthPx = size.width ?? null;
    const heightPx = size.height ?? null;
    const aspectRatio =
      widthPx != null && heightPx != null && heightPx > 0
        ? widthPx / heightPx
        : null;

    return { widthPx, heightPx, aspectRatio };
  } catch {
    return { widthPx: null, heightPx: null, aspectRatio: null };
  } finally {
    clearTimeout(timeout);
  }
}

async function resolveFreshInstagramImageUrl(permalink: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(permalink, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Saiko Photos Bot)',
      },
    });
    if (!response.ok) return null;
    const html = await response.text();
    const ogMatch = html.match(/property=\"og:image\" content=\"([^\"]+)/i);
    if (!ogMatch?.[1]) return null;
    return ogMatch[1].replace(/&amp;/g, '&');
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchImageDimensions(
  directUrl: string | null | undefined,
  permalink: string,
  dimCache: Map<string, Dimensions>,
  permalinkImageCache: Map<string, string | null>,
): Promise<ResolvedImage> {
  if (directUrl) {
    const cached = dimCache.get(directUrl);
    if (cached) return { ...cached, resolvedImageUrl: directUrl };
    const directDims = await probeDimensionsFromImageUrl(directUrl);
    dimCache.set(directUrl, directDims);
    if (directDims.widthPx != null && directDims.heightPx != null) {
      return { ...directDims, resolvedImageUrl: directUrl };
    }
  }

  const permalinkCached = permalinkImageCache.get(permalink);
  let freshImageUrl = permalinkCached;
  if (freshImageUrl === undefined) {
    freshImageUrl = await resolveFreshInstagramImageUrl(permalink);
    permalinkImageCache.set(permalink, freshImageUrl);
  }
  if (!freshImageUrl) {
    return { widthPx: null, heightPx: null, aspectRatio: null, resolvedImageUrl: null };
  }

  const cachedFresh = dimCache.get(freshImageUrl);
  if (cachedFresh) return { ...cachedFresh, resolvedImageUrl: freshImageUrl };
  const dims = await probeDimensionsFromImageUrl(freshImageUrl);
  dimCache.set(freshImageUrl, dims);
  return { ...dims, resolvedImageUrl: freshImageUrl };
}

async function main() {
  const mediaRows = await prisma.instagram_media.findMany({
    where: {
      mediaType: 'IMAGE',
      account: entityId ? { entityId } : undefined,
    },
    select: {
      instagramMediaId: true,
      mediaUrl: true,
      thumbnailUrl: true,
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
  let dimensionResolved = 0;
  let dimensionMissing = 0;
  const dimCache = new Map<string, Dimensions>();
  const permalinkImageCache = new Map<string, string | null>();

  for (const row of mediaRows) {
    const entityIdValue = row.account.entityId;
    const imageUrl = row.mediaUrl ?? row.thumbnailUrl ?? null;
    const dims = await fetchImageDimensions(imageUrl, row.permalink, dimCache, permalinkImageCache);

    if (dims.widthPx != null && dims.heightPx != null) dimensionResolved++;
    else dimensionMissing++;

    const eligibility = evaluateEligibility({
      widthPx: dims.widthPx,
      heightPx: dims.heightPx,
      aspectRatio: dims.aspectRatio,
    });

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
          // Store a durable image URL when available; permalink stays as fallback.
          sourceUrl: dims.resolvedImageUrl ?? row.permalink,
          widthPx: dims.widthPx,
          heightPx: dims.heightPx,
          aspectRatio: dims.aspectRatio,
          eligible: eligibility.eligible,
          ineligibleReason: eligibility.reason,
          sourceRank: getSourceRank(SOURCE),
        },
        update: {
          sourceUrl: dims.resolvedImageUrl ?? row.permalink,
          widthPx: dims.widthPx,
          heightPx: dims.heightPx,
          aspectRatio: dims.aspectRatio,
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
  console.log(`  Dimensions resolved: ${dimensionResolved}`);
  console.log(`  Dimensions missing:  ${dimensionMissing}`);
}

main()
  .catch((error) => {
    console.error('[IG Bridge] Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
