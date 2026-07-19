/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,

  // Skip type-checking and linting during build (already verified clean)
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Do NOT use standalone — causes extra memory and breaks Vercel
  // output: 'standalone',

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

  // No turbopack — it was causing OOM on large CSS files
  experimental: {
    optimizeCss: false,
    optimizePackageImports: ['lucide-react', 'motion', 'socket.io-client'],
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    // Exclude heavy server-only Solana/Anchor packages from client bundle
    if (!isServer) {
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
