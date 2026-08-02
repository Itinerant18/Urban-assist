import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServer } from '@urban-assist/db/server';
import { createServiceRole } from '@urban-assist/db/server';
import { respondToOffer, track } from '@urban-assist/domain';
import { offerRespondRateLimit } from '@urban-assist/integrations/redis';

const Schema = z.object({
  accept: z.boolean(),
  decline_reason: z.string().max(200).optional().nullable(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { data: { user } } = await getSupabaseServer().auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const rl = offerRespondRateLimit();
  if (rl) {
    const { success } = await rl.limit(user.id);
    if (!success) return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  }

  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const admin = createServiceRole();
  try {
    const result = await respondToOffer(admin, {
      offerId: params.id,
      providerId: user.id,
      accept: parsed.data.accept,
      declineReason: parsed.data.decline_reason ?? undefined,
    });
    track(admin, user.id, {
      type: parsed.data.accept ? 'offer.accepted' : 'offer.declined',
      payload: { booking_id: result.bookingId, provider_id: user.id },
    });
    return NextResponse.json(result);
  } catch (e: any) {
    const message = e.message ?? 'failed';
    if (parsed.data.accept && /training|Complete /i.test(message)) {
      // Best-effort instrumentation for blocked accepts.
      const { data: offerRow } = await admin
        .from('booking_offers')
        .select('booking_id, bookings(category_id)')
        .eq('id', params.id)
        .maybeSingle();
      const booking = Array.isArray(offerRow?.bookings)
        ? offerRow?.bookings[0]
        : offerRow?.bookings;
      track(admin, user.id, {
        type: 'offer.blocked_training',
        payload: {
          booking_id: offerRow?.booking_id ?? params.id,
          provider_id: user.id,
          category_id: booking?.category_id ?? null,
          // Filter-time skips report 'candidate_filter'; reaching here means the
          // offer predated an eligibility change and was blocked at accept.
          stage: 'accept',
        },
      });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
