// Shared env helpers — reads stay lazy so importing this module remains safe
// during builds that do not execute Supabase code.
function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function readPublicEnv() {
  const url = required('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anon = required(
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  return { url, anon };
}

export function readServerEnv() {
  const url = required('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL);
  const service = required('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY);
  return { url, service };
}

// Per-app auth cookie name so the three apps don't share one session on a
// common host (localhost ignores port — a provider login would otherwise be
// seen by the customer app). Returns undefined when NEXT_PUBLIC_APP_ID is
// unset so @supabase/ssr keeps its default cookie name.
export function authCookieName(): string | undefined {
  const appId = process.env.NEXT_PUBLIC_APP_ID;
  return appId ? `sb-${appId}-auth` : undefined;
}
