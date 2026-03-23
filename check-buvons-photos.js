import { config } from 'dotenv';
config({ path: '.env' });
if (!process.env.SAIKO_DB_FROM_WRAPPER) {
  config({ path: '.env.local', override: true });
}

import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function check() {
  try {
    const entity = await db.entities.findUnique({
      where: { slug: 'buvons' },
      select: { id: true },
    });
    
    if (!entity) {
      console.log('Entity not found');
      process.exit(1);
    }

    const account = await db.instagram_accounts.findFirst({
      where: { entityId: entity.id },
      select: { instagramUserId: true },
    });

    if (!account) {
      console.log('No Instagram account found');
      process.exit(1);
    }

    const media = await db.instagram_media.findMany({
      where: {
        instagramUserId: account.instagramUserId,
      },
      select: {
        id: true,
        mediaUrl: true,
        photoType: true,
        timestamp: true,
      },
      orderBy: { timestamp: 'desc' },
    });

    console.log(`Total media items: ${media.length}`);
    console.log('\nAll media:');
    media.forEach((m, i) => {
      console.log(`${i + 1}. ${m.photoType || 'UNCLASSIFIED'} - ${m.mediaUrl?.substring(0, 50)}...`);
    });

    const classified = media.filter(m => m.photoType);
    console.log(`\nClassified: ${classified.length}`);
    console.log(`Unclassified: ${media.length - classified.length}`);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await db.$disconnect();
  }
}

check();
