import { MetadataRoute } from 'next';
import { db } from '@/lib/db';
import { requireActiveCityId } from '@/lib/active-city';
import { publicPlaceWhere } from '@/lib/coverage-gate';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://saikomaps.com';
  const cityId = await requireActiveCityId();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/explore`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ];

  // Published maps
  const publishedMaps = await db.lists.findMany({
    where: { published: true },
    select: {
      slug: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: 'desc' },
  });

  const mapPages: MetadataRoute.Sitemap = publishedMaps.map((map) => ({
    url: `${baseUrl}/map/${map.slug}`,
    lastModified: map.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // Places that appear on at least one published map (LA only + approved coverage)
  const placesOnMaps = await db.places.findMany({
    where: publicPlaceWhere(cityId, false), // Strict mode: approved coverage only (76% threshold reached)
    select: {
      slug: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: 'desc' },
  });

  const placePages: MetadataRoute.Sitemap = placesOnMaps.map((place) => ({
    url: `${baseUrl}/place/${place.slug}`,
    lastModified: place.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [...staticPages, ...mapPages, ...placePages];
}
