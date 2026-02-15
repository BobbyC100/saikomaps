/**
 * Verify place_coverages migration
 * 
 * Run: npx tsx scripts/verify-place-coverages.ts
 */

import { db } from '@/lib/db';

const LA_CITY_ID = 'cmln5lxe70004kf1yl8wdd4gl';

async function main() {
  console.log('🔍 Verifying place_coverages migration...\n');

  // 1. Count total coverages
  const totalCoverages = await db.place_coverages.count();
  const totalSources = await db.sources.count();
  
  console.log(`📊 Database Counts:`);
  console.log(`   place_coverages: ${totalCoverages}`);
  console.log(`   sources: ${totalSources}\n`);

  // 2. Sample random place with coverages
  const placeWithCoverages = await db.places.findFirst({
    where: {
      cityId: LA_CITY_ID,
      coverages: {
        some: {
          status: 'APPROVED',
        },
      },
    },
    include: {
      coverages: {
        where: {
          status: 'APPROVED',
        },
        include: {
          source: true,
        },
      },
    },
  });

  if (placeWithCoverages) {
    console.log(`✅ Sample Place with Coverages:`);
    console.log(`   Name: ${placeWithCoverages.name}`);
    console.log(`   Coverages: ${placeWithCoverages.coverages.length}`);
    console.log(`   Sources:`);
    placeWithCoverages.coverages.forEach((c) => {
      console.log(`     - ${c.source.name} (${c.url})`);
    });
    console.log();
  } else {
    console.log(`⚠️  No places with coverages found\n`);
  }

  // 3. Check places with editorialSources but no coverages (should be 0 after backfill)
  const placesWithJsonOnly = await db.places.count({
    where: {
      cityId: LA_CITY_ID,
      editorialSources: {
        not: null,
      },
      coverages: {
        none: {},
      },
    },
  });

  if (placesWithJsonOnly > 0) {
    console.log(`⚠️  ${placesWithJsonOnly} places still have editorialSources JSON but no coverages`);
    console.log(`   Run backfill script again or investigate\n`);
  } else {
    console.log(`✅ All places with editorialSources have been migrated to coverages\n`);
  }

  // 5. Top sources by coverage count
  const topSources = await db.sources.findMany({
    include: {
      _count: {
        select: { coverages: true },
      },
    },
    orderBy: {
      coverages: {
        _count: 'desc',
      },
    },
    take: 10,
  });

  console.log(`\n📈 Top 10 Sources by Coverage Count:`);
  topSources.forEach((s, i) => {
    console.log(`   ${i + 1}. ${s.name}: ${s._count.coverages} coverages`);
  });

  console.log('\n✅ Verification complete!');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
