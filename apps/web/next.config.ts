import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // Keep dev and production artifacts isolated when both commands are used
  // during local verification.
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
};

export default withNextIntl(nextConfig);
