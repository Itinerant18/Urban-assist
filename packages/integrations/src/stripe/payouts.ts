import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProviderPayoutReleaseResult } from '@urban-assist/types';
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

/** Throws if the Express account cannot receive transfers yet. */
export async function assertConnectPayoutReady(stripeAccountId: string): Promise<void> {
  const account = await stripe().accounts.retrieve(stripeAccountId);
  if (!account.details_submitted) {
    throw new Error('Connect onboarding incomplete — provider must finish Stripe setup');
  }
  if (!account.payouts_enabled) {
    throw new Error('Connect payouts not enabled on this account yet');
  }
}

interface BookingPayoutClaim {
  payout_id: string;
  provider_id: string;
  amount_pence: number;
  stripe_account_id: string;
  claim_state: 'claimed' | 'processing' | 'paid';
}

export async function releaseProviderEarnings(
  db: SupabaseClient,
  providerId: string,
): Promise<ProviderPayoutReleaseResult> {
  const { data: profile, error: profileError } = await db
    .from('profiles')
    .select('stripe_account_id')
    .eq('id', providerId)
    .single();
  if (profileError) throw profileError;
  if (!profile?.stripe_account_id) {
    return { released: 0, processing: 0, alreadyPaid: 0, failed: 0, held: 0 };
  }

  await assertConnectPayoutReady(profile.stripe_account_id);

  const { data: bookings, error } = await db
    .from('bookings')
    .select('id')
    .eq('provider_id', providerId)
    .eq('status', 'completed')
    .order('completed_at', { ascending: true });
  if (error) throw error;

  let released = 0;
  let processing = 0;
  let alreadyPaid = 0;
  let failed = 0;
  let held = 0;

  for (const booking of bookings ?? []) {
    const { data, error: claimError } = await db.rpc('claim_booking_payout', {
      p_booking_id: booking.id,
    });
    if (claimError) {
      // A partial refund or open dispute blocks this booking (202608080004). Counted and
      // returned rather than swallowed, otherwise "Release all" reports a clean run and
      // the admin never learns a disputed booking was passed over.
      if ((claimError.message ?? '').includes('payout_on_hold')) held += 1;
      continue;
    }

    const claim = (data?.[0] ?? null) as BookingPayoutClaim | null;
    if (!claim || claim.provider_id !== providerId) continue;
    if (claim.claim_state === 'paid') {
      alreadyPaid += 1;
      continue;
    }
    if (claim.claim_state === 'processing') {
      processing += 1;
      continue;
    }

    try {
      const transfer = await stripe().transfers.create(
        {
          amount: claim.amount_pence,
          currency: 'gbp',
          destination: claim.stripe_account_id,
          metadata: { booking_id: booking.id, payout_id: claim.payout_id },
        },
        { idempotencyKey: `urban-assist:booking:${booking.id}:payout:v1` },
      );
      const { error: payoutError } = await db
        .from('payouts')
        .update({
          stripe_transfer_id: transfer.id,
          status: 'paid',
          updated_at: new Date().toISOString(),
          lease_expires_at: null,
          failure_reason: null,
        })
        .eq('id', claim.payout_id)
        .eq('status', 'pending');
      if (payoutError) throw payoutError;

      await db.from('notifications').insert({
        profile_id: providerId,
        type: 'payment.released',
        payload: {
          booking_id: booking.id,
          payout_id: claim.payout_id,
          amount_pence: claim.amount_pence,
        },
      });
      released += 1;
    } catch (releaseError) {
      const reason = releaseError instanceof Error ? releaseError.message : 'stripe_transfer_failed';
      await db
        .from('payouts')
        .update({
          status: 'failed',
          failure_reason: reason.slice(0, 500),
          updated_at: new Date().toISOString(),
          lease_expires_at: null,
        })
        .eq('id', claim.payout_id)
        .eq('status', 'pending');
      failed += 1;
    }
  }

  return { released, processing, alreadyPaid, failed, held };
}
