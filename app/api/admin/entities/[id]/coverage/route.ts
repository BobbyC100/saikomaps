/**
 * Coverage Sources API
 * POST /api/admin/entities/[id]/coverage — add a media coverage link
 * GET  /api/admin/entities/[id]/coverage — list coverage sources
 *
 * Body (POST): { url: string, source_name?: string, published_at?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { derivePublicationName } from '@/lib/source-registry';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const sources = await db.coverage_sources.findMany({
    where: { entityId: id },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ sources });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { url, source_name, published_at } = body as {
    url?: string;
    source_name?: string;
    published_at?: string;
  };

  if (!url || !url.trim()) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 });
  }

  const cleanUrl = url.trim();

  // Use approved source registry for name derivation, with manual override
  const publicationName = source_name?.trim() || derivePublicationName(cleanUrl);

  try {
    const source = await db.coverage_sources.create({
      data: {
        entityId: id,
        url: cleanUrl,
        publicationName,
        publishedAt: published_at ? new Date(published_at) : null,
        enrichmentStage: 'INGESTED',
      },
    });

    return NextResponse.json({ source });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'This URL is already linked to this entity' },
        { status: 409 },
      );
    }
    console.error('[Coverage Sources] Error:', error);
    return NextResponse.json(
      { error: 'Failed to add coverage source', message: error.message },
      { status: 500 },
    );
  }
}
