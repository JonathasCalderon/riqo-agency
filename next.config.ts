import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  images: {
    domains: ['localhost'],
  },
  // Enable static optimization where possible
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  // Add cache control headers to prevent caching issues
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
    return `cache-fix-v6-${Date.now()}`
  },
};

export default withNextIntl(nextConfig);
