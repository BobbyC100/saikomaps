import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzePlaceDataCoverage() {
  console.log('🔍 Analyzing Place Data Coverage...\n');

  // Main query: Count places by photo status and Google Place ID status
  const results = await prisma.$queryRaw<Array<{
    photo_status: string;
    place_id_status: string;
    count: bigint;
    percentage: number;
  }>>`
    SELECT 
      CASE 
        WHEN google_photos IS NULL OR google_photos::text = '[]' OR google_photos::text = 'null' THEN 'no_photos'
        ELSE 'has_photos'
      END as photo_status,
      CASE 
        WHEN google_place_id IS NULL OR google_place_id = '' THEN 'no_place_id'
        ELSE 'has_place_id'
      END as place_id_status,
      COUNT(*) as count,
      ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
    FROM places
    GROUP BY 1, 2
    ORDER BY 1, 2
  `;

  console.log('📊 Places by Photo and Place ID Status:');
  console.log('─'.repeat(70));
  console.log(
    'Photo Status'.padEnd(15),
    'Place ID Status'.padEnd(20),
    'Count'.padEnd(10),
    'Percentage'
  );
  console.log('─'.repeat(70));

  results.forEach(row => {
    console.log(
      row.photo_status.padEnd(15),
      row.place_id_status.padEnd(20),
      String(row.count).padEnd(10),
      `${row.percentage}%`
    );
  });

  console.log('─'.repeat(70));

  // Additional stats
  const stats = await prisma.$queryRaw<Array<{
    total_places: bigint;
    places_with_place_id: bigint;
    places_with_photos: bigint;
    fully_enriched_places: bigint;
  }>>`
    SELECT 
      COUNT(*) as total_places,
      COUNT(google_place_id) as places_with_place_id,
      COUNT(*) FILTER (WHERE google_photos IS NOT NULL AND google_photos::text != '[]' AND google_photos::text != 'null') as places_with_photos,
      COUNT(*) FILTER (WHERE google_place_id IS NOT NULL AND google_photos IS NOT NULL AND google_photos::text != '[]') as fully_enriched_places
    FROM places
  `;

  const stat = stats[0];
  console.log('\n📈 Overall Statistics:');
  console.log('─'.repeat(70));
  console.log(`Total Places:              ${stat.total_places}`);
  console.log(`Places with Place ID:      ${stat.places_with_place_id} (${Math.round(Number(stat.places_with_place_id) * 100 / Number(stat.total_places))}%)`);
  console.log(`Places with Photos:        ${stat.places_with_photos} (${Math.round(Number(stat.places_with_photos) * 100 / Number(stat.total_places))}%)`);
  console.log(`Fully Enriched Places:     ${stat.fully_enriched_places} (${Math.round(Number(stat.fully_enriched_places) * 100 / Number(stat.total_places))}%)`);
  console.log('─'.repeat(70));
}

analyzePlaceDataCoverage()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
