/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disabled React Strict Mode to avoid double-mounting side-effects in development
  // This prevents effects from running twice during dev but keep in mind
  // Strict Mode is useful for detecting side-effect bugs — consider re-enabling later
  reactStrictMode: false,

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'api.dicebear.com' },
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: 'image.tmdb.org' },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400, // Cache images for 24 hours
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  turbopack: {
    root: __dirname,
  },
  output: 'standalone',

  // Experimental performance features
  experimental: {
    // optimizeCss disabled — causes Turbopack OOM on the 75KB globals.css
    optimizeCss: false,
    // Optimize package imports for tree-shaking
    optimizePackageImports: [
      'lucide-react',
      'motion',
      '@prisma/client',
      'socket.io-client',
    ],
  },

  // Webpack optimizations
  webpack: (config, { isServer }) => {
    // Polyfill fallbacks for client-side
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    // Note: custom splitChunks removed — Next.js 16 handles chunk splitting
    // internally and the old config conflicted with Turbopack.
    return config;
  },

  // Compression
  compress: true,

  // Security headers
  async headers() {
    const isDev = process.env.NODE_ENV === 'development';
    const mainScriptSrc = isDev
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://www.youtube.com https://s.ytimg.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://pagead2.googlesyndication.com"
      : "script-src 'self' 'unsafe-inline' blob: https://www.youtube.com https://s.ytimg.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://pagead2.googlesyndication.com";
    const gamesScriptSrc = isDev
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://cdn.jsdelivr.net https://cdnjs.cloudflare.com"
      : "script-src 'self' 'unsafe-inline' blob: https://cdn.jsdelivr.net https://cdnjs.cloudflare.com";

    return [
      {
        // Apply strict security headers to most pages
        source: '/((?!games/).*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '0',
          },
          {
            key: 'Referrer-Policy',
            value: 'no-referrer',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, must-revalidate',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: `default-src 'self'; ${mainScriptSrc}; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' https: data: blob:; font-src 'self' https://fonts.gstatic.com data:; connect-src 'self' https: wss:; frame-src 'self' https://www.youtube.com https://player.vimeo.com https://vidsrc.xyz https://vidsrc.to https://vidsrc.me https://vidsrc.net https://vidsrc.cc https://vidsrc.in https://2embed.org https://multiembed.mov https://*.vidsrc.xyz https://*.vidsrc.to https://vsembed.ru https://*.vsembed.ru https://abyss.to https://*.abyss.to https://vidbinge.dev https://*.vidbinge.dev; media-src 'self' https: blob:; worker-src 'self' blob:; child-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`,
          },
        ],
      },
      {
        // Allow game pages to be embedded in iframes from same origin
        source: '/games/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-XSS-Protection',
            value: '0',
          },
          {
            key: 'Referrer-Policy',
            value: 'no-referrer',
          },
          {
            key: 'Content-Security-Policy',
            value: `default-src 'self'; ${gamesScriptSrc}; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' https: data: blob:; font-src 'self' https://fonts.gstatic.com data:; connect-src 'self' https: wss:; media-src 'self' https: blob:; worker-src 'self' blob:; child-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'`,
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=10, stale-while-revalidate=59',
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/fonts/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Cache images & static media (favicon, OG image, etc.)
        source: '/:path*.(ico|png|jpg|jpeg|gif|webp|avif|svg|woff|woff2)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
    ];
  },

  // Remove powered-by header
  poweredByHeader: false,

  // Production source maps (disable for better performance)
  productionBrowserSourceMaps: false,
};

// Note: swcMinify is the default since Next.js 13 and no longer needs to be set explicitly.

module.exports = nextConfig;
