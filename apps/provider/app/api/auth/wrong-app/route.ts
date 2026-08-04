import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@urban-assist/db/server';

export async function GET(request: NextRequest) {
  const db = getSupabaseServer();
  await db.auth.signOut();

  const loginUrl = request.nextUrl.clone();
  const redirect = loginUrl.searchParams.get('redirect');
  loginUrl.pathname = '/login';
  loginUrl.search = '';
  loginUrl.searchParams.set('error', 'wrong_app');
  // Keep the original destination so a re-login with the right account returns there.
  if (redirect) loginUrl.searchParams.set('redirect', redirect);
  return NextResponse.redirect(loginUrl);
}