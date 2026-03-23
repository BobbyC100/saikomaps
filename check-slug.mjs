import { config } from 'dotenv';
config({ path: '.env' });
config({ path: '.env.local', override: true });

import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

try {
  // Find places with slug containing "buv"
  const places = await db.entities.findMany({
    where: {
      slug: { contains: 'buv', mode: 'insensitive' }
    },
    select: { id: true, slug: true, name: true, primaryVertical: true },
    take: 5
  });
  
  console.log('Places matching "buv":');
  places.forEach(p => console.log(`  ${p.slug} - ${p.name}`));
  
  if (places.length === 0) {
    console.log('\nNo matches. Let me check a few random places:');
    const all = await db.entities.findMany({
      select: { slug: true, name: true },
      take: 5
    });
    all.forEach(p => console.log(`  ${p.slug} - ${p.name}`));
  }
} catch (err) {
  console.error('Error:', err.message);
} finally {
  await db.$disconnect();
}
