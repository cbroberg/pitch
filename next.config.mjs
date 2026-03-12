/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  serverExternalPackages: ['better-sqlite3', 'sharp', 'playwright-core'],
};

export default nextConfig;
