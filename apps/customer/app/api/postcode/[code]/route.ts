import { NextResponse } from 'next/server';
import { lookupPostcode } from '@urban-assist/integrations/postcode';

export async function GET(_req: Request, { params }: { params: { code: string } }) {
  const result = await lookupPostcode(params.code);
  if (!result) return NextResponse.json({ error: 'invalid_postcode' }, { status: 404 });
  return NextResponse.json(result);
}
