'use server';

import * as Sentry from '@sentry/nextjs';
import { createServiceRole } from '@urban-assist/db/server';
import { requireAdminPermission } from '@/lib/admin-auth';
import { aggregateDashboardStats } from '@/lib/aggregate-dashboard-stats';

// Dashboard Sync button. Previously the button fetched /api/cron/aggregate with no
// Authorization header, so it always hit that route's 401 branch — the button never
// worked. A server action authenticates as an admin (session + aal2 + permission)
// without putting CRON_SECRET anywhere the browser can see it.
// Returns a result rather than throwing: Next replaces server-action error messages with
// an opaque digest in production builds, so the client could never read a thrown
// 'mfa_required' and always showed a generic failure.
export async function syncDashboardStats(): Promise<{ ok: true } | { ok: false; reason: string }> {
  try {
    await requireAdminPermission('can_manage_bookings');
  } catch (e: any) {
    return { ok: false, reason: e?.message === 'mfa_required' ? 'mfa_required' : 'forbidden' };
  }
  try {
    await aggregateDashboardStats(createServiceRole());
  } catch (e: any) {
    // Server Action bodies are not wrapped by withSentryConfig's instrumentation and
    // Next 14 has no onRequestError, so an unreported throw here would be invisible.
    Sentry.captureException(e);
    console.error('[admin] dashboard sync failed', e);
    return { ok: false, reason: 'sync_failed' };
  }
  return { ok: true };
}
