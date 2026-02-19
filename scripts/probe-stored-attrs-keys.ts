/**
 * One-off probe: list distinct keys in golden_records.google_places_attributes.
 * Use: npx tsx scripts/probe-stored-attrs-keys.ts
 */

import 'dotenv/config';
import { db } from '@/lib/db';

async function main() {
  const rows = await db.$queryRaw<{ attrs: unknown }[]>`
    SELECT google_places_attributes AS attrs
    FROM golden_records
    WHERE google_places_attributes IS NOT NULL
    LIMIT 100
  `;

  const allKeys = new Set<string>();
  for (const r of rows) {
    if (r.attrs && typeof r.attrs === 'object') {
      for (const k of Object.keys(r.attrs as Record<string, unknown>)) {
        allKeys.add(k);
      }
    }
  }

  console.log('--- Stored keys in golden_records.google_places_attributes ---');
  console.log('Sample size:', rows.length, 'rows');
  console.log('Distinct keys:', [...allKeys].sort().join(', '));
  console.log('');

  if (rows.length > 0 && rows[0]?.attrs && typeof rows[0].attrs === 'object') {
    const first = rows[0].attrs as Record<string, unknown>;
    console.log('--- Sample _meta (if present) ---');
    if (first._meta) {
      console.log(JSON.stringify(first._meta, null, 2));
    } else {
      console.log('(no _meta)');
    }
  }

  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
