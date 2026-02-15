/**
 * Backfill Intent Profiles for Existing Places
 * 
 * This script assigns default intent profiles to all existing places
 * based on the logic defined in lib/intent-profile.ts
 * 
 * Run with: npx tsx scripts/backfill-intent-profiles.ts
 */

import { PrismaClient } from '@prisma/client';
import { assignIntentProfile } from '../lib/intent-profile';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Starting intent profile backfill...\n');

  // Fetch all places
  const places = await prisma.places.findMany({
    select: {
      id: true,
      name: true,
      category: true,
      reservationUrl: true,
      intentProfile: true,
      intentProfileOverride: true,
    },
  });

  console.log(`📊 Found ${places.length} places to process\n`);

  let updated = 0;
  let skipped = 0;
  let transactional = 0;
  let visitNow = 0;
  let goThere = 0;

  for (const place of places) {
    // Skip if curator has manually set an override
    if (place.intentProfileOverride) {
      console.log(`⏭️  Skipped: ${place.name} (curator override)`);
      skipped++;
      continue;
    }

    // Assign intent profile
    const profile = assignIntentProfile({
      category: place.category,
      reservationUrl: place.reservationUrl,
    });

    // Update if different from current value
    if (place.intentProfile !== profile) {
      await prisma.places.update({
        where: { id: place.id },
        data: {
          intentProfile: profile,
          intentProfileOverride: false,
        },
      });

      console.log(`✅ Updated: ${place.name} → ${profile}`);
      updated++;
    } else {
      console.log(`✓  Already set: ${place.name} (${profile})`);
      skipped++;
    }

    // Track profile distribution
    if (profile === 'transactional') transactional++;
    else if (profile === 'visit-now') visitNow++;
    else if (profile === 'go-there') goThere++;
  }

  console.log('\n📈 Summary:');
  console.log(`   Total places: ${places.length}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped: ${skipped}`);
  console.log('\n📊 Profile Distribution:');
  console.log(`   Transactional: ${transactional}`);
  console.log(`   Visit-Now: ${visitNow}`);
  console.log(`   Go-There: ${goThere}`);
  console.log('\n✨ Backfill complete!\n');
}

main()
  .catch((error) => {
    console.error('❌ Error during backfill:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
