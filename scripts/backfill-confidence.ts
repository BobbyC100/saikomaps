#!/usr/bin/env node
/**
 * Backfill confidence for all existing places.
 * Recomputes confidence JSONB and overall_confidence from golden + linked raw records.
 *
 * Usage (Neon): ./scripts/db-neon.sh node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/backfill-confidence.ts
 *       or:     npm run backfill:confidence   (blocks if DATABASE_URL is local unless ALLOW_LOCAL_DB=1)
 *   --dry-run   --limit 100
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { computePlaceConfidence } from '@/lib/confidence';
import { assertDbTargetAllowed } from '@/lib/db-guard';

const prisma = new PrismaClient();

function parseArgs(): { dryRun: boolean; limit: number | null } {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx >= 0 && args[limitIdx + 1] ? parseInt(args[limitIdx + 1], 10) : null;
  return { dryRun, limit };
}

async function main() {
  assertDbTargetAllowed();
  const { dryRun, limit } = parseArgs();
  console.log(`Backfill confidence (dryRun=${dryRun}, limit=${limit ?? 'all'})\n`);

  const goldenRecords = await prisma.golden_records.findMany({
    where: { lifecycle_status: 'ACTIVE' },
    select: {
      slug: true,
      name: true,
      address_street: true,
      phone: true,
      website: true,
      hours_json: true,
      description: true,
      lat: true,
      lng: true,
      entity_links: {
        where: { is_active: true },
        select: {
          raw_record: {
            select: { raw_json: true, source_name: true },
          },
        },
      },
    },
    take: limit ?? undefined,
    orderBy: { updated_at: 'desc' },
  });

  const sourcesRows = await prisma.sources.findMany({ select: { id: true, trust_tier: true } });
  const trustTiersBySource: Record<string, number> = {};
  for (const s of sourcesRows) trustTiersBySource[s.id] = s.trust_tier;

  let updated = 0;
  let skipped = 0;

  for (const golden of goldenRecords) {
    const place = await prisma.entities.findUnique({
      where: { slug: golden.slug },
      select: { id: true },
    });
    if (!place) {
      skipped++;
      continue;
    }

    const rawRecords = (golden.entity_links ?? [])
      .map((el) => el.raw_record)
      .filter(Boolean) as { raw_json: unknown; source_name: string }[];

    const { confidence, overall_confidence } = computePlaceConfidence(
      {
        name: golden.name,
        address_street: golden.address_street,
        phone: golden.phone,
        website: golden.website,
        hours_json: golden.hours_json,
        description: golden.description,
        lat: golden.lat,
        lng: golden.lng,
      },
      rawRecords,
      trustTiersBySource
    );

    if (!dryRun) {
      await prisma.entities.update({
        where: { id: place.id },
        data: {
          confidence: (Object.keys(confidence).length ? confidence : {}) as Prisma.InputJsonValue,
          overall_confidence: overall_confidence >= 0 ? overall_confidence : 0.5,
          confidence_updated_at: new Date(),
        },
      });
      updated++;
    } else {
      updated++;
    }

    if (updated % 100 === 0 && updated > 0) {
      console.log(`  Progress: ${updated}/${goldenRecords.length}`);
    }
  }

  console.log(`\nDone. ${dryRun ? 'Would update' : 'Updated'} ${updated} places; skipped ${skipped} (no matching place).`);
}

main()
  .catch((e: unknown) => {
    console.error(e);
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('does not exist') || (e as { code?: string })?.code === 'P2021' || (e as { code?: string })?.code === 'P2022') {
      console.error('\nTip: Confirm DB target with npm run db:whoami. If schema is behind, run: npm run db:generate');
    }
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
