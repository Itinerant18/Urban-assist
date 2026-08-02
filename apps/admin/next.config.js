const path = require('path');

/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  // ponytail: monorepo edge/serverless tracing needs repo root, not apps/admin
  outputFileTracingRoot: path.join(__dirname, '../..'),
  transpilePackages: ['@urban-assist/ui', '@urban-assist/db', '@urban-assist/lib'],
  experimental: { serverActions: { bodySizeLimit: '5mb' } },
  eslint: {
    ignoreDuringBuilds: true,
  },
};
