import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export interface SessionMiddlewareOptions {
  isProtectedRoute: boolean;
  loginPath?: string;
  requireAdmin?: boolean;
  requireAal2?: boolean;
}

function copySessionCookies(source: NextResponse, target: NextResponse) {
  for (const cookie of source.cookies.getAll()) {
    target.cookies.set(cookie);
  }
  return target;
}

export async function updateSupabaseSession(
  request: NextRequest,
  options: SessionMiddlewareOptions,
) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-next-pathname', request.nextUrl.pathname);

  let response = NextResponse.next({ request: { headers: requestHeaders } });
  const db = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request: { headers: requestHeaders } });
          for (const { name, value, options: cookieOptions } of cookiesToSet) {
            response.cookies.set(name, value, cookieOptions);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await db.auth.getUser();

  if (!user && options.isProtectedRoute) {
    const loginUrl = request.nextUrl.clone();
    const requestedPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    loginUrl.pathname = options.loginPath ?? '/login';
    loginUrl.search = '';
    loginUrl.searchParams.set('redirect', requestedPath);
    return copySessionCookies(response, NextResponse.redirect(loginUrl));
  }

  if (user && options.isProtectedRoute && options.requireAdmin) {
    const { data: isAdmin, error } = await (db as any).rpc('is_admin_user', {
      user_id: user.id,
    });
    if (error || !isAdmin) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = options.loginPath ?? '/login';
      loginUrl.search = '';
      loginUrl.searchParams.set('error', 'admin_access_required');
      return copySessionCookies(response, NextResponse.redirect(loginUrl));
    }
  }

  if (user && options.isProtectedRoute && options.requireAal2) {
    const { data: assurance, error } = await db.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error || assurance.currentLevel !== 'aal2') {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = options.loginPath ?? '/login';
      loginUrl.search = '';
      loginUrl.searchParams.set('error', 'mfa_required');
      return copySessionCookies(response, NextResponse.redirect(loginUrl));
    }
  }

  return response;
}
