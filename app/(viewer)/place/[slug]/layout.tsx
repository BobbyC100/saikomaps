import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { getGooglePhotoUrl, getPhotoRefFromStored } from '@/lib/google-places';

interface Props {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}

function getFirstPhotoUrl(googlePhotos: unknown): string | null {
  if (!googlePhotos || !Array.isArray(googlePhotos) || googlePhotos.length === 0) return null;
  const ref = getPhotoRefFromStored(
    googlePhotos[0] as { photo_reference?: string; photoReference?: string; name?: string }
  );
  if (!ref) return null;
  try {
    return getGooglePhotoUrl(ref, 800);
  } catch {
    return null;
  }
}

async function getPlaceData(slug: string) {
  return db.place.findUnique({
    where: { slug },
    select: {
      name: true,
      category: true,
      neighborhood: true,
      description: true,
      tagline: true,
      address: true,
      googlePhotos: true,
      priceLevel: true,
      cuisineType: true,
      website: true,
      instagram: true,
      phone: true,
      latitude: true,
      longitude: true,
      slug: true,
    },
  });
}

function buildJsonLd(place: NonNullable<Awaited<ReturnType<typeof getPlaceData>>>, pageUrl: string, photoUrl: string | null) {
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: place.name,
    url: pageUrl,
  };

  if (place.address) jsonLd.address = { '@type': 'PostalAddress', streetAddress: place.address };
  if (place.phone) jsonLd.telephone = place.phone;
  if (place.cuisineType || place.category) jsonLd.servesCuisine = place.cuisineType || place.category;
  if (place.priceLevel) {
    const priceRange = ['$', '$$', '$$$', '$$$$'];
    jsonLd.priceRange = priceRange[Math.min(place.priceLevel - 1, 3)];
  }
  if (photoUrl) jsonLd.image = photoUrl;
  if (place.latitude && place.longitude) {
    jsonLd.geo = {
      '@type': 'GeoCoordinates',
      latitude: Number(place.latitude),
      longitude: Number(place.longitude),
    };
  }

  // sameAs links (Instagram, website)
  const sameAs: string[] = [];
  if (place.website && !place.website.includes('instagram.com')) sameAs.push(place.website);
  if (place.instagram) {
    const handle = place.instagram.replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '');
    if (handle) sameAs.push(`https://instagram.com/${handle}`);
  }
  if (sameAs.length > 0) jsonLd.sameAs = sameAs;

  return jsonLd;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://saikomaps.com';

  const place = await getPlaceData(slug);

  if (!place) {
    return { title: 'Place Not Found' };
  }

  const price = place.priceLevel ? '$'.repeat(Math.min(place.priceLevel, 3)) : null;
  const metaParts = [place.category, place.neighborhood, price].filter(Boolean);
  const metaLine = metaParts.length > 0 ? metaParts.join(' · ') : '';

  const description = (
    place.tagline ||
    place.description ||
    `${place.name}${metaLine ? ` — ${metaLine}` : ''} on Saiko Maps`
  ).slice(0, 160);

  const photoUrl = getFirstPhotoUrl(place.googlePhotos);
  const pageUrl = `${siteUrl}/place/${place.slug}`;

  return {
    title: `${place.name}${metaLine ? ` — ${metaLine}` : ''}`,
    description,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title: `${place.name}${metaLine ? ` — ${metaLine}` : ''}`,
      description,
      url: pageUrl,
      type: 'website',
      ...(photoUrl
        ? { images: [{ url: photoUrl, width: 800, height: 600, alt: `${place.name} in ${place.neighborhood || 'Los Angeles'}` }] }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: place.name,
      description,
      ...(photoUrl ? { images: [photoUrl] } : {}),
    },
  };
}

export default async function PlaceLayout({ params, children }: Props) {
  const { slug } = await params;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://saikomaps.com';
  const place = await getPlaceData(slug);

  if (!place) return <>{children}</>;

  const photoUrl = getFirstPhotoUrl(place.googlePhotos);
  const pageUrl = `${siteUrl}/place/${place.slug}`;
  const jsonLd = buildJsonLd(place, pageUrl, photoUrl);

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
