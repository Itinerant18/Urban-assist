/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  transpilePackages: ['@urban-assist/ui', '@urban-assist/db', '@urban-assist/lib'],
  experimental: { serverActions: { bodySizeLimit: '5mb' } },
  eslint: {
    ignoreDuringBuilds: true,
  },
};
