// Shared security headers for all three Next apps. No CSP, HSTS, or frame headers
// existed anywhere before this — a grep across every next.config.js and middleware
// returned zero matches.
//
// Required from each app's next.config.js:
//   const { securityHeaders } = require('../../tooling/security-headers');
//   module.exports = { ...,  async headers() { return [{ source: '/(.*)', headers: securityHeaders() }]; } };

// Third-party origins the apps genuinely talk to. Keep this list as the single
// place they are enumerated — a CSP that drifts from reality is worse than none,
// because the report-only noise trains everyone to ignore it.
// Split because wss: belongs in connect-src only — a websocket scheme in img-src is
// meaningless noise, and Supabase realtime needs the wss origin in connect-src.
const SUPABASE_HTTP = 'https://*.supabase.co';
const SUPABASE = [SUPABASE_HTTP, 'wss://*.supabase.co'];
const STRIPE = ['https://js.stripe.com', 'https://api.stripe.com', 'https://hooks.stripe.com'];
const FIREBASE = [
  'https://*.googleapis.com',
  'https://*.firebaseio.com',
  'wss://*.firebaseio.com',
  'https://*.google.com',
];
const VERCEL = ['https://va.vercel-scripts.com', 'https://vitals.vercel-insights.com'];
// The Maps JS SDK is not used anywhere (no `google.maps`, no @react-google-maps). Maps
// appears only as www.google.com/maps/embed iframes — 8 call sites across the customer
// and provider apps — so it belongs in frame-src, not script-src/connect-src.
const MAPS_EMBED = 'https://www.google.com';
// firebase-messaging-sw.js in the customer and provider apps importScripts() the compat
// SDKs from gstatic. The '/(.*)' header rule serves this CSP on the worker script too,
// so the worker inherits it and importScripts is governed by script-src. Omitting this
// breaks push notifications the moment the policy is enforced.
const FIREBASE_SDK = 'https://www.gstatic.com';
// Same-origin collector, present in all three apps at app/api/csp-report/route.ts. Each
// app's middleware matcher excludes /api, so the endpoint stays reachable without a session
// — including in admin, where the aal2 gate would otherwise reject browser-sent reports.
const CSP_REPORT_PATH = '/api/csp-report';

function contentSecurityPolicy() {
  return [
    "default-src 'self'",
    // 'unsafe-inline'/'unsafe-eval': Next's runtime and the Stripe loader both need them
    // without a nonce pipeline. Tightening this is a separate job — it needs per-request
    // nonces threaded through the app shell.
    `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${STRIPE.join(' ')} ${FIREBASE_SDK} ${VERCEL.join(' ')}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${SUPABASE_HTTP} https://*.gstatic.com https://*.googleapis.com`,
    "font-src 'self' data:",
    `connect-src 'self' ${SUPABASE.join(' ')} ${STRIPE.join(' ')} ${FIREBASE.join(' ')} ${VERCEL.join(' ')}`,
    // frame-src does NOT fall back to default-src, so every framed origin must be listed:
    // Stripe payment element + 3DS challenges, Google Maps embeds, and the Supabase
    // signed-URL iframe the admin KYC reviewer uses to view passports/DBS/insurance
    // (apps/admin/app/(app)/kyc/[providerId]/review-actions.tsx:131).
    `frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://*.stripe.com https://m.stripe.network ${MAPS_EMBED} ${SUPABASE_HTTP}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    // Both wire formats: report-uri is legacy but still the most widely honoured, and
    // report-to is the Reporting API successor (paired with the Reporting-Endpoints header
    // below). Without at least one of these, Report-Only violations reach nothing but
    // individual browser consoles — so the "watch the reports, then enforce" plan could
    // never actually be carried out.
    `report-uri ${CSP_REPORT_PATH}`,
    'report-to csp-endpoint',
  ].join('; ');
}

function securityHeaders() {
  return [
    // Report-only first, deliberately. Enforcing a first-draft CSP on a live
    // marketplace breaks checkout, chat, or maps in ways nobody sees until a
    // customer does. Watch the reports, then switch this key to
    // 'Content-Security-Policy'.
    { key: 'Content-Security-Policy-Report-Only', value: contentSecurityPolicy() },

    // Declares the group named by the CSP's `report-to csp-endpoint`.
    { key: 'Reporting-Endpoints', value: `csp-endpoint="${CSP_REPORT_PATH}"` },

    // These are safe to enforce immediately.
    { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'X-DNS-Prefetch-Control', value: 'off' },
    // Nothing in these apps uses the camera or mic. Geolocation stays available:
    // the provider app tracks live location.
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), payment=(self "https://js.stripe.com")' },
  ];
}

// Applied to /api/* only, not site-wide: every API response here is either
// per-user or a mutation, and none of it should ever sit in a shared cache.
// Kept separate from securityHeaders() so static assets under /_next keep their
// long-lived caching.
//
// Authenticated HTML gets the same treatment from the middleware
// (packages/db/src/middleware.ts) rather than from here, because "authenticated"
// is a session property that a path pattern cannot express.
function noStoreHeaders() {
  return [
    { key: 'Cache-Control', value: 'private, no-store, max-age=0, must-revalidate' },
    // Honoured by Cloudflare even when a page rule overrides Cache-Control.
    { key: 'CDN-Cache-Control', value: 'private, no-store' },
  ];
}

module.exports = { securityHeaders, contentSecurityPolicy, noStoreHeaders };
