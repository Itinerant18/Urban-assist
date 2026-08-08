// Trustworthy client IP, for rate limiting and audit logs.
//
// The rule: NEVER trust a header the client can set. `X-Forwarded-For` is the obvious trap —
// proxies APPEND to it, so its leftmost value (the one everybody reaches for) is exactly the
// attacker-controlled part. apps/customer/app/api/auth/start/route.ts keyed the OTP send
// limiter on the raw header, so varying it gave a fresh Redis bucket per request and the
// 5-per-15-minutes cap did nothing.
//
// `cf-connecting-ip` is the subtler trap, and the reason this file has a feature flag.
// Cloudflare overwrites that header, so it is trustworthy — but ONLY for traffic that
// actually came through Cloudflare. While the Vercel deployment URLs stay publicly
// reachable, anyone can skip Cloudflare and send whatever `cf-connecting-ip` they like.
// Trusting it unconditionally would therefore reintroduce the very bypass this module
// exists to close, under a different header name.
//
// So the default order is platform-set headers only. Cloudflare's header is consulted first
// ONLY when TRUST_CLOUDFLARE_CLIENT_IP is enabled, which should be switched on in the same
// change that locks the origin (Cloudflare Authenticated Origin Pulls, Vercel deployment
// protection, or a Cloudflare-set secret header verified at the edge of our app). Until
// then the platform headers are both correct and unspoofable.
//
// Regex-validated rather than using node:net's isIP so this stays importable from edge
// runtime code as well as Node route handlers.

// Set by Vercel's proxy, not forwardable by the client.
const PLATFORM_HEADERS = ['x-vercel-forwarded-for', 'x-real-ip'] as const;
const CLOUDFLARE_HEADER = 'cf-connecting-ip';

/**
 * Whether Cloudflare's client-IP header may be trusted. Off unless explicitly enabled,
 * because it is only meaningful once the origin cannot be reached directly.
 */
export function trustsCloudflareClientIp(): boolean {
  const v = process.env.TRUST_CLOUDFLARE_CLIENT_IP;
  return v === '1' || v?.toLowerCase() === 'true';
}

const IPV4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

// Real IPv6 shape: at most 8 groups of 1-4 hex digits, at most one '::'. The previous
// permissive version accepted '::::', 'deadbeefcafebabe::1' and ten-group addresses, which
// then reached a Postgres `inet` column in the admin audit path and raised 22P02.
function isIpv6(value: string): boolean {
  const halves = value.split('::');
  if (halves.length > 2) return false;

  const groupsOf = (part: string) => (part === '' ? [] : part.split(':'));
  const groups = [...groupsOf(halves[0]!), ...groupsOf(halves[1] ?? '')];
  if (groups.some((g) => !/^[0-9a-f]{1,4}$/i.test(g))) return false;

  return halves.length === 2 ? groups.length <= 7 : groups.length === 8;
}

function isIpish(value: string): boolean {
  return IPV4.test(value) || isIpv6(value);
}

/**
 * Canonicalises so one client cannot occupy two rate-limit buckets:
 *  - strips IPv6 brackets and an IPv4 port
 *  - drops an IPv6 zone index (fe80::1%eth0), which Postgres `inet` rejects
 *  - unwraps IPv4-mapped IPv6 (::ffff:1.2.3.4 -> 1.2.3.4), which the old version rejected
 *    outright because its character class excluded '.'
 *  - lowercases, so 2001:DB8::1 and 2001:db8::1 are one key
 */
function normalise(raw: string): string {
  let v = raw.trim().toLowerCase();

  if (v.startsWith('[')) {
    const close = v.indexOf(']');
    if (close !== -1) v = v.slice(1, close);
  }

  // Only strip a trailing :port for IPv4 — a bare IPv6 address is full of colons.
  if ((v.match(/:/g) ?? []).length === 1) v = v.split(':')[0]!;

  const zone = v.indexOf('%');
  if (zone !== -1) v = v.slice(0, zone);

  const mapped = v.match(/^::ffff:(.+)$/);
  if (mapped && IPV4.test(mapped[1]!)) return mapped[1]!;

  return v;
}

function firstValid(headers: Headers, name: string): string | null {
  const raw = headers.get(name);
  if (!raw) return null;
  // These headers are not client-settable, so the first entry is the one the platform
  // determined.
  const first = raw.split(',')[0];
  if (!first) return null;
  const candidate = normalise(first);
  return isIpish(candidate) ? candidate : null;
}

/**
 * Returns the client IP from a header we actually trust, or null.
 *
 * Null is a meaningful answer — local development has none of these headers. Callers decide
 * what to do rather than substituting a constant, because a shared constant means a shared
 * rate-limit bucket.
 */
export function getClientIp(headers: Headers): string | null {
  if (trustsCloudflareClientIp()) {
    // Deliberately no fallthrough to the platform headers here: once Cloudflare is in front,
    // x-real-ip and x-vercel-forwarded-for hold the CLOUDFLARE EDGE address, so falling back
    // would put every user behind a colo into one shared rate-limit bucket.
    return firstValid(headers, CLOUDFLARE_HEADER);
  }

  for (const name of PLATFORM_HEADERS) {
    const ip = firstValid(headers, name);
    if (ip) return ip;
  }
  return null;
}

/**
 * Rate-limit key for a request. Falls back to a caller-supplied identifier (a phone number,
 * a user id) when no trusted IP is available, and only then to a shared bucket.
 *
 * A shared bucket is the fail-CLOSED direction: everyone without a trusted IP competes for
 * one allowance. Deliberately inconvenient rather than silently unlimited, which is what
 * keying on a spoofable header amounted to.
 */
export function rateLimitKey(headers: Headers, fallback?: string | null): string {
  const ip = getClientIp(headers);
  if (ip) return `ip:${ip}`;
  if (fallback) return `id:${fallback}`;
  return 'shared:no-trusted-ip';
}
