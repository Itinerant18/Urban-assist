import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Collector for Content-Security-Policy-Report-Only violations.
//
// The policy shipped in report-only mode with the stated plan of "watch the reports, then
// enforce" — but with no report-uri/report-to the reports only ever reached individual
// browser consoles, so the data needed to promote the header could never be gathered.
//
// Deliberately unauthenticated: browsers send these without credentials, and the CSP is
// served on public pages. That makes it spammable, so nothing is persisted — entries are
// logged for aggregation by the platform log drain, with the payload trimmed to the fields
// that matter and capped in size.
// Real violation reports are a couple of hundred bytes. Rejected before parsing, so an
// unauthenticated caller cannot make the route materialise a large JSON payload.
const MAX_BODY_BYTES = 16 * 1024;
const MAX_ENTRIES = 10;

export async function POST(req: NextRequest) {
  if (Number(req.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) {
    return new NextResponse(null, { status: 204 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  // Two wire formats exist: the legacy report-uri shape ({ "csp-report": {...} }) and the
  // Reporting API shape (an array of { type, body }). Normalise both, capping before the
  // map so a long array is never walked in full.
  const entries = Array.isArray(body)
    ? body.slice(0, MAX_ENTRIES).map((r: any) => r?.body).filter(Boolean)
    : [(body as any)?.['csp-report'] ?? body];

  for (const entry of entries) {
    const e = entry as Record<string, unknown>;
    console.warn(
      '[csp-report]',
      JSON.stringify({
        directive: str(e['effectiveDirective'] ?? e['effective-directive'] ?? e['violatedDirective']),
        blocked: str(e['blockedURL'] ?? e['blocked-uri']),
        document: str(e['documentURL'] ?? e['document-uri']),
        disposition: str(e['disposition']),
      }),
    );
  }

  // 204 so the browser never retries and never surfaces an error to the user.
  return new NextResponse(null, { status: 204 });
}

// Caps each field so a crafted report cannot flood the log drain.
function str(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  return v.slice(0, 300);
}
