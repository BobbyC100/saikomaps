/**
 * Layout for public map view: provides Share Card metadata (OG + Twitter)
 * so when the map URL is shared, link unfurls show title, description, and image.
 */

import type { Metadata } from 'next';
import { db } from '@/lib/db';

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const list = await db.list.findFirst({
    where: { slug, published: true },
    include: { _count: { select: { locations: true } } },
  });

  if (!list) {
    return {
      title: 'Map not found | Saiko Maps',
    };
  }

  const title = list.title;
  const description =
    list.subtitle ||
    `${list._count.locations} locations · A map made with Saiko Maps`;
  const url = `${BASE_URL}/map/${slug}`;
  const imageUrl = list.coverImageUrl
    ? (list.coverImageUrl.startsWith('http') ? list.coverImageUrl : `${BASE_URL}${list.coverImageUrl}`)
    : `${BASE_URL}/saiko-logo.png`;

  return {
    title: `${title} | Saiko Maps`,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: 'Saiko Maps',
      images: [{ url: imageUrl, width: 1200, height: 630, alt: title }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
    alternates: { canonical: url },
  };
}

export default function MapSlugLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
