import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://cinepurr.me';
  
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/room/*/', '/admin/', '/settings/', '/forgot-password/', '/reset-password/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

