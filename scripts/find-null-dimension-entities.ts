/**
 * Find entities with NULL dimension values — the gap from the original audit.
 *
 * Usage:
 *   node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/find-null-dimension-entities.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.$queryRaw<{
    id: string;
    slug: string;
    name: string;
    primary_vertical: string | null;
    entity_type: string | null;
    status: string | null;
    google_place_id: string | null;
    address: string | null;
    instagram: string | null;
    hours: unknown;
    parent_id: string | null;
    latitude: number | null;
    longitude: number | null;
    created_at: Date | null;
  }[]>`
    SELECT
      id,
      slug,
      name,
      primary_vertical::text,
      entity_type::text,
      status::text,
      google_place_id,
      address,
      instagram,
      hours,
      parent_id,
      latitude,
      longitude,
      created_at
    FROM entities
    WHERE location_type IS NULL
    ORDER BY created_at DESC
  `;

  console.log(`\n=== Entities with NULL dimensions: ${rows.length} ===\n`);

  // CSV header
  console.log('entity_id,slug,name,primary_vertical,entity_type,status,has_gpid,has_address,has_instagram,has_hours,has_latlng,parent_id,created_at');

  for (const r of rows) {
    const hasGpid = r.google_place_id ? 'Y' : 'N';
    const hasAddr = r.address ? 'Y' : 'N';
    const hasIg = r.instagram ? 'Y' : 'N';
    const hasHours = (r.hours != null && JSON.stringify(r.hours) !== '{}' && JSON.stringify(r.hours) !== 'null') ? 'Y' : 'N';
    const hasLatLng = (r.latitude != null && r.longitude != null) ? 'Y' : 'N';
    const created = r.created_at ? r.created_at.toISOString().split('T')[0] : 'unknown';

    // Escape name for CSV
    const safeName = r.name.includes(',') ? `"${r.name}"` : r.name;

    console.log(`${r.id},${r.slug},${safeName},${r.primary_vertical ?? 'NULL'},${r.entity_type ?? 'NULL'},${r.status ?? 'NULL'},${hasGpid},${hasAddr},${hasIg},${hasHours},${hasLatLng},${r.parent_id ?? 'NULL'},${created}`);
  }

  // Summary
  console.log(`\n=== Summary ===`);
  const byVertical: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  let withGpid = 0, withAddr = 0, withIg = 0, withLatLng = 0;

  for (const r of rows) {
    const v = r.primary_vertical ?? 'NULL';
    const s = r.status ?? 'NULL';
    byVertical[v] = (byVertical[v] ?? 0) + 1;
    byStatus[s] = (byStatus[s] ?? 0) + 1;
    if (r.google_place_id) withGpid++;
    if (r.address) withAddr++;
    if (r.instagram) withIg++;
    if (r.latitude != null && r.longitude != null) withLatLng++;
  }

  console.log(`By vertical:`);
  for (const [v, c] of Object.entries(byVertical).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${v}: ${c}`);
  }
  console.log(`By status:`);
  for (const [s, c] of Object.entries(byStatus).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${s}: ${c}`);
  }
  console.log(`Signals: GPID=${withGpid}, Address=${withAddr}, Instagram=${withIg}, LatLng=${withLatLng}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Query failed:', e);
  prisma.$disconnect();
  process.exit(1);
});
