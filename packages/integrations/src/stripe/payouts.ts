import type { SupabaseClient } from '@supabase/supabase-js';
import { stripe } from './client';

export interface PayoutOnboardingLink {
  url: string;
  expires_at: number;
}

export async function createDashboardLoginLink(
  db: SupabaseClient,
  userId: string,
): Promise<{ url: string }> {
  const { data: profile, error } = await db
    .from('profiles')
    .select('stripe_account_id')
    .eq('id', userId)
    .single();

  if (error || !profile?.stripe_account_id) {
    throw new Error('Stripe account not connected');
  }

  const link = await stripe().accounts.createLoginLink(profile.stripe_account_id);
  return { url: link.url };
}

export async function createPayoutOnboardingLink(
  db: SupabaseClient,
  providerId: string,
  returnUrl: string,
): Promise<PayoutOnboardingLink> {
  const { data: profile, error } = await db
    .from('profiles')
    .select('stripe_account_id, email')
    .eq('id', providerId)
    .single();

  if (error || !profile) {
    throw error ?? new Error('Provider profile not found');
  }

  let stripeAccountId = profile.stripe_account_id;

  if (!stripeAccountId) {
    const account = await stripe().accounts.create({
      type: 'express',
      country: 'GB',
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual',
      email: profile.email || undefined,
    });
    stripeAccountId = account.id;

    const { error: updateErr } = await db
      .from('profiles')
      .update({ stripe_account_id: stripeAccountId })
      .eq('id', providerId);

    if (updateErr) {
      throw updateErr;
    }
  }

  const link = await stripe().accountLinks.create({
    account: stripeAccountId,
    refresh_url: returnUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  });

  return {
    url: link.url,
    expires_at: link.expires_at,
  };
}

export async function transferToProvider(
  db: SupabaseClient,
  providerId: string,
  amountPence: number,
): Promise<{ id: string; status: 'paid' }> {
  const { data: profile, error } = await db
    .from('profiles')
    .select('stripe_account_id')
    .eq('id', providerId)
    .single();

  if (error || !profile?.stripe_account_id) {
    throw error ?? new Error('Provider does not have a Stripe Connect account connected');
  }

  const transfer = await stripe().transfers.create({
    amount: amountPence,
    currency: 'gbp',
    destination: profile.stripe_account_id,
  });

  const today = new Date().toISOString().split('T')[0];
  const { error: payoutErr } = await db.from('payouts').insert({
    provider_id: providerId,
    stripe_transfer_id: transfer.id,
    amount_pence: amountPence,
    period_start: today,
    period_end: today,
    status: 'paid',
  });

  if (payoutErr) {
    throw payoutErr;
  }

  return { id: transfer.id, status: 'paid' };
}
