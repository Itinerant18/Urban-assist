import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { createServiceRole } from '@urban-assist/db/server';
import { aggregateDashboardStats } from '@/lib/aggregate-dashboard-stats';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return handleAggregation(req);
}

export async function POST(req: NextRequest) {
  return handleAggregation(req);
}

// Scheduler entrypoint only — authenticated by the shared CRON_SECRET. The admin
// Sync button no longer calls this; it uses the server action in (app)/actions.ts,
// which authenticates as an admin so no shared secret has to reach the browser.
async function handleAggregation(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'cron_not_configured' }, { status: 503 });
  }
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const stats = await aggregateDashboardStats(createServiceRole());
    return NextResponse.json({ ok: true, stats });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
