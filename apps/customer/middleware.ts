import type { NextRequest } from 'next/server';
import { updateSupabaseSession } from '@urban-assist/db/middleware';

/**
 * Auth is required at the point of commitment, not at discovery (PRODUCT.md
 * principle 2). `/browse` and `/providers` are deliberately absent: every public
 * "Book now" CTA routes to them, so gating them put a login wall between the
 * visitor and the catalogue they came to look at.
 */
const PROTECTED_PREFIXES = [
  '/about',
  '/account',
  '/book',
  '/bookings',
  '/cart',
  '/help',
  '/messages',
  '/notifications',
  '/referrals',
  '/reviews',
  '/saved',
];

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isProtectedRoute =
    PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  return updateSupabaseSession(request, { isProtectedRoute });
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
