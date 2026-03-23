import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const entity = await db.entities.findUnique({
      where: { slug: 'buvons' },
      select: { id: true }
    });

    if (!entity) return NextResponse.json({ error: 'Entity not found' });

    const account = await db.instagram_accounts.findFirst({
      where: { entityId: entity.id },
      select: { instagramUserId: true }
    });

    if (!account) return NextResponse.json({ error: 'No Instagram account' });

    const allMedia = await db.instagram_media.findMany({
      where: { instagramUserId: account.instagramUserId },
      select: {
        id: true,
        mediaType: true,
        photoType: true,
        mediaUrl: true,
        timestamp: true
      },
      orderBy: { timestamp: 'desc' },
      take: 20
    });

    const imageMedia = allMedia.filter(m => m.mediaType === 'IMAGE');

    return NextResponse.json({
      total: allMedia.length,
      images: imageMedia.length,
      data: allMedia
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) });
  }
}
