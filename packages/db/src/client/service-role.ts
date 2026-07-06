import { createClient } from '@supabase/supabase-js';
import { readServerEnv } from './env';

export function createServiceRole() {
  const { url, service } = readServerEnv();
  return createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
