import * as React from 'react';
import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@urban-assist/db/server';
import { ReferralClient } from './referral-client';

export const dynamic = 'force-dynamic';

export default async function ReferralDashboardPage() {
  const db = getSupabaseServer();

  // 1. Authenticate user
  const { data: { user: authUser } } = await db.auth.getUser();
  if (!authUser) {
    redirect('/login');
  }

  // 2. Get-or-create the caller's persistent code via the service-role route
  // (referrals is SELECT-only under RLS, so client/server inserts silently fail).
  const appBase = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  let referralCode = '';
  try {
    const res = await fetch(`${appBase}/api/referrals/code`, { method: 'POST', cache: 'no-store' });
    if (res.ok) {
      const j = await res.json().catch(() => ({}));
      if (typeof j.code === 'string') referralCode = j.code;
    }
  } catch {
    referralCode = '';
  }

  // 3. Fetch referral history ledger
  const { data: history } = await db
    .from('referrals')
    .select('*, friend:profiles!referrals_redeemed_by_fkey(full_name, email)')
    .eq('owner_id', authUser.id)
    .not('redeemed_by', 'is', null)
    .order('created_at', { ascending: false });

  const formattedHistory = (history || []).map((row: any) => {
    return {
      id: row.id,
      email: row.friend?.email || 'Invited Friend',
      name: row.friend?.full_name || 'Invited Friend',
      status: (row.credited_at ? 'Booked' : 'Pending') as 'Booked' | 'Pending',
      reward: row.credited_at ? `+ £${(row.credit_pence / 100).toFixed(2)}` : '--',
    };
  });

  return (
    <ReferralClient
      referralCode={referralCode}
      history={formattedHistory}
    />
  );
}
