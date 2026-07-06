import type { SupabaseClient } from '@supabase/supabase-js';

export async function registerToken(
  db: SupabaseClient,
  profileId: string,
  token: string,
  device?: string,
) {
  await db
    .from('fcm_tokens')
    .upsert({ token, profile_id: profileId, device: device ?? null }, { onConflict: 'token' });
}

export async function sendPush(
  db: SupabaseClient,
  profileId: string,
  notification: { title: string; body: string; data?: Record<string, string> },
): Promise<number> {
  const { data: tokens } = await db
    .from('fcm_tokens')
    .select('token')
    .eq('profile_id', profileId);
  if (!tokens?.length) return 0;

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccount) {
    console.warn(
      `[homeease] FCM service account missing — would push to ${tokens.length} tokens`,
      notification,
    );
    return tokens.length;
  }

  return tokens.length;
}
