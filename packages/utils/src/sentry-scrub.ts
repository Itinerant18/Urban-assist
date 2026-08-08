// Shared Sentry scrubbing for all three apps.
//
// Lives in one place on purpose: this is the only thing standing between an error report
// and a customer's home address, a provider's KYC document, or a Stripe secret. Three
// copies would drift, and the drift would be invisible until something leaked.
//
// Sentry's own `sendDefaultPii: false` is not enough here — it stops the SDK volunteering
// IPs and cookies, but says nothing about values this app puts in URLs, breadcrumbs, or
// error messages.

// Matched case-insensitively against header names, query keys, form keys and context keys.
const SENSITIVE_KEY = new RegExp(
  [
    'authorization',
    'cookie',
    'api[-_]?key',
    'secret',
    'token', // access_token, refresh_token, CRON_SECRET-ish bearer values, FCM tokens
    'password',
    'otp',
    'start[-_]?code', // booking_start_codes: the code a provider types to start a job
    'client[-_]?secret', // Stripe PaymentIntent client secrets
    'signature', // stripe-signature
    'phone',
    'email',
    'postcode',
    'address',
    'lat',
    'lng',
    'full[-_]?name',
    'utr', // provider tax reference
    'dob',
    'date[-_]?of[-_]?birth',
  ].join('|'),
  'i',
);

const REDACTED = '[redacted]';

// JWTs (Supabase access tokens), Stripe keys/secrets, and UK-shaped phone numbers, in case
// one is embedded in a free-text error message rather than a structured field.
const VALUE_PATTERNS: Array<[RegExp, string]> = [
  [/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, '[jwt]'],
  [/\b(sk|rk|pk)_(live|test)_[A-Za-z0-9]{10,}\b/g, '[stripe-key]'],
  [/\bpi_[A-Za-z0-9]{6,}_secret_[A-Za-z0-9]{6,}\b/g, '[stripe-client-secret]'],
  [/\bwhsec_[A-Za-z0-9]{10,}\b/g, '[stripe-webhook-secret]'],
  [/\b(?:\+?44|0)7\d{9}\b/g, '[phone]'],
];

export function scrubString(input: string): string {
  let out = input;
  for (const [pattern, replacement] of VALUE_PATTERNS) out = out.replace(pattern, replacement);
  return out;
}

// Depth-limited so a cyclic or enormous event object cannot hang the SDK's beforeSend.
function scrubValue(value: unknown, depth: number): unknown {
  if (depth > 6) return value;
  if (typeof value === 'string') return scrubString(value);
  if (Array.isArray(value)) return value.map((v) => scrubValue(v, depth + 1));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEY.test(k) ? REDACTED : scrubValue(v, depth + 1);
    }
    return out;
  }
  return value;
}

// Strips the query string entirely rather than trying to keep "safe" params: booking ids,
// postcodes and signed-URL tokens all travel there.
function scrubUrl(url: string): string {
  const q = url.indexOf('?');
  return q === -1 ? scrubString(url) : `${scrubString(url.slice(0, q))}?${REDACTED}`;
}

/**
 * beforeSend / beforeSendTransaction hook. Typed loosely so this module does not need to
 * depend on @sentry/nextjs — it is imported by config files in three apps and by nothing
 * that should pull the SDK in.
 */
export function scrubSentryEvent<T extends Record<string, any>>(event: T): T {
  const e = event as Record<string, any>;

  if (e.request) {
    if (typeof e.request.url === 'string') e.request.url = scrubUrl(e.request.url);
    delete e.request.cookies;
    delete e.request.data; // request bodies: card details, KYC uploads, message text
    if (e.request.query_string) e.request.query_string = REDACTED;
    if (e.request.headers) e.request.headers = scrubValue(e.request.headers, 0);
  }

  // Identify users by id only. Email/username/ip_address would tie a real person to the
  // report, and none of it is needed to debug.
  if (e.user) e.user = { id: e.user.id };

  if (e.breadcrumbs) {
    e.breadcrumbs = e.breadcrumbs.map((b: any) => ({
      ...b,
      message: typeof b?.message === 'string' ? scrubString(b.message) : b?.message,
      data: b?.data ? scrubValue(b.data, 0) : b?.data,
    }));
  }

  if (e.extra) e.extra = scrubValue(e.extra, 0);
  if (e.contexts) e.contexts = scrubValue(e.contexts, 0);
  if (e.tags) e.tags = scrubValue(e.tags, 0);

  if (e.message) e.message = scrubString(e.message);
  if (e.logentry) e.logentry = scrubValue(e.logentry, 0);

  // The host machine's name. Useful on a fleet, but on a laptop it is often a person's
  // name, and Vercel gives no useful value here anyway.
  delete e.server_name;

  if (e.exception?.values) {
    e.exception.values = e.exception.values.map(scrubExceptionValue);
  }
  // Same frame shape, reached on Node crashes.
  if (e.threads?.values) {
    e.threads.values = e.threads.values.map(scrubExceptionValue);
  }

  return event;
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

// Stack frames are the one place runtime *values* travel, via the LocalVariablesAsync
// integration — enabled by default in @sentry/node, and confirmed present in a real
// envelope. `vars` holds the locals of a crashed frame, which in this codebase means
// things like the booking object, an address, or a Stripe client secret. Nothing else in
// beforeSend reached them.
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

export const SENTRY_DENY_URLS = [
  /extensions\//i,
  /^chrome:\/\//i,
  /^chrome-extension:\/\//i,
  /^moz-extension:\/\//i,
];
