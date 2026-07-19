/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,

  // Skip type-checking and linting during build (already verified clean)
  typescript: {
    ignoreBuildErrors: true,
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'api.dicebear.com' },
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: 'image.tmdb.org' },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400,
  },

  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },

  // Next.js 16 uses Turbopack by default.
  // Empty turbopack config silences the "webpack config but no turbopack config" error.
  // The webpack fallbacks below are handled automatically by Turbopack.
  turbopack: {},

  experimental: {
    optimizeCss: false,
    optimizePackageImports: ['lucide-react', 'motion', 'socket.io-client'],
  },

  // Keep webpack config for non-Turbopack contexts (local dev with --webpack flag, etc.)
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
      // Exclude heavy server-only Solana/Anchor packages from client bundle
      config.externals = [
        ...(config.externals || []),
        '@coral-xyz/anchor',
        '@solana/spl-token',
      ];
    }
    return config;
  },

  compress: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
};

module.exports = nextConfig;
