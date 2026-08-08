// Shared Sentry scrubbing for all three apps.
//
// Lives in one place on purpose: this is the only thing standing between an error report
// and a customer's home address, a provider's bank details, or a Stripe secret. Three
// copies would drift, and the drift would be invisible until something leaked.
//
// Sentry's own `sendDefaultPii: false` is not enough here — it stops the SDK volunteering
// IPs and cookies, but says nothing about values this app puts in URLs, breadcrumbs, spans,
// or error messages.

// Long, distinctive tokens, matched as substrings so `customer_email` and
// `bank_sort_code` are both caught.
const SENSITIVE_SUBSTRING = new RegExp(
  [
    'authorization',
    'cookie',
    'api[-_]?key',
    'secret',
    'token', // access_token, refresh_token, FCM tokens
    'password',
    'passwd',
    'bearer',
    'start[-_]?code', // booking_start_codes: the code a provider types to start a job
    'client[-_]?secret', // Stripe PaymentIntent client secrets
    'signature', // stripe-signature
    'phone',
    'email',
    'post[-_]?code',
    'address',
    // addresses table columns — `address` alone does not match these, and a half-redacted
    // address that keeps the street and city reads as safe while being anything but.
    'line1',
    'line2',
    'full[-_]?name',
    'first[-_]?name',
    'last[-_]?name',
    // profiles table payout columns.
    'account[-_]?holder',
    'sort[-_]?code',
    'account[-_]?number',
    'iban',
    'national[-_]?insurance',
    'utr', // provider tax reference
    'date[-_]?of[-_]?birth',
  ].join('|'),
  'i',
);

// Short tokens, matched with boundaries. Unanchored, `lat` also matches `platform`,
// `template`, `latency` and `translated`, redacting away debugging value for nothing.
const SENSITIVE_EXACT = /(^|[^a-z0-9])(lat|lng|lon|dob|otp|nino|city|ip)($|[^a-z0-9])/i;

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_SUBSTRING.test(key) || SENSITIVE_EXACT.test(key);
}

// Keys whose value is a whole URL. The query string is where booking ids, postcodes and
// signed-URL tokens travel, so these are stripped rather than pattern-matched.
const URLISH_KEY = /^(url|to|from|referer|referrer|location|href|http\.url|url\.full)$/i;

// Keys whose value is ALREADY just a query string or fragment, so scrubUrl (which looks
// for a `?`) would pass it straight through. The SDK populates `http.query` on fetch/http
// spans and breadcrumbs from `parsedUrl.search`.
const QUERY_ONLY_KEY = /^(query|query_string|search|http\.query|http\.fragment|url\.query|url\.fragment)$/i;

const REDACTED = '[redacted]';

// Secrets and identifiers that can appear inside free text — a Postgres constraint
// violation quotes the offending value, and console breadcrumbs are flat strings.
const VALUE_PATTERNS: Array<[RegExp, string]> = [
  [/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, '[jwt]'],
  [/\b(sk|rk|pk)_(live|test)_[A-Za-z0-9]{10,}\b/g, '[stripe-key]'],
  [/\bpi_[A-Za-z0-9]{6,}_secret_[A-Za-z0-9]{6,}\b/g, '[stripe-client-secret]'],
  [/\bwhsec_[A-Za-z0-9]{10,}\b/g, '[stripe-webhook-secret]'],
  [/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[email]'],
  [/\b(?:\+?44|0)7\d{9}\b/g, '[phone]'],
  // UK postcode, outward+inward with optional space. Deliberately after the email pattern
  // so an address-shaped local part is not partially rewritten.
  [/\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b/gi, '[postcode]'],
];

export function scrubString(input: string): string {
  let out = input;
  for (const [pattern, replacement] of VALUE_PATTERNS) out = out.replace(pattern, replacement);
  return out;
}

// Strips the query string entirely rather than trying to keep "safe" params.
function scrubUrl(url: string): string {
  const q = url.indexOf('?');
  return q === -1 ? scrubString(url) : `${scrubString(url.slice(0, q))}?${REDACTED}`;
}

// Depth-limited so a cyclic or enormous object cannot hang beforeSend. Past the limit the
// value is REDACTED rather than returned: returning it would be fail-open, which is the
// wrong default for the one function whose job is to withhold data.
function scrubValue(value: unknown, depth: number): unknown {
  if (depth > 6) return REDACTED;
  if (typeof value === 'string') return scrubString(value);
  if (Array.isArray(value)) return value.map((v) => scrubValue(v, depth + 1));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (isSensitiveKey(k) || QUERY_ONLY_KEY.test(k)) {
        out[k] = REDACTED;
      } else if (URLISH_KEY.test(k) && typeof v === 'string') {
        out[k] = scrubUrl(v);
      } else {
        out[k] = scrubValue(v, depth + 1);
      }
    }
    return out;
  }
  return value;
}

/**
 * beforeSend / beforeSendTransaction hook. Typed loosely so this module does not need to
 * depend on @sentry/nextjs — it is imported by config files in three apps.
 *
 * Returns null if scrubbing itself fails. Dropping a report is strictly better than
 * sending an unscrubbed one, and relying on the SDK's internal error handling for this
 * would silently route the failure somewhere no one is looking.
 */
export function scrubSentryEvent<T extends Record<string, any>>(event: T): T | null {
  try {
    return scrubEventUnsafe(event);
  } catch {
    return null;
  }
}

