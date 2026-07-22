import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@urban-assist/db/server';
import type { Json } from '@urban-assist/db';
import { AccountClient, type AccountPromo } from './account-client';

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const db = getSupabaseServer();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect('/login');

  const now = new Date().toISOString();
  const [profileResult, promoResult, bookingResult, walletResult] = await Promise.all([
    db.from('profiles').select('notification_prefs').eq('id', user.id).single(),
    db
      .from('promo_codes')
      .select('id,code,discount_type,discount_value,expires_at,max_redemptions,redemption_count'),
    db
      .from('bookings')
      .select('promo_code_id,promo:promo_codes(id,code,discount_type,discount_value,expires_at)')
      .eq('customer_id', user.id)
      .not('promo_code_id', 'is', null),
    db.rpc('wallet_balance', { p_profile_id: user.id }),
  ]);

  const redeemed = new Map<string, AccountPromo>();
  for (const booking of bookingResult.data ?? []) {
    const promo = Array.isArray(booking.promo) ? booking.promo[0] : booking.promo;
    if (!promo) continue;
    redeemed.set(promo.id, { ...promo, status: 'redeemed' });
  }
  const available: AccountPromo[] = (promoResult.data ?? [])
    .filter(
      (promo) =>
        !redeemed.has(promo.id) &&
        (!promo.expires_at || promo.expires_at > now) &&
        (promo.max_redemptions == null || promo.redemption_count < promo.max_redemptions),
    )
    .map(({ max_redemptions: _max, redemption_count: _count, ...promo }) => ({
      ...promo,
      status: 'available' as const,
    }));

  return (
    <AccountClient
      initialNotificationPrefs={notificationPrefs(profileResult.data?.notification_prefs)}
      promos={[...redeemed.values(), ...available]}
      walletBalancePence={walletResult.data ?? 0}
    />
  );
}

function notificationPrefs(value: Json | undefined): Record<string, boolean> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, boolean] => typeof entry[1] === 'boolean'),
  );
}
