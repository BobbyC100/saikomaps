/**
 * Homepage — Field Notes redesign
 * Route: /
 */

import Link from 'next/link';
import { GlobalHeader } from '@/components/layouts/GlobalHeader';
import { GlobalFooter } from '@/components/layouts/GlobalFooter';
import { MapCard } from '@/components/ui/MapCard';
import { db } from '@/lib/db';
import styles from './homepage.module.css';

const PLACEHOLDER_PHOTOS = [
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=250&fit=crop',
  'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400&h=250&fit=crop',
  'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=400&h=250&fit=crop',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&h=250&fit=crop',
];

function getCoverPhotos(mapPlaces: Array<{ places: { googlePhotos: unknown } }>): string[] {
  const urls: string[] = [];
  for (const mp of mapPlaces) {
    const gp = mp.places?.googlePhotos;
    if (gp && Array.isArray(gp) && gp.length > 0) {
      const first = gp[0] as { url?: string };
      if (first.url) urls.push(first.url);
    }
  }
  while (urls.length < 4) {
    urls.push(PLACEHOLDER_PHOTOS[urls.length % PLACEHOLDER_PHOTOS.length]);
  }
  return urls.slice(0, 4);
}

export default async function Home() {
  const featuredMaps = await db.lists.findMany({
    where: { published: true },
    include: {
      users: { select: { name: true } },
      map_places: {
        take: 4,
        orderBy: { orderIndex: 'asc' },
        include: { places: { select: { googlePhotos: true } } },
      },
      _count: { select: { map_places: true } },
    },
    orderBy: { publishedAt: 'desc' },
    take: 8,
  });

  return (
    <div className={styles.page}>
      <GlobalHeader variant="default" />

      {/* Hero Section */}
      <section className={styles.hero}>
        <h1 className={styles.heroHeadline}>
          Curated maps for people who care where they go.
        </h1>
        <p className={styles.heroSubhead}>
          Discover restaurants, bars, and neighborhood gems — or create your own map to share.
        </p>
        <div className={styles.heroActions}>
          <Link href="/explore" className={styles.btnPrimary}>
            Explore Maps
          </Link>
          <Link href="/maps/new" className={styles.btnSecondary}>
            Create a Map
          </Link>
        </div>
      </section>

      {/* Featured Maps Section */}
      <section className={styles.featuredSection}>
        <span className={styles.sectionLabel}>Featured Maps</span>
        <div className={styles.mapGrid}>
          {featuredMaps.length > 0 ? (
            featuredMaps.map((map) => (
              <MapCard
                key={map.id}
                id={map.id}
                title={map.title}
                slug={map.slug}
                placeCount={map._count?.map_places ?? 0}
                coverPhotos={getCoverPhotos(map.map_places)}
                curatorName={map.users?.name ?? 'Saiko'}
              />
            ))
          ) : (
            <>
              <MapCard
                id="1"
                title="Echo Park Date Nights"
                slug="echo-park-date-nights"
                placeCount={12}
                coverPhotos={PLACEHOLDER_PHOTOS}
                curatorName="Bobby"
              />
              <MapCard
                id="2"
                title="SGV Dim Sum Run"
                slug="sgv-dim-sum"
                placeCount={8}
                coverPhotos={PLACEHOLDER_PHOTOS}
                curatorName="Bobby"
              />
              <MapCard
                id="3"
                title="Silver Lake Essentials"
                slug="silver-lake-essentials"
                placeCount={15}
                coverPhotos={PLACEHOLDER_PHOTOS}
                curatorName="Saiko"
              />
              <MapCard
                id="4"
                title="Late Night Eats"
                slug="late-night-eats"
                placeCount={24}
                coverPhotos={PLACEHOLDER_PHOTOS}
                curatorName="Saiko"
              />
            </>
          )}
        </div>
      </section>

      <GlobalFooter variant="standard" />
    </div>
  );
}
