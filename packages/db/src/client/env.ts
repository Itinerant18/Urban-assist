// Shared env helpers — single source for SDK config, with friendly warnings
// when keys are missing so the app boots cleanly with placeholder env.

function warn(name: string) {
  if (typeof window === 'undefined') {
    // server boot warning, once
    if (!(global as any).__warned?.[name]) {
      (global as any).__warned = (global as any).__warned || {};
      (global as any).__warned[name] = true;
      // eslint-disable-next-line no-console
      console.warn(`[homeease] ${name} missing — add it to .env.local`);
    }
  } else if (!(window as any).__warned?.[name]) {
    (window as any).__warned = (window as any).__warned || {};
    (window as any).__warned[name] = true;
    // eslint-disable-next-line no-console
    console.warn(`[homeease] ${name} missing — add it to .env.local`);
  }
}

export function readPublicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  if (!url) warn('NEXT_PUBLIC_SUPABASE_URL');
  if (!anon) warn('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  return { url, anon };
}

export function readServerEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!url) warn('NEXT_PUBLIC_SUPABASE_URL');
  if (!service) warn('SUPABASE_SERVICE_ROLE_KEY');
  return { url, service };
}
