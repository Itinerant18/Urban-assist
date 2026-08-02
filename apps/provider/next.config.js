const path = require('path');

/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  transpilePackages: ['@urban-assist/ui', '@urban-assist/db', '@urban-assist/lib'],
  // ponytail: Next 14 still nests this under experimental; top-level key is ignored
  experimental: {
    serverActions: { bodySizeLimit: '10mb' },
    outputFileTracingRoot: path.join(__dirname, '../..'),
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};
