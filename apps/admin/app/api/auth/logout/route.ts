import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@urban-assist/db/server';

export async function POST(req: NextRequest) {
  const db = getSupabaseServer();
  await db.auth.signOut();
  return NextResponse.redirect(new URL('/login', req.nextUrl.origin));
}
