import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServer } from '@urban-assist/db/server';
import { setCached, providerLocKey, TTL } from '@urban-assist/integrations/redis';

const Schema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export async function POST(req: NextRequest) {
  const db = getSupabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { error } = await db
    .from('provider_location')
    .upsert({
      provider_id: user.id,
      lat: parsed.data.lat,
      lng: parsed.data.lng,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'provider_id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Update Redis high-frequency cache to bypass DB in match cascade
  try {
    await setCached(
      providerLocKey(user.id),
      { lat: parsed.data.lat, lng: parsed.data.lng },
      TTL.PROVIDER_LOC
    );
  } catch (redisErr) {
    // Fail silently so location update still succeeds even if Redis is down
    console.error('Failed to update provider location in Redis:', redisErr);
  }

  return NextResponse.json({ ok: true });
}
