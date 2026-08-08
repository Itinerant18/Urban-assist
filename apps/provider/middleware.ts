import type { NextRequest } from 'next/server';
import { updateSupabaseSession } from '@urban-assist/db/middleware';

export function middleware(request: NextRequest) {
  return updateSupabaseSession(request, {
    isProtectedRoute: request.nextUrl.pathname !== '/login',
  });
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
