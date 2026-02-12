import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://saikomaps.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/creator/',
          '/dashboard/',
          '/maps/new',
          '/maps/*/edit',
          '/create/',
          '/profile/',
          '/auth/',
          '/login',
          '/signup',
          '/test-add-location',
          '/search-results-demo',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
