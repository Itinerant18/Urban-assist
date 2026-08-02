/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  transpilePackages: ['@urban-assist/ui', '@urban-assist/db', '@urban-assist/lib'],
  experimental: { serverActions: { bodySizeLimit: '10mb' } },
  eslint: {
    ignoreDuringBuilds: true,
  },
};
