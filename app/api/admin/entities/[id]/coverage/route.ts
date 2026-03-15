/**
 * Coverage Sources API
 * POST /api/admin/entities/[id]/coverage — add a media coverage link
 * GET  /api/admin/entities/[id]/coverage — list coverage sources
 *
 * Body (POST): { url: string, source_name?: string, excerpt?: string, published_at?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const sources = await db.coverage_sources.findMany({
    where: { entityId: id },
    orderBy: { created_at: 'desc' },
  });

  return NextResponse.json({ sources });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { url, source_name, excerpt, published_at } = body as {
    url?: string;
    source_name?: string;
    excerpt?: string;
    published_at?: string;
  };

  if (!url || !url.trim()) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 });
  }

  const cleanUrl = url.trim();

  // Auto-detect source name from URL if not provided
  const detectedSource = source_name?.trim() || inferSourceName(cleanUrl);

  try {
    const source = await db.coverage_sources.create({
      data: {
        entityId: id,
        url: cleanUrl,
        source_name: detectedSource,
        excerpt: excerpt?.trim() || null,
        published_at: published_at ? new Date(published_at) : null,
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

function inferSourceName(url: string): string {
  const hostname = new URL(url).hostname.replace('www.', '');
  const nameMap: Record<string, string> = {
    'eater.com': 'Eater',
    'la.eater.com': 'Eater LA',
    'latimes.com': 'LA Times',
    'infatuation.com': 'The Infatuation',
    'theinfatuation.com': 'The Infatuation',
    'timeout.com': 'Time Out',
    'yelp.com': 'Yelp',
    'instagram.com': 'Instagram',
    'tiktok.com': 'TikTok',
    'youtube.com': 'YouTube',
    'thrillist.com': 'Thrillist',
    'bonappetit.com': 'Bon Appétit',
    'foodandwine.com': 'Food & Wine',
    'grubstreet.com': 'Grub Street',
    'laweekly.com': 'LA Weekly',
    'lamag.com': 'LA Magazine',
    'nytimes.com': 'New York Times',
    'sfchronicle.com': 'SF Chronicle',
  };
  return nameMap[hostname] ?? hostname;
}
