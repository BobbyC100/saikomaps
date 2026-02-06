/**
 * Share card image API
 * GET /api/og/[mapId]?format=story|square
 * Generates PNG share cards with template-specific designs (Postcard, Field Notes, Monocle).
 * Story = 9:16 (1080x1920), Square = 1:1 (1200x1200).
 */

import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getMapTemplate } from '@/lib/map-templates';

export const runtime = 'edge';

const STORY_WIDTH = 1080;
const STORY_HEIGHT = 1920;
const SQUARE_SIZE = 1200;

type Format = 'story' | 'square';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ mapId: string }> }
) {
  try {
    const { mapId } = await params;
    const format = (request.nextUrl.searchParams.get('format') || 'square') as Format;
    const isStory = format === 'story';

    const list = await db.list.findUnique({
      where: { id: mapId },
      include: { _count: { select: { locations: true } } },
    });

    if (!list) {
      return new Response('Map not found', { status: 404 });
    }

    const template = getMapTemplate(list.templateType);
    const width = isStory ? STORY_WIDTH : SQUARE_SIZE;
    const height = isStory ? STORY_HEIGHT : SQUARE_SIZE;
    const locationLabel = list._count.locations === 1
      ? '1 location'
      : `${list._count.locations} locations`;

    const filename = `saiko-map-${format}-${list.slug}.png`;

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: template.bg,
            fontFamily: 'system-ui, sans-serif',
            padding: isStory ? 80 : 60,
          }}
        >
          {/* Template-specific border/decor */}
          {template.id === 'postcard' && (
            <div
              style={{
                position: 'absolute',
                top: 40,
                left: 40,
                right: 40,
                bottom: 40,
                border: `4px solid ${template.accent}`,
                borderRadius: 24,
                opacity: 0.4,
              }}
            />
          )}
          {template.id === 'field-notes' && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: 8,
                height: '100%',
                backgroundColor: template.accent,
              }}
            />
          )}

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              maxWidth: isStory ? 800 : 900,
            }}
          >
            {/* Accent bar or dot (Monocle) */}
            {template.id === 'monocle' && (
              <div
                style={{
                  width: 60,
                  height: 4,
                  backgroundColor: template.accent,
                  marginBottom: 40,
                }}
              />
            )}

            <div
              style={{
                fontSize: isStory ? 28 : 22,
                color: template.textMuted,
                marginBottom: 16,
                textTransform: 'uppercase',
                letterSpacing: 4,
              }}
            >
              {template.id === 'postcard' ? 'Greetings from' : 'A map by'}
            </div>

            <h1
              style={{
                fontSize: isStory ? 72 : 56,
                fontWeight: 700,
                color: template.text,
                margin: 0,
                lineHeight: 1.15,
              }}
            >
              {list.title}
            </h1>

            {list.subtitle && (
              <p
                style={{
                  fontSize: isStory ? 32 : 26,
                  color: template.textMuted,
                  marginTop: 24,
                  marginBottom: 0,
                }}
              >
                {list.subtitle}
              </p>
            )}

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginTop: 40,
              }}
            >
              <span
                style={{
                  padding: '12px 24px',
                  backgroundColor: template.accent,
                  color: template.bg === '#1A1A1A' ? '#1A1A1A' : '#fff',
                  fontSize: isStory ? 26 : 20,
                  fontWeight: 600,
                  borderRadius: template.id === 'monocle' ? 0 : 12,
                }}
              >
                {locationLabel}
              </span>
            </div>

            <div
              style={{
                marginTop: 'auto',
                paddingTop: 60,
                fontSize: isStory ? 24 : 20,
                color: template.textMuted,
              }}
            >
              Saiko Maps
            </div>
          </div>
        </div>
      ),
      {
        width,
        height,
        headers: {
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      }
    );
  } catch (e) {
    console.error('OG image error:', e);
    return new Response('Failed to generate image', { status: 500 });
  }
}
