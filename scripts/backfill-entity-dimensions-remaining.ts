/**
 * Backfill remaining entities with NULL dimension values.
 *
 * These 32 entities were not in the original audit CSV (they were
 * CLOSED or PERMANENTLY_CLOSED and excluded from the active-entity scan).
 *
 * All 32 have GPID + address + lat/lng → fixed / regular / gpid / independent.
 *
 * Usage:
 *   node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/backfill-entity-dimensions-remaining.ts
 *   node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/backfill-entity-dimensions-remaining.ts --apply
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const apply = process.argv.includes('--apply');

  console.log(`\n=== Entity Dimension Backfill — Remaining NULLs ===`);
  console.log(`Mode: ${apply ? '🔴 APPLY' : '🟡 DRY RUN'}\n`);

  // Find all entities with NULL dimensions
  const rows = await prisma.$queryRaw<{
    id: string;
    slug: string;
    name: string;
    status: string | null;
    primary_vertical: string | null;
    google_place_id: string | null;
    address: string | null;
    instagram: string | null;
    latitude: number | null;
    longitude: number | null;
  }[]>`
    SELECT
      id, slug, name, status::text, primary_vertical::text,
      google_place_id, address, instagram, latitude, longitude
    FROM entities
    WHERE location_type IS NULL
    ORDER BY name
  `;

  console.log(`Entities with NULL dimensions: ${rows.length}\n`);

  if (rows.length === 0) {
    console.log('Nothing to do — all entities have dimension values.');
    await prisma.$disconnect();
    return;
  }

  // Classify each entity
  for (const r of rows) {
    const hasGpid = !!r.google_place_id;
    const hasAddr = !!r.address;
    const hasLatLng = r.latitude != null && r.longitude != null;

    // All 32 are fixed-address commercial venues with GPIDs
    // Classification: fixed / regular / gpid / independent
    const locationType = 'fixed';
    const scheduleType = 'regular';
    const identityAnchor = hasGpid ? 'gpid' : (r.instagram ? 'social' : 'coordinates');
    const containmentType = 'independent';

    const signals = [
      hasGpid ? 'GPID' : null,
      hasAddr ? 'ADDR' : null,
      hasLatLng ? 'LATLNG' : null,
      r.instagram ? 'IG' : null,
    ].filter(Boolean).join('+');

    console.log(`  ${r.slug} [${r.status}] → ${locationType}/${scheduleType}/${identityAnchor}/${containmentType} (${signals})`);
  }

  console.log('');

  if (!apply) {
    console.log('Dry run complete. Pass --apply to write changes.');
    await prisma.$disconnect();
    return;
  }

  // Apply — batch update since they're all the same pattern (with anchor variation)
  // First: entities with GPID
  const gpidResult = await prisma.$executeRaw`
    UPDATE entities
    SET
      location_type = 'fixed'::"LocationType",
      schedule_type = 'regular'::"ScheduleType",
      identity_anchor_type = 'gpid'::"IdentityAnchorType",
      containment_type = 'independent'::"ContainmentType"
    WHERE location_type IS NULL
      AND google_place_id IS NOT NULL
  `;
  console.log(`Updated (gpid anchor): ${gpidResult}`);

  // Second: entities with Instagram but no GPID
  const socialResult = await prisma.$executeRaw`
    UPDATE entities
    SET
      location_type = 'fixed'::"LocationType",
      schedule_type = 'regular'::"ScheduleType",
      identity_anchor_type = 'social'::"IdentityAnchorType",
      containment_type = 'independent'::"ContainmentType"
    WHERE location_type IS NULL
      AND google_place_id IS NULL
      AND instagram IS NOT NULL
  `;
  console.log(`Updated (social anchor): ${socialResult}`);

  // Third: anything remaining (coordinates fallback)
  const coordResult = await prisma.$executeRaw`
    UPDATE entities
    SET
      location_type = 'fixed'::"LocationType",
      schedule_type = 'regular'::"ScheduleType",
      identity_anchor_type = 'coordinates'::"IdentityAnchorType",
      containment_type = 'independent'::"ContainmentType"
    WHERE location_type IS NULL
  `;
  console.log(`Updated (coordinates anchor): ${coordResult}`);

  // Verify
  const remaining = await prisma.$queryRaw<{ count: number }[]>`
    SELECT COUNT(*)::int AS count FROM entities WHERE location_type IS NULL
  `;
  const remainingCount = remaining[0]?.count ?? 0;

  if (remainingCount === 0) {
    console.log('\n✓ All entities now have dimension values. Zero NULLs remaining.');
  } else {
    console.log(`\n⚠️  ${remainingCount} entities still have NULL dimensions.`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Backfill failed:', e);
  prisma.$disconnect();
  process.exit(1);
});
