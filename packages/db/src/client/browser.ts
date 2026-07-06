// Browser Supabase client (used in Client Components).
//
// Use getSupabaseBrowser() for a memoised singleton — safe to call repeatedly.
// Use createBrowser() when you need a fresh instance (rare).

import { createBrowserClient } from '@supabase/ssr';
import { readPublicEnv } from './env';

/** Creates a new Supabase browser client instance. */
export function createBrowser() {
  const { url, anon } = readPublicEnv();
  return createBrowserClient(url, anon);
}

/**
 * Returns a memoised Supabase browser client singleton.
 * Safe to call from any Client Component without creating multiple connections.
 *
 * Drop-in replacement for the per-app `lib/supabase-browser.ts` helper.
 *
 * @example
 * import { getSupabaseBrowser } from '@urban-assist/db/browser';
 * const db = getSupabaseBrowser();
 * const { data, error } = await db.from('profiles').select('*');
 */
let _client: ReturnType<typeof createBrowser> | null = null;
export function getSupabaseBrowser() {
  if (!_client) _client = createBrowser();
  return _client;
}

