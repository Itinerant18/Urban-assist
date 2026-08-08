import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { sentryTunnelRateLimit } from '@urban-assist/integrations/redis';
import { rateLimitKey } from '@urban-assist/utils';

export const runtime = 'nodejs';

// Sentry tunnel. The browser posts error envelopes here instead of directly to
// sentry.io, because ad blockers block requests to sentry.io outright and would
// silently drop a large share of client-side errors.
//
// Hand-written rather than using the SDK's `tunnelRoute` option, for two reasons:
//
//  1. That option generates a Next rewrite whose org and project come from the request's
//     own `o` and `p` query parameters. There is no SSRF (Next anchors the regexes, so the
//     host cannot leave *.sentry.io) but it does make the origin a free relay into ANY
//     Sentry tenant, and an unmetered sink for our own paid quota. Here the destination is
//     pinned to the DSN this deployment is configured with.
//  2. Rate limiting needs Upstash, and doing it in middleware pulled `process.version` into
//     the edge bundle — Next warns that it is unsupported there. A Node route handler under
//     /api keeps that off the edge, and /api is already excluded from every app's middleware
//     matcher, so the tunnel is reachable without a session without any matcher surgery.

const CONFIGURED_DSN = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

// Envelopes are small; a page load sends a handful. Anything much larger is not a real
// report.
const MAX_BODY_BYTES = 1_000_000;

export async function POST(req: NextRequest) {
  if (!CONFIGURED_DSN) return new NextResponse(null, { status: 204 });

  if (Number(req.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) {
    return new NextResponse(null, { status: 413 });
  }

  const limiter = sentryTunnelRateLimit();
  if (limiter) {
    // Trusted proxy headers only — keying on X-Forwarded-For would let a caller mint a
    // fresh bucket per request.
    const { success } = await limiter.limit(rateLimitKey(req.headers));
    if (!success) {
      return new NextResponse(null, { status: 429, headers: { 'Retry-After': '60' } });
    }
  }

  const body = await req.text();

  // An envelope is newline-delimited JSON; the first line is a header carrying the DSN the
  // SDK is configured with.
  const newline = body.indexOf('\n');
  let envelopeDsn: string | undefined;
  try {
    envelopeDsn = JSON.parse(body.slice(0, newline === -1 ? body.length : newline))?.dsn;
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  if (!envelopeDsn) return new NextResponse(null, { status: 400 });

  let upstream: string;
  try {
    const sent = new URL(envelopeDsn);
    const expected = new URL(CONFIGURED_DSN);
    // Pin to our own project. Without this the route relays into whatever tenant the caller
    // names, on our bandwidth and reputation.
    if (sent.host !== expected.host || sent.pathname !== expected.pathname) {
      return new NextResponse(null, { status: 403 });
    }
    const projectId = expected.pathname.replace(/^\//, '');
    upstream = `https://${expected.host}/api/${projectId}/envelope/`;
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  try {
    const res = await fetch(upstream, {
      method: 'POST',
      // Sentry authenticates the envelope from its own header, so no credentials are added
      // here and none of ours are exposed.
      headers: { 'content-type': 'application/x-sentry-envelope' },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    // Pass the status back so the SDK can back off, but never the body.
    return new NextResponse(null, { status: res.ok ? 200 : res.status });
  } catch {
    // 502 rather than 500: the failure is upstream, and the SDK treats it as retryable.
    return new NextResponse(null, { status: 502 });
  }
}
