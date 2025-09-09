import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  images: {
    domains: ['localhost'],
  },
  // Disable static optimization and PPR to fix deployment caching issues
  experimental: {
    optimizePackageImports: ['lucide-react'],
    // Disable Partial Prerendering to prevent caching issues
    ppr: false,
  },
  // Force dynamic rendering globally
  output: 'standalone',
  // Add cache control headers
  async headers() {
    return [
      {
        source: '/dashboard',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ]
  },
  // Force cache invalidation
  generateBuildId: async () => {
    return `dynamic-v5-${Date.now()}`
  },
};

export default withNextIntl(nextConfig);
