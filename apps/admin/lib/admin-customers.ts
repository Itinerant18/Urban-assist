import { requireAdminPermission } from './admin-auth';

/**
 * Suspend / restore customer access via shared RPC (admin_set_customer_blocked).
 */
export async function setCustomerBlocked(input: {
  customerId: string;
  blocked: boolean;
  reason: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const reason = input.reason.trim();
  if (input.blocked && reason.length < 3) {
    return { ok: false, error: 'Reason required (at least 3 characters).' };
  }

  const { db, user } = await requireAdminPermission('can_manage_users');
  const adminDb = db as any;

  const { error } = await adminDb.rpc('admin_set_customer_blocked', {
    p_customer_id: input.customerId,
    p_is_blocked: input.blocked,
    p_reason: reason,
    p_actor_user_id: user.id,
    p_ip_address: input.ipAddress ?? null,
    p_user_agent: input.userAgent ?? null,
  });

  if (error) {
    const msg = error.message ?? 'Suspend failed';
    if (msg.includes('customer_not_found')) return { ok: false, error: 'Customer not found.' };
    if (msg.includes('block_reason_required')) {
      return { ok: false, error: 'Reason required (at least 3 characters).' };
    }
    if (msg.includes('forbidden')) return { ok: false, error: 'Forbidden.' };
    return { ok: false, error: msg };
  }

  return { ok: true };
}

export { readCustomerListFilters, firstSearchParam } from './admin-customer-filters';
