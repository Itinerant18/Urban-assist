// Provider registration — collects UK sole-trader details after phone auth.
// Sets registration_completed=true, which unlocks the dashboard (see (app)/layout.tsx guard).
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServer, createServiceRole } from '@urban-assist/db/server';
import { lookupPostcode } from '@urban-assist/integrations/postcode';
import { UK_POSTCODE_RE } from '@urban-assist/utils';

const NINO_RE = /^[A-CEGHJ-PR-TW-Z]{2}\d{6}[A-D]$/i;

function isAtLeast18(iso: string): boolean {
  const dob = new Date(iso);
  if (Number.isNaN(dob.getTime())) return false;
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 18);
  return dob <= cutoff;
}

const Schema = z.object({
  // Identity & contact
  full_name: z.string().trim().min(2),
  email: z.string().trim().email(),
  date_of_birth: z
    .string()
    .refine(isAtLeast18, { message: 'You must be at least 18 years old.' }),
  // Business
  business_name: z.string().trim().min(2),
  nino: z.string().trim().regex(NINO_RE, 'Invalid National Insurance number.'),
  utr_number: z
    .string()
    .trim()
    .regex(/^\d{10}$/, 'UTR must be exactly 10 digits.')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  years_experience: z.number().int().min(0).max(60),
  bio: z.string().trim().max(500),
  postcode: z.string().trim().regex(UK_POSTCODE_RE, 'Invalid UK postcode.'),
  travel_radius_miles: z.number().int().min(1).max(50),
  // Bank payout
  bank_account_holder_name: z.string().trim().min(2),
  bank_sort_code: z.string().regex(/^\d{6}$/, 'Sort code must be exactly 6 digits.'),
  bank_account_number: z.string().regex(/^\d{8}$/, 'Account number must be exactly 8 digits.'),
});

export async function POST(req: NextRequest) {
  const { data: { user } } = await getSupabaseServer().auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const body = parsed.data;

  // Geocode the operating postcode for the matching engine.
  const loc = await lookupPostcode(body.postcode);
  if (!loc) {
    return NextResponse.json(
      { error: 'Postcode not recognised — check and try again.' },
      { status: 400 },
    );
  }

  const admin = createServiceRole();

  const { error: profileErr } = await admin
    .from('profiles')
    .update({
      full_name: body.full_name,
      email: body.email,
      date_of_birth: body.date_of_birth,
      business_name: body.business_name,
      nino: body.nino.toUpperCase(),
      utr_number: body.utr_number ?? null,
      years_experience: body.years_experience,
      bio: body.bio || null,
      bank_account_holder_name: body.bank_account_holder_name,
      bank_sort_code: body.bank_sort_code,
      bank_account_number: body.bank_account_number,
      travel_radius_miles: body.travel_radius_miles,
      role: 'provider',
      registration_completed: true,
    })
    .eq('id', user.id);
  if (profileErr) {
    return NextResponse.json({ error: profileErr.message }, { status: 400 });
  }

  const { error: locErr } = await admin
    .from('provider_location')
    .upsert(
      { provider_id: user.id, lat: loc.lat, lng: loc.lng, updated_at: new Date().toISOString() },
      { onConflict: 'provider_id' },
    );
  if (locErr) {
    return NextResponse.json({ error: locErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
