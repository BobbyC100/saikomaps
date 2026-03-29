/**
 * Layout for place page: provides Share Card metadata (OG + Twitter)
 * so when a place URL is shared, link unfurls show the place name,
 * identity line, and hero photo — not the generic Saiko logo.
 *
 * Keeps the query lightweight: only fetches what's needed for metadata.
 * Full place data is fetched client-side by the page component.
 */

import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { getGooglePhotoUrl, getPhotoRefFromStored } from '@/lib/google-places';

function getBaseUrl(): string {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (process.env.NEXTAUTH_URL) {
    try {
      return new URL(process.env.NEXTAUTH_URL).origin;
    } catch {
      return 'http://localhost:3000';
    }
  }
  return 'http://localhost:3000';
}
const BASE_URL = getBaseUrl();

function toTitleCase(input: string): string {
  return input
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Resolve the best available image for OG card.
 * Priority: HERO photo (curated) → first eligible registry photo → Google Photos fallback → logo.
 */
async function resolveOgImage(entityId: string, googlePhotos: unknown): Promise<string> {
  // 1. HERO from place_photo_eval (human-curated)
  try {
    const heroEval = await db.place_photo_eval.findFirst({
      where: { entityId, tier: 'HERO' },
      select: { photoRef: true, requestedMaxWidthPx: true },
      orderBy: { updatedAt: 'desc' },
    });
    if (heroEval?.photoRef) {
      return getGooglePhotoUrl(heroEval.photoRef, heroEval.requestedMaxWidthPx ?? 1200);
    }
  } catch {
    // Fall through to next priority
  }

  // 2. First eligible registry photo (website or IG source)
  try {
    const registryPhoto = await db.place_photos.findFirst({
      where: { entityId, eligible: true },
      select: { sourceUrl: true, sourceRef: true, source: true },
      orderBy: [{ sourceRank: 'asc' }, { ingestedAt: 'desc' }],
    });
    if (registryPhoto?.sourceUrl) {
      return registryPhoto.sourceUrl;
    }
    if (registryPhoto?.sourceRef) {
      return getGooglePhotoUrl(registryPhoto.sourceRef, 1200);
    }
  } catch {
    // Fall through to next priority
  }

  // 3. Legacy fallback: entities.googlePhotos JSON blob
  if (googlePhotos && Array.isArray(googlePhotos as unknown[])) {
    const photos = googlePhotos as unknown[];
    if (photos.length > 0) {
      const ref = getPhotoRefFromStored(photos[0]);
      if (ref) {
        return getGooglePhotoUrl(ref, 1200);
      }
    }
  }

  // 4. Fallback: Saiko logo
  return `${BASE_URL}/saiko-logo.png`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = rawSlug?.toLowerCase() || '';

  const entity = await db.entities.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      category: true,
      neighborhood: true,
      tagline: true,
      googlePhotos: true,
    },
  });

  if (!entity) {
    return {
      title: 'Place not found | Saiko Fields',
    };
  }

  // Try to get the ERA tagline from interpretation_cache
  let tagline = typeof entity.tagline === 'string' ? entity.tagline : null;
  try {
    const eraTagline = await db.interpretation_cache.findFirst({
      where: { entityId: entity.id, outputType: 'TAGLINE', isCurrent: true },
      select: { content: true },
      orderBy: { generatedAt: 'desc' },
    });
    if (eraTagline?.content && typeof eraTagline.content === 'string') {
      tagline = eraTagline.content;
    } else if (
      eraTagline?.content &&
      typeof eraTagline.content === 'object' &&
      'text' in (eraTagline.content as Record<string, unknown>) &&
      typeof (eraTagline.content as Record<string, unknown>).text === 'string'
    ) {
      tagline = (eraTagline.content as Record<string, string>).text;
    }
  } catch {
    // Use entity.tagline fallback
  }

  const title = entity.name;

  // Build a richer share description from high-level identity + tagline.
  const parts: string[] = [];
  const categoryLabel = entity.category
    ? toTitleCase(entity.category.replace(/[-_]+/g, ' '))
    : null;
  const identitySnippet = categoryLabel
    ? `${categoryLabel}${entity.neighborhood ? ` in ${entity.neighborhood}` : ''}`
    : (entity.neighborhood ? `In ${entity.neighborhood}` : null);
  if (identitySnippet) parts.push(identitySnippet);
  if (tagline) parts.push(tagline);

  const description = parts.length > 0
    ? parts.join(' · ')
    : `${title} on Saiko Fields`;

  const url = `${BASE_URL}/place/${slug}`;
  const imageUrl = await resolveOgImage(entity.id, entity.googlePhotos);

  return {
    title: `${title} | Saiko Fields`,
    applicationName: 'Saiko Fields',
    description,
    openGraph: {
      title: `${title} | Saiko Fields`,
      description,
      url,
      siteName: 'Saiko Fields',
      images: [{ url: imageUrl, width: 1200, height: 630, alt: title }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | Saiko Fields`,
      description,
      images: [imageUrl],
    },
    alternates: { canonical: url },
  };
}

export default function PlaceSlugLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
