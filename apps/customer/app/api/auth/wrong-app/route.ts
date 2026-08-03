import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@urban-assist/db/server';

export async function GET(request: NextRequest) {
  const db = getSupabaseServer();
  await db.auth.signOut();

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/login';
  loginUrl.search = '';
  loginUrl.searchParams.set('error', 'wrong_app');
  return NextResponse.redirect(loginUrl);
}
