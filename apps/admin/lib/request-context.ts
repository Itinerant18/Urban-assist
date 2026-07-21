import { isIP } from 'node:net';

export function getRequestContext(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const direct = request.headers.get('x-real-ip')?.trim();
  const candidate = forwarded || direct || null;

  return {
    ipAddress: candidate && isIP(candidate) ? candidate : null,
    userAgent: request.headers.get('user-agent'),
  };
}

