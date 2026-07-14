import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer, createServiceRole } from '@urban-assist/db/server';
import { stripe } from '@urban-assist/integrations/stripe';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const db = getSupabaseServer();

  // 1. Authenticate user
  const { data: { user } } = await db.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // 2. Check admin permissions for payments
  const { data: perms } = await db
    .from('admin_permissions')
    .select('can_manage_payments')
    .eq('profile_id', user.id)
    .single();

  if (!perms || !perms.can_manage_payments) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { providerId, batch } = body;

    const admin = createServiceRole();

    if (batch) {
      // BATCH PAY ALL PENDING
      // Query all pending payouts
      const { data: pendingPayouts, error: fetchErr } = await admin
        .from('payouts')
        .select('id, provider_id, amount_pence')
        .eq('status', 'pending');

      if (fetchErr) throw fetchErr;
      if (!pendingPayouts || pendingPayouts.length === 0) {
        return NextResponse.json({ success: true, message: 'No pending payouts to process.' });
      }

      // Group payouts by provider_id
      const payoutsByProvider: Record<string, { ids: string[]; total: number }> = {};
      for (const p of pendingPayouts) {
        if (!payoutsByProvider[p.provider_id]) {
          payoutsByProvider[p.provider_id] = { ids: [], total: 0 };
        }
        payoutsByProvider[p.provider_id].ids.push(p.id);
        payoutsByProvider[p.provider_id].total += p.amount_pence;
      }

      const results = [];

      for (const provider_id of Object.keys(payoutsByProvider)) {
        const { ids, total } = payoutsByProvider[provider_id];

        // Fetch provider's Stripe Connect Account ID
        const { data: profile, error: profErr } = await admin
          .from('profiles')
          .select('stripe_account_id')
          .eq('id', provider_id)
          .single();

        if (profErr || !profile?.stripe_account_id) {
          console.error(`Provider ${provider_id} lacks Stripe Account ID.`);
          continue;
        }

        // Execute Stripe Connect transfer
        const transfer = await stripe().transfers.create({
          amount: total,
          currency: 'gbp',
          destination: profile.stripe_account_id,
        });

        // Update database payouts status to paid
        const { error: updateErr } = await admin
          .from('payouts')
          .update({ status: 'paid', stripe_transfer_id: transfer.id })
          .in('id', ids);

        if (updateErr) throw updateErr;

        // Insert audit log
        await admin.from('audit_log').insert({
          actor_id: user.id,
          action: 'payout.dispatched_batch',
          entity_type: 'payout',
          entity_id: provider_id as any,
          old_data: { ids, status: 'pending' } as any,
          new_data: { stripe_transfer_id: transfer.id, status: 'paid', amount_pence: total } as any,
        });

        results.push({ provider_id, amount_pence: total, transfer_id: transfer.id });
      }

      return NextResponse.json({ success: true, processed: results });
    } else if (providerId) {
      // SINGLE PROVIDER PAYOUT
      const { data: pendingPayouts, error: fetchErr } = await admin
        .from('payouts')
        .select('id, amount_pence')
        .eq('provider_id', providerId)
        .eq('status', 'pending');

      if (fetchErr) throw fetchErr;
      if (!pendingPayouts || pendingPayouts.length === 0) {
        return NextResponse.json({ error: 'No pending payouts found for this provider.' }, { status: 400 });
      }

      const total = pendingPayouts.reduce((sum, p) => sum + p.amount_pence, 0);
      const ids = pendingPayouts.map((p) => p.id);

      // Fetch provider's Stripe Connect Account ID
      const { data: profile, error: profErr } = await admin
        .from('profiles')
        .select('stripe_account_id')
        .eq('id', providerId)
        .single();

      if (profErr || !profile?.stripe_account_id) {
        return NextResponse.json({ error: 'Provider does not have a Stripe Connect account connected.' }, { status: 400 });
      }

      // Execute Stripe Connect transfer
      const transfer = await stripe().transfers.create({
        amount: total,
        currency: 'gbp',
        destination: profile.stripe_account_id,
      });

      // Update database payouts status to paid
      const { error: updateErr } = await admin
        .from('payouts')
        .update({ status: 'paid', stripe_transfer_id: transfer.id })
        .in('id', ids);

      if (updateErr) throw updateErr;

      // Insert audit log
      await admin.from('audit_log').insert({
        actor_id: user.id,
        action: 'payout.dispatched',
        entity_type: 'payout',
        entity_id: providerId,
        old_data: { ids, status: 'pending' } as any,
        new_data: { stripe_transfer_id: transfer.id, status: 'paid', amount_pence: total } as any,
      });

      return NextResponse.json({ success: true, amount_pence: total, transfer_id: transfer.id });
    } else {
      return NextResponse.json({ error: 'Missing parameters.' }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Internal Server Error' }, { status: 500 });
  }
}