function scrubEventUnsafe<T extends Record<string, any>>(event: T): T {
  const e = event as Record<string, any>;

  if (e.request) {
    if (typeof e.request.url === 'string') e.request.url = scrubUrl(e.request.url);
    delete e.request.cookies;
    delete e.request.data; // request bodies: card details, KYC uploads, message text
    if (e.request.query_string) e.request.query_string = REDACTED;
    // Headers include Referer, which carries the previous page's full URL.
    if (e.request.headers) e.request.headers = scrubValue(e.request.headers, 0);
  }

  // Identify users by id only. Email/username/ip_address would tie a real person to the
  // report, and none of it is needed to debug.
  if (e.user) e.user = { id: e.user.id };

  if (e.breadcrumbs) {
    // Breadcrumb `data` is where http/fetch/xhr/navigation crumbs keep their URLs, so it
    // goes through scrubValue's URL handling rather than plain string scrubbing.
    e.breadcrumbs = e.breadcrumbs.map((b: any) => ({
      ...b,
      message: typeof b?.message === 'string' ? scrubString(b.message) : b?.message,
      data: b?.data ? scrubValue(b.data, 0) : b?.data,
    }));
  }

  // Transaction events carry spans, and http client spans put the raw query string in
  // data['http.query'] (@sentry/core fetch.js, @sentry/node-core outgoingFetchRequest.js).
  // Without this branch beforeSendTransaction did nothing for the data that matters.
  if (Array.isArray(e.spans)) e.spans = e.spans.map(scrubSpanLike);

  if (e.extra) e.extra = scrubValue(e.extra, 0);
  if (e.contexts) e.contexts = scrubValue(e.contexts, 0);
  if (e.tags) e.tags = scrubValue(e.tags, 0);

  if (e.message) e.message = scrubString(e.message);
  if (e.logentry) e.logentry = scrubValue(e.logentry, 0);

  // The host machine's name. On a developer laptop that is often a person's name, and it
  // carries nothing useful on Vercel.
  delete e.server_name;

  if (e.exception?.values) e.exception.values = e.exception.values.map(scrubExceptionValue);
  // Same frame shape, reached on Node crashes.
  if (e.threads?.values) e.threads.values = e.threads.values.map(scrubExceptionValue);

  return event;
}

/** beforeSendSpan hook. Standalone spans (web vitals) never pass through beforeSend. */
export function scrubSentrySpan<T extends Record<string, any>>(span: T): T {
  try {
    return scrubSpanLike(span);
  } catch {
    return span;
  }
}

function scrubSpanLike(span: any): any {
  return {
    ...span,
    description: typeof span?.description === 'string' ? scrubUrl(span.description) : span?.description,
    name: typeof span?.name === 'string' ? scrubUrl(span.name) : span?.name,
    data: span?.data ? scrubValue(span.data, 0) : span?.data,
    attributes: span?.attributes ? scrubValue(span.attributes, 0) : span?.attributes,
  };
}

function scrubExceptionValue(v: any): any {
  const out = {
    ...v,
    value: typeof v?.value === 'string' ? scrubString(v.value) : v?.value,
  };
  if (out.stacktrace?.frames) {
    out.stacktrace = { ...out.stacktrace, frames: out.stacktrace.frames.map(scrubFrame) };
  }
  return out;
}

// Defensive coverage for frame-level data.
//
// `vars` holds the locals of a crashed frame, which in this codebase would mean a booking
// object, an address, or a request body containing bank details. NOTE: this branch does not
// fire today — localVariablesIntegration is in @sentry/node's default list but its setup
// returns early unless `includeLocalVariables` is true, and none of the configs set it. It
// is kept so that turning that option on is not silently a data-exfiltration change.
function scrubFrame(frame: any): any {
  const out = { ...frame };

  if (out.vars) out.vars = scrubValue(out.vars, 0);

  // Source context from the ContextLines integration. This is our own source code, which
  // Sentry already receives via source maps, so it is kept rather than dropped — but run
  // through the value patterns so a secret or phone number written as a literal in source
  // does not travel with it.
  if (typeof out.context_line === 'string') out.context_line = scrubString(out.context_line);
  if (Array.isArray(out.pre_context)) out.pre_context = out.pre_context.map(scrubStringish);
  if (Array.isArray(out.post_context)) out.post_context = out.post_context.map(scrubStringish);

  return out;
}

function scrubStringish(v: unknown): unknown {
  return typeof v === 'string' ? scrubString(v) : v;
}

/**
 * Reads a sample rate from an env var, falling back when it is unset, blank or unparseable.
 *
 * `Number(process.env.X ?? 0.1)` looks equivalent but is not: an env var that exists and is
 * empty (easy to create in a Vercel dashboard) coerces to 0, which silently disables tracing
 * with no error — the same shape of silent no-op as a missing Upstash URL.
 */
export function sentrySampleRate(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === '') return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 1) return fallback;
  return n;
}

// Noise that is not actionable: browser extensions, cancelled navigations, and the
// benign ResizeObserver warning.
export const SENTRY_IGNORE_ERRORS = [
  'ResizeObserver loop completed with undelivered notifications',
  'ResizeObserver loop limit exceeded',
  'Non-Error promise rejection captured',
  'AbortError',
  'NEXT_REDIRECT', // Next's control-flow throw for redirect(), not a fault
  'NEXT_NOT_FOUND',
];

export const SENTRY_DENY_URLS = [
  /extensions\//i,
  /^chrome:\/\//i,
  /^chrome-extension:\/\//i,
  /^moz-extension:\/\//i,
];
