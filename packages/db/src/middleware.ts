import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { authCookieName, readPublicEnv } from './env';

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

export function getProtectedRedirectParams(
  pathname: string,
  searchParams: URLSearchParams,
): { requestedPath: string; flightMarker: string | null } {
  const requestedSearch = new URLSearchParams(searchParams);
  const flightMarker = requestedSearch.get('_rsc');
  requestedSearch.delete('_rsc');
  const query = requestedSearch.toString();

  return {
    requestedPath: query ? `${pathname}?${query}` : pathname,
    flightMarker,
  };
}


/**
 * Marks a response as never-cacheable by a shared cache.
 *
 * Belt-and-braces ahead of putting a CDN in front of these apps. A cache rule scoped
 * slightly too broadly at the edge would serve one signed-in customer's page to the next
 * visitor, which is the worst thing that can go wrong in this stack. An explicit
 * private/no-store on every authenticated response means a mis-scoped rule cannot do it --
 * the origin has said not to.
 *
 * Applied to redirects too, not just the pass-through response: a cached 307 to /login
 * would be served to users who are in fact signed in.
 */
export function markPrivate<T extends { headers: Headers }>(response: T): T {
  response.headers.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
  // Honoured by Cloudflare even when a page rule overrides Cache-Control.
  response.headers.set('CDN-Cache-Control', 'private, no-store');
  response.headers.set('Vary', 'Cookie');
  return response;
}

export async function updateSupabaseSession(
  request: NextRequest,
  options: SessionMiddlewareOptions,
) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-next-pathname', request.nextUrl.pathname);

  let response = NextResponse.next({ request: { headers: requestHeaders } });
  const { url, anon } = readPublicEnv();
  const name = authCookieName();
  const db = createServerClient(
    url,
    anon,
    {
      ...(name ? { cookieOptions: { name } } : {}),
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
    const { requestedPath, flightMarker } = getProtectedRedirectParams(
      request.nextUrl.pathname,
      request.nextUrl.searchParams,
    );
    loginUrl.pathname = options.loginPath ?? '/login';
    loginUrl.search = '';
    loginUrl.searchParams.set('redirect', requestedPath);
    if (flightMarker) loginUrl.searchParams.set('_rsc', flightMarker);
    return markPrivate(copySessionCookies(response, NextResponse.redirect(loginUrl)));
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
      return markPrivate(copySessionCookies(response, NextResponse.redirect(loginUrl)));
    }
  }

  if (user && options.isProtectedRoute && options.requireAal2) {
    const { data: assurance, error } = await db.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error || assurance.currentLevel !== 'aal2') {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = options.loginPath ?? '/login';
      loginUrl.search = '';
      loginUrl.searchParams.set('error', 'mfa_required');
      return markPrivate(copySessionCookies(response, NextResponse.redirect(loginUrl)));
    }
  }

  return options.isProtectedRoute ? markPrivate(response) : response;
}
