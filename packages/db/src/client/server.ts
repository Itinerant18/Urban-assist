// Server-side Supabase clients.
//
// Use getSupabaseServer() in Next.js Server Components, Server Actions, and
// API Route Handlers — it reads the auth cookie automatically from next/headers.
//
// Use createServer(cookieStore) when you need to pass a custom cookie store
// (e.g. middleware).
//
// Use createServiceRole() for trusted server-only code that bypasses RLS
// (webhooks, matching engine, admin actions).

import { createServerClient } from '@supabase/ssr';
import { readPublicEnv } from './env';
import { cache } from 'react';

type CookieStore = {
  get: (name: string) => { value: string } | undefined;
  set?: (name: string, value: string, options: any) => void;
  remove?: (name: string, options: any) => void;
};

/**
 * Creates a Supabase client bound to the current request's auth cookie.
 * Reads cookies from a caller-supplied cookie store (e.g., from `next/headers`
 * in middleware or custom logic).
 */
export function createServer(cookies: CookieStore) {
  const { url, anon } = readPublicEnv();
  return createServerClient(url, anon, {
    cookies: {
      get(name: string) {
        return cookies.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        try {
          cookies.set?.(name, value, options);
        } catch {
          // Server components can't set cookies — ignore.
        }
      },
      remove(name: string, options: any) {
        try {
          cookies.set?.(name, '', { ...options, maxAge: 0 });
        } catch {
          /* noop */
        }
      },
    },
  });
}

/**
 * Convenience wrapper for Next.js Server Components, Server Actions, and
 * Route Handlers. Reads cookies automatically from `next/headers`.
 *
 * Drop-in replacement for the per-app `lib/supabase-server.ts` helper.
 *
 * @example
 * import { getSupabaseServer } from '@urban-assist/db/server';
 * const db = getSupabaseServer();
 * const { data: { user } } = await db.auth.getUser();
 */
export const getSupabaseServer = cache(() => {
  // Dynamically import cookies() so this file stays importable in non-Next
  // environments (e.g., edge functions, tests) — the error only surfaces at
  // call time if the Next.js runtime isn't present.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { cookies } = require('next/headers') as typeof import('next/headers');
  const store = cookies();
  return createServer({
    get: (name: string) => store.get(name),
    set: (name: string, value: string, options: any) => {
      try { store.set({ name, value, ...options }); } catch { /* noop */ }
    },
    remove: (name: string, options: any) => {
      try { store.set({ name, value: '', ...options, maxAge: 0 }); } catch { /* noop */ }
    },
  });
});


