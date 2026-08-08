const path = require('path');
const { withSentryConfig } = require('@sentry/nextjs');
const { securityHeaders } = require('../../tooling/security-headers');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders() }];
  },
  transpilePackages: ['@urban-assist/ui', '@urban-assist/db', '@urban-assist/lib'],
  // ponytail: Next 14 still nests this under experimental; top-level key is ignored
  experimental: {
    serverActions: { bodySizeLimit: '5mb' },
    outputFileTracingRoot: path.join(__dirname, '../..'),
    // Required on Next 14 for instrumentation.ts to be loaded at all; stable from Next 15.
    // Without it the server and edge Sentry configs never initialise.
    instrumentationHook: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = withSentryConfig(nextConfig, {
  // Source-map upload needs an auth token plus org/project. All three are absent in normal
  // development, and the plugin then skips upload rather than failing the build — so a
  // developer without Sentry credentials is unaffected.
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Keep build output quiet unless something is wrong.
  silent: !process.env.CI,

  // Upload source maps so stack traces are readable, then delete them from the deployed
  // bundle: leaving them served would hand the whole client source to anyone.
  widenClientFileUpload: true,
  sourcemaps: { deleteSourcemapsAfterUpload: true },

  // Route browser events through our own origin. Ad blockers block requests to
  // sentry.io outright, which silently loses a large share of client-side errors.
  // This also means the CSP does not need a Sentry ingest origin in connect-src.
  tunnelRoute: '/monitoring',

  // Strip the SDK's own logger statements from production bundles. `disableLogger: true`
  // does the same thing but is deprecated in v10 in favour of this.
  webpack: { treeshake: { removeDebugLogging: true } },
});

// Expected build warning: the SDK suggests moving sentry.client.config.ts to
// instrumentation-client.ts. That file convention needs Next 15.3+; this app is on Next 14,
// where it would simply never be loaded. The warning's actual caveat is Turbopack, which we
// do not use. Revisit when upgrading Next.
