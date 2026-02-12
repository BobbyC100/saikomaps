/**
 * Layout for /explore — static metadata for the explore/browse page.
 */

import type { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://saikomaps.com';

export const metadata: Metadata = {
  title: 'Explore Curated Maps',
  description:
    'Browse curated maps of the best restaurants, bars, and cafés — handpicked by local creators and food writers.',
  alternates: { canonical: `${siteUrl}/explore` },
  openGraph: {
    title: 'Explore Curated Maps',
    description:
      'Browse curated maps of the best restaurants, bars, and cafés — handpicked by local creators and food writers.',
    url: `${siteUrl}/explore`,
    siteName: 'Saiko Maps',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Explore Curated Maps',
    description:
      'Browse curated maps of the best restaurants, bars, and cafés — handpicked by local creators and food writers.',
  },
};

export default function ExploreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
