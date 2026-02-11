/**
 * API Route: Maps
 * GET /api/maps - List current user's maps
 * POST /api/maps - Create a new map
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';
import { randomUUID } from 'crypto';

const createMapSchema = z.object({
  title: z.string().optional().default(''),
  template: z.string().optional().default('field-notes'),
});

function getUserId(session: { user?: { id?: string } } | null): string | null {
  if (session?.user?.id) return session.user.id;
  if (process.env.NODE_ENV === 'development') return 'demo-user-id';
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const lists = await db.lists.findMany({
      where: { userId },
      include: {
        _count: { select: { map_places: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const data = lists.map((list) => ({
      id: list.id,
      title: list.title,
      slug: list.slug,
      published: list.published,
      locationCount: list._count.map_places,
      viewCount: list.viewCount,
      createdAt: list.createdAt,
      updatedAt: list.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error listing maps:', error);
    return NextResponse.json(
      {
        error: 'Failed to list maps',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    let userId = getUserId(session);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // In development, ensure demo user exists before creating list (foreign key)
    if (process.env.NODE_ENV === 'development' && userId === 'demo-user-id') {
      await db.users.upsert({
        where: { id: 'demo-user-id' },
        update: {},
        create: {
          id: 'demo-user-id',
          email: 'demo@saikomaps.com',
          name: 'Demo User',
          passwordHash: 'demo-hash-not-for-production',
          updatedAt: new Date(),
        },
      });
    }

    const body = await request.json();
    console.log('[API MAPS POST] req.body:', body);
    const validation = createMapSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { title = '', template = 'field-notes' } = validation.data;

    // Generate a unique slug (from title or draft prefix)
    const base = title.trim()
      ? title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      : 'draft';
    const slug = (base ? base + '-' : '') + Math.random().toString(36).substring(2, 10);

    const now = new Date();
    const createData = {
      id: randomUUID(),
      userId,
      title: title.trim(),
      slug,
      templateType: template,
      published: false,

    };
    console.log('[API MAPS POST] Prisma create data:', createData);

    // Create the map/list
    const list = await db.lists.create({
      data: createData,
    });

    console.log('[API MAPS POST] Created record:', { id: list.id, title: list.title });

    return NextResponse.json({
      success: true,
      data: list,
    });
  } catch (error) {
    console.error('Error creating map:', error);
    return NextResponse.json(
      {
        error: 'Failed to create map',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
