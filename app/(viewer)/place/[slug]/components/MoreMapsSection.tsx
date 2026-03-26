'use client';

import Link from 'next/link';

export interface MoreMapsItem {
  id: string;
  title: string;
  slug: string;
  coverImageUrl: string | null;
  creatorName: string;
  description?: string | null;
  placeCount?: number;
  authorType?: 'saiko' | 'user';
}

interface MoreMapsSectionProps {
  maps: MoreMapsItem[];
}

export function MoreMapsSection({ maps }: MoreMapsSectionProps) {
  if (maps.length === 0) return null;

  return (
    <section id="more-maps">
      <h2>More Maps</h2>
      <div id="more-maps-grid">
        {maps.map((map) => (
          <Link key={map.id} href={`/map/${map.slug}`} className="map-card">
            {map.coverImageUrl && (
              <div className="map-card-image" style={{ backgroundImage: `url(${map.coverImageUrl})` }} />
            )}
            <div className="map-card-body">
              <span className="map-card-type">
                MAP · {map.placeCount ?? 0} {(map.placeCount ?? 0) === 1 ? 'PLACE' : 'PLACES'}
              </span>
              <span className="map-card-title">{map.title}</span>
              <span className="map-card-creator">
                {map.authorType === 'saiko' ? 'Curator Pick' : `By ${map.creatorName}`}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
