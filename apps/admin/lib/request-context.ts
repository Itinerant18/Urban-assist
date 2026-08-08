import { getClientIp } from '@urban-assist/utils';

// Audit-log request metadata.
//
// Previously read `x-forwarded-for` and took the leftmost value. That header is client-set
// and proxies append to it, so the leftmost entry is attacker-controlled: an admin action
// could be recorded against any IP the caller chose, which is worse than recording none —
// a poisoned audit trail reads as evidence. getClientIp only accepts proxy headers we trust
// and returns null when there is none, which is what gets stored.
export function getRequestContext(request: Request) {
  return {
    ipAddress: getClientIp(request.headers),
    userAgent: request.headers.get('user-agent'),
  };
}
