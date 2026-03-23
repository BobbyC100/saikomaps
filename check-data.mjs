import { config } from 'dotenv';
config({ path: '.env' });
config({ path: '.env.local', override: true });

import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

try {
  const entity = await db.entities.findUnique({
    where: { slug: 'buvons' },
    select: { id: true, slug: true, name: true, primaryVertical: true }
  });
  
  console.log('Entity:', entity);
  
  if (entity) {
    const account = await db.instagram_accounts.findFirst({
      where: { entityId: entity.id },
      select: { id: true, instagramUserId: true, username: true }
    });
    
    console.log('Instagram Account:', account);
    
    if (account) {
      const media = await db.instagram_media.findMany({
        where: { instagramUserId: account.instagramUserId },
        select: { id: true, mediaUrl: true, mediaType: true, photoType: true, timestamp: true },
        take: 5,
        orderBy: { timestamp: 'desc' }
      });
      
      console.log(`\nTotal media found: ${media.length}`);
      console.log('Sample media:');
      media.forEach(m => {
        console.log(`  - Type: ${m.mediaType}, PhotoType: ${m.photoType}, URL: ${m.mediaUrl?.substring(0, 40)}...`);
      });
    }
  }
} catch(err) {
  console.error('Error:', err.message);
} finally {
  await db.$disconnect();
}
