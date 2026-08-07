'use server';

import { createServiceRole } from '@urban-assist/db/server';
import { requireAdminPermission } from '@/lib/admin-auth';
import { aggregateDashboardStats } from '@/lib/aggregate-dashboard-stats';

// Dashboard Sync button. Previously the button fetched /api/cron/aggregate with no
// Authorization header, so it always hit that route's 401 branch — the button never
// worked. A server action authenticates as an admin (session + aal2 + permission)
// without putting CRON_SECRET anywhere the browser can see it.
export async function syncDashboardStats() {
  await requireAdminPermission('can_manage_bookings');
  await aggregateDashboardStats(createServiceRole());
}
