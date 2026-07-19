'use client';

import Script from 'next/script';

interface StructuredDataProps {
  type?: 'website' | 'organization' | 'webapp';
}

// Get base URL from environment variable or fallback to default
const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // Client-side: use current origin
    return window.location.origin;
  }
  // Server-side: use environment variable or fallback
  return process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://cinepurr.me';
};

export default function StructuredData({ type = 'website' }: StructuredDataProps) {
  const baseUrl = getBaseUrl();
  
  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'CinePurr',
    alternateName: 'CinePurr - Watch Together',
    url: baseUrl,
    description: 'Watch movies and videos together in real-time with friends',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/room/{room_id}`,
      },
      'query-input': 'required name=room_id',
    },
  };

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'CinePurr',
    url: baseUrl,
    logo: `${baseUrl}/logo.jpg`,
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      availableLanguage: ['English'],
    },
  };

  const webAppSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'CinePurr',
    applicationCategory: 'EntertainmentApplication',
    operatingSystem: 'Any',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    featureList: [
      'Watch videos together in real-time',
      'Synchronized playback',
      'Live chat',
      'Room creation',
      'Video queue',
    ],
  };

  const schemas = {
    website: websiteSchema,
    organization: organizationSchema,
    webapp: webAppSchema,
  };

  return (
    <Script
      id={`structured-data-${type}`}
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schemas[type]),
      }}
    />
  );
}

// Combined schema for maximum SEO
export function FullStructuredData() {
  // Get base URL (server-side only for this component)
  const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://cinepurr.me';
  
  const combinedSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${baseUrl}/#website`,
        name: 'CinePurr',
        url: baseUrl,
        description: 'Watch movies and videos together in real-time with friends',
        publisher: { '@id': `${baseUrl}/#organization` },
        potentialAction: {
          '@type': 'SearchAction',
          target: `${baseUrl}/?search={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'Organization',
        '@id': `${baseUrl}/#organization`,
        name: 'CinePurr',
        url: baseUrl,
        logo: {
          '@type': 'ImageObject',
          url: `${baseUrl}/logo.jpg`,
        },
      },
      {
        '@type': 'WebApplication',
        '@id': `${baseUrl}/#webapp`,
        name: 'CinePurr',
        applicationCategory: 'EntertainmentApplication',
        operatingSystem: 'Any',
        browserRequirements: 'Requires JavaScript',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
      },
    ],
  };

  return (
    <Script
      id="structured-data-full"
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(combinedSchema),
      }}
    />
  );
}
