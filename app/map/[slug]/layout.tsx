/**
 * Layout for public map view: provides Share Card metadata (OG + Twitter),
 * canonical URL, and ItemList JSON-LD structured data.
 */

import type { Metadata } from 'next';
import { db } from '@/lib/db';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://saikomaps.com';

async function getMapData(slug: string) {
  return db.lists.findFirst({
    where: { slug, published: true },
    select: {
      title: true,
      subtitle: true,
      description: true,
      slug: true,
      coverImageUrl: true,
      users: { select: { name: true } },
      map_places: {
        orderBy: { orderIndex: 'asc' },
        select: {
          places: {
            select: {
              name: true,
              neighborhood: true,
              slug: true,
            },
          },
        },
      },
      _count: { select: { map_places: true } },
    },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const map = await getMapData(slug);

  if (!map) {
    return { title: 'Map Not Found' };
  }

  const creatorName = map.users?.name || 'Saiko Maps';
  const placeCount = map._count?.map_places || 0;

  const neighborhoods = [
    ...new Set(
      map.map_places
        .map((mp) => mp.places?.neighborhood)
        .filter(Boolean)
    ),
  ].slice(0, 3);

  const description = (
    map.description ||
    map.subtitle ||
    `${placeCount} curated places${neighborhoods.length > 0 ? ` in ${neighborhoods.join(', ')}` : ''} by ${creatorName}`
  ).slice(0, 160);

  const url = `${siteUrl}/map/${slug}`;
  const imageUrl = map.coverImageUrl
    ? (map.coverImageUrl.startsWith('http') ? map.coverImageUrl : `${siteUrl}${map.coverImageUrl}`)
    : `${siteUrl}/saiko-logo.png`;

  return {
    title: `${map.title} by ${creatorName}`,
    description,
    openGraph: {
      title: map.title,
      description,
      url,
      siteName: 'Saiko Maps',
      images: [{ url: imageUrl, width: 1200, height: 630, alt: map.title }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: map.title,
      description,
      images: [imageUrl],
    },
    alternates: { canonical: url },
  };
}

export default async function MapSlugLayout({
  params,
  children,
}: {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}) {
  const { slug } = await params;
  const map = await getMapData(slug);

  if (!map) return <>{children}</>;

  // Build ItemList JSON-LD
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: map.title,
    description: map.description || map.subtitle || undefined,
    numberOfItems: map._count?.map_places || 0,
    itemListElement: map.map_places.map((mp, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Restaurant',
        name: mp.places?.name || 'Unknown',
        url: mp.places?.slug ? `${siteUrl}/place/${mp.places.slug}` : undefined,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  );
}
