import type { NextRequest } from 'next/server';
import { updateSupabaseSession } from '@urban-assist/db/middleware';

const PROTECTED_PREFIXES = [
  '/about',
  '/account',
  '/book',
  '/bookings',
  '/browse',
  '/cart',
  '/help',
  '/messages',
  '/notifications',
  '/providers',
  '/referrals',
  '/reviews',
  '/saved',
];

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isProtectedRoute =
    pathname === '/' ||
    PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  return updateSupabaseSession(request, { isProtectedRoute });
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
