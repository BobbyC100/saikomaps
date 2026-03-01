/**
 * Generate valid request body for /api/ai/generate-map-details
 * Automatically picks 3 recent places from the database
 */

require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

(async () => {
  const prisma = new PrismaClient();

  try {
    // Pick 3 most recent places
    const places = await prisma.entities.findMany({
      take: 3,
      orderBy: { createdAt: 'desc' },
      select: {
        name: true,
        address: true,
        latitude: true,
        longitude: true,
        googleTypes: true,
        category: true,
      },
    });

    if (places.length === 0) {
      console.error('ERROR: No places found in database. Create at least one place first.');
      process.exit(1);
    }

    if (places.length < 3) {
      console.warn(`WARNING: Only ${places.length} places found. Need at least 3 for best results.`);
    }

    // Transform to match API expected format (types instead of googleTypes)
    const payload = { 
      places: places.map(p => ({
        name: p.name,
        address: p.address,
        latitude: p.latitude,
        longitude: p.longitude,
        types: p.googleTypes || [],
        category: p.category,
      }))
    };
    console.log('\n✅ Request payload ready:\n');
    console.log(JSON.stringify(payload));
    console.log('\n📋 Copy the JSON above and use it in Step 2 (browser console)\n');
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
