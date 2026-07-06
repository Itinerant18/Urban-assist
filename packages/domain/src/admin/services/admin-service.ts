import type { SupabaseClient } from '@supabase/supabase-js';

async function requirePermission(db: SupabaseClient, perm: string): Promise<void> {
  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error('unauthorized');
  const { data: perms } = await db
    .from('admin_permissions')
    .select('*')
    .eq('profile_id', user.id)
    .single();
  if (!perms || !perms[perm]) throw new Error('forbidden');
}

export async function listBookings(db: SupabaseClient, limit = 50, offset = 0) {
  await requirePermission(db, 'can_manage_bookings');
  const { data, error, count } = await db
    .from('bookings')
    .select('id, short_code, status, total_pence, vat_pence, payment_method, scheduled_at, created_at, customer_id, provider_id, notes', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return { data, count };
}

export async function getBooking(db: SupabaseClient, bookingId: string) {
  await requirePermission(db, 'can_manage_bookings');
  const { data, error } = await db
    .from('bookings')
    .select('*, addresses(*), payments(*), reviews(*), support_tickets(*)')
    .eq('id', bookingId)
    .single();
  if (error) throw error;
  return data;
}

export async function updateBookingStatus(
  db: SupabaseClient,
  admin: SupabaseClient,
  bookingId: string,
  status: string,
  reason?: string | null,
) {
  await requirePermission(db, 'can_manage_bookings');
  const patch: Record<string, any> = { status };
  const now = new Date().toISOString();
  if (status === 'cancelled') { patch.cancelled_at = now; patch.cancellation_reason = reason ?? null; }
  if (status === 'completed') { patch.completed_at = now; }

  const { error } = await admin.from('bookings').update(patch).eq('id', bookingId);
  if (error) throw error;
}

export async function listProviders(
  db: SupabaseClient,
  limit = 50,
  offset = 0,
  kycFilter?: 'pending' | 'approved' | 'rejected',
) {
  await requirePermission(db, 'can_manage_providers');
  let query = db
    .from('profiles')
    .select('id, full_name, email, phone, is_online, kyc_status, rating_avg, rating_count, acceptance_rate, created_at, stripe_account_id', { count: 'exact' })
    .eq('role', 'provider')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (kycFilter) query = query.eq('kyc_status', kycFilter);
  const { data, error, count } = await query;
  if (error) throw error;
  return { data, count };
}

export async function getProvider(db: SupabaseClient, providerId: string) {
  await requirePermission(db, 'can_manage_providers');
  const { data, error } = await db
    .from('profiles')
    .select('*, provider_services(*), provider_documents(*), availability_slots(*), provider_location(*)')
    .eq('id', providerId)
    .single();
  if (error) throw error;
  return data;
}

export async function listPendingKyc(db: SupabaseClient) {
  await requirePermission(db, 'can_manage_kyc');
  const { data, error } = await db
    .from('profiles')
    .select('id, full_name, email, created_at')
    .eq('role', 'provider')
    .eq('kyc_status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getProviderKyc(db: SupabaseClient, providerId: string) {
  await requirePermission(db, 'can_manage_kyc');
  const [profile, docs] = await Promise.all([
    db.from('profiles').select('id, full_name, email, kyc_status').eq('id', providerId).single(),
    db.from('provider_documents').select('*').eq('provider_id', providerId),
  ]);
  if (profile.error) throw profile.error;
  return { profile: profile.data, documents: docs.data ?? [] };
}

export async function approveKyc(db: SupabaseClient, admin: SupabaseClient, providerId: string) {
  await requirePermission(db, 'can_manage_kyc');
  const { error } = await admin
    .from('profiles')
    .update({ kyc_status: 'approved' })
    .eq('id', providerId)
    .eq('role', 'provider');
  if (error) throw error;
}

export async function rejectKyc(db: SupabaseClient, admin: SupabaseClient, providerId: string) {
  await requirePermission(db, 'can_manage_kyc');
  const { error } = await admin
    .from('profiles')
    .update({ kyc_status: 'rejected' })
    .eq('id', providerId)
    .eq('role', 'provider');
  if (error) throw error;
}

export async function listTickets(
  db: SupabaseClient,
  limit = 50,
  offset = 0,
  statusFilter?: string,
) {
  await requirePermission(db, 'can_manage_tickets');
  let query = db
    .from('support_tickets')
    .select('id, booking_id, raised_by, category, description, status, resolved_at, created_at, profiles!raised_by(full_name, email)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (statusFilter) query = query.eq('status', statusFilter);
  const { data, error, count } = await query;
  if (error) throw error;
  return { data, count };
}

export async function getTicket(db: SupabaseClient, ticketId: string) {
  await requirePermission(db, 'can_manage_tickets');
  const { data, error } = await db
    .from('support_tickets')
    .select('*, profiles!raised_by(full_name, email), bookings(short_code, status)')
    .eq('id', ticketId)
    .single();
  if (error) throw error;
  return data;
}

export async function updateTicketStatus(
  db: SupabaseClient,
  admin: SupabaseClient,
  ticketId: string,
  status: 'in_review' | 'resolved' | 'closed',
) {
  await requirePermission(db, 'can_manage_tickets');
  const patch: Record<string, any> = { status };
  if (status === 'resolved' || status === 'closed') patch.resolved_at = new Date().toISOString();
  const { error } = await admin.from('support_tickets').update(patch).eq('id', ticketId);
  if (error) throw error;
}
