#!/usr/bin/env node
/**
 * Verify DB state for restaurant group linkage (snake_case columns).
 * Output: places, restaurant_groups, places_with_group
 */
import { db } from '@/lib/db';

async function main() {
  const [row] = await db.$queryRaw<
    [{ places: bigint; restaurant_groups: bigint; places_with_group: bigint }]
  >`
    SELECT
      (SELECT count(*) FROM places)::bigint AS places,
      (SELECT count(*) FROM restaurant_groups)::bigint AS restaurant_groups,
      (SELECT count(*) FROM places WHERE restaurant_group_id IS NOT NULL)::bigint AS places_with_group
  `;
  console.log('places:', Number(row.places));
  console.log('restaurant_groups:', Number(row.restaurant_groups));
  console.log('places_with_group:', Number(row.places_with_group));
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
