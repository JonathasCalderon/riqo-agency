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
  // Force cache invalidation
  generateBuildId: async () => {
    return `force-deploy-v4-${Date.now()}`
  },
};

export default withNextIntl(nextConfig);
