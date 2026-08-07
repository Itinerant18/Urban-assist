import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceRole, getSupabaseServer } from '@urban-assist/db/server';
import { expireOfferIfStale } from '@urban-assist/domain/matching';

const IdSchema = z.string().uuid();

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const { data: { user } } = await getSupabaseServer().auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const id = IdSchema.safeParse(params.id);
  if (!id.success) return NextResponse.json({ error: id.error.flatten() }, { status: 400 });

  const admin = createServiceRole();
  try {
    // The offer must belong to the caller. Without this any authenticated provider
    // could expire a stranger's stale offer and force the dispatch cascade to move
    // on. The sibling PATCH route gets this via respondToOffer's provider_id check
    // (matching-engine.ts); this route had no equivalent.
    const { data: offer } = await admin
      .from('booking_offers')
      .select('provider_id')
      .eq('id', id.data)
      .maybeSingle();
    if (!offer) return NextResponse.json({ error: 'offer_not_found' }, { status: 404 });
    if (offer.provider_id !== user.id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const result = await expireOfferIfStale(admin, id.data);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'failed_to_expire_offer' }, { status: 400 });
  }
}
