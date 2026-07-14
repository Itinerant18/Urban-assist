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

  // 2. Fetch or create the user's referral code
  let { data: refCodeObj } = await db
    .from('referrals')
    .select('code')
    .eq('owner_id', authUser.id)
    .is('redeemed_by', null) // owner code template row has redeemed_by as null
    .maybeSingle();

  if (!refCodeObj) {
    // Generate a new code
    const { data: profile } = await db.from('profiles').select('full_name').eq('id', authUser.id).single();
    const cleanName = profile?.full_name?.replace(/\s/g, '').slice(0, 4).toUpperCase() || 'REF';
    const code = `URBAN10${cleanName}${Math.floor(1000 + Math.random() * 9000)}`;

    const { data: newRef } = await db
      .from('referrals')
      .insert({
        owner_id: authUser.id,
        code,
        credit_pence: 1000, // £10
      })
      .select('code')
      .single();
    
    refCodeObj = newRef;
  }

  const referralCode = refCodeObj?.code || `URBAN10${authUser.id.slice(0, 4).toUpperCase()}`;

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
      status: (row.redeemed_at ? 'Booked' : 'Pending') as 'Booked' | 'Pending',
      reward: row.redeemed_at ? `+ £${(row.credit_pence / 100).toFixed(2)}` : '--',
    };
  });

  return (
    <ReferralClient
      referralCode={referralCode}
      history={formattedHistory}
    />
  );
}
