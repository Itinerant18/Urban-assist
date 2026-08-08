// Trustworthy client IP, for rate limiting and audit logs.
//
// The rule: NEVER trust `X-Forwarded-For`. It is a request header, so a client sets it
// freely, and proxies APPEND rather than replace — so the leftmost value (the one everybody
// reaches for) is exactly the attacker-controlled part.
//
// That was not theoretical here. apps/customer/app/api/auth/start/route.ts keyed the OTP
// send limiter on the raw X-Forwarded-For string, so varying that header per request gave a
// fresh Redis bucket every time: the 5-per-15-minutes cap was bypassable, which means
// unmetered SMS spend and phone-number enumeration.
//
// Trusted sources, in order:
//   cf-connecting-ip        Cloudflare OVERWRITES this, so a client cannot forge it — but
//                           only while the origin is unreachable except through Cloudflare.
//   x-vercel-forwarded-for  set by Vercel's proxy, not forwardable by the client
//   x-real-ip               set by Vercel and most reverse proxies
//
// CAVEAT worth stating plainly: cf-connecting-ip is only as trustworthy as the origin lock.
// While the Vercel deployment URLs stay publicly reachable, someone can skip Cloudflare and
// send whatever cf-connecting-ip they like. Cloudflare Authenticated Origin Pulls, Vercel
// deployment protection, or a shared secret header checked in middleware closes that; until
// one is in place this is best-effort, not a security boundary.
//
// Regex-validated rather than using node:net's isIP, so this is safe to import from edge
// runtime code (middleware) as well as Node route handlers.

const IPV4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
// Deliberately permissive: this only has to reject junk, not fully validate every RFC 4291
// form.
const IPV6 = /^[0-9a-f:]+(:[0-9a-f]*)*(%[0-9a-z]+)?$/i;

function isIpish(value: string): boolean {
  if (IPV4.test(value)) return true;
  return value.includes(':') && IPV6.test(value);
}

// Strips an IPv4 port and IPv6 brackets, which some proxies add.
function normalise(raw: string): string {
  let v = raw.trim();
  if (v.startsWith('[')) {
    const close = v.indexOf(']');
    if (close !== -1) return v.slice(1, close);
  }
  // Only strip a trailing :port for IPv4 — a bare IPv6 address is full of colons.
  const colons = (v.match(/:/g) ?? []).length;
  if (colons === 1) v = v.split(':')[0]!;
  return v;
}

const TRUSTED_HEADERS = ['cf-connecting-ip', 'x-vercel-forwarded-for', 'x-real-ip'] as const;

/**
 * Returns the client IP from a proxy header we actually trust, or null.
 *
 * Null is a meaningful answer — local development has none of these headers. Callers decide
 * what to do rather than substituting a constant, because a shared constant means a shared
 * rate-limit bucket.
 */
export function getClientIp(headers: Headers): string | null {
  for (const name of TRUSTED_HEADERS) {
    const raw = headers.get(name);
    if (!raw) continue;
    // x-vercel-forwarded-for can be a list and its FIRST entry is the one Vercel determined;
    // the header is not client-settable, so index 0 is correct here.
    const first = raw.split(',')[0];
    if (!first) continue;
    const candidate = normalise(first);
    if (isIpish(candidate)) return candidate;
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
