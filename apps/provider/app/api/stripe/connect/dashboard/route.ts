import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@urban-assist/db/server';
import { createDashboardLoginLink } from '@urban-assist/integrations/stripe';

export async function POST(req: NextRequest) {
  const { data: { user } } = await getSupabaseServer().auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const result = await createDashboardLoginLink(getSupabaseServer(), user.id);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'failed_to_create_dashboard_link' }, { status: 400 });
  }
}

