import type { SupabaseClient } from '@supabase/supabase-js';

export interface AdminBookingFilters {
  status?: string;
  from?: string;
  to?: string;
  category?: string;
  postcode?: string;
  provider?: string;
  customer?: string;
  unassigned: boolean;
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function readBookingFilters(
  input: Record<string, string | string[] | undefined>,
): AdminBookingFilters {
  return {
    status: first(input.status) || undefined,
    from: first(input.from) || undefined,
    to: first(input.to) || undefined,
    category: first(input.category) || undefined,
    postcode: first(input.postcode)?.trim() || undefined,
    provider: first(input.provider) || undefined,
    customer: first(input.customer) || undefined,
    unassigned: first(input.unassigned) === '1' || first(input.scope) === 'unassigned',
  };
}

const BOOKING_LIST_SELECT = `
  id,
  short_code,
  status,
  scheduled_at,
  created_at,
  total_pence,
  payment_method,
  provider_id,
  customer_id,
  category_id,
  customer:profiles!bookings_customer_id_fkey(id, full_name, email),
  provider:profiles!bookings_provider_id_fkey(id, full_name, email),
  category:service_categories!bookings_category_id_fkey(id, name, slug),
  address:addresses!inner(id, line1, city, postcode)
`;

export async function listAdminBookings(
  db: SupabaseClient,
  filters: AdminBookingFilters,
  requestedLimit = 100,
) {
  let query = db
    .from('bookings')
    .select(BOOKING_LIST_SELECT, { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(Math.min(Math.max(requestedLimit, 1), 10_000));

  if (filters.unassigned) {
    query = query.in('status', ['pending_match', 'unmatched']).is('provider_id', null);
  } else if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.from) query = query.gte('scheduled_at', `${filters.from}T00:00:00.000Z`);
  if (filters.to) query = query.lte('scheduled_at', `${filters.to}T23:59:59.999Z`);
  if (filters.category) query = query.eq('category_id', filters.category);
  if (filters.postcode) query = query.ilike('address.postcode', `${filters.postcode.trim()}%`);
  if (filters.provider) query = query.eq('provider_id', filters.provider);
  if (filters.customer) query = query.eq('customer_id', filters.customer);

  const { data, error, count } = await query;
  if (error) throw error;
  const bookings = ((data ?? []) as any[]).map((booking) => ({
    ...booking,
    category_name: booking.category?.name ?? null,
    postcode: booking.address?.postcode ?? null,
    customer_name: booking.customer?.full_name ?? null,
    customer_email: booking.customer?.email ?? null,
    provider_name: booking.provider?.full_name ?? booking.provider?.email ?? null,
  }));
  return { bookings, count: count ?? bookings.length };
}

export async function getAdminBooking(db: SupabaseClient, bookingId: string) {
  const [{ data: booking, error }, { data: statusLogs }] = await Promise.all([
    db
      .from('bookings')
      .select(`
        *,
        customer:profiles!bookings_customer_id_fkey(id, full_name, email, phone, rating_avg),
        provider:profiles!bookings_provider_id_fkey(id, full_name, email, phone, rating_avg, last_seen_at),
        category:service_categories!bookings_category_id_fkey(id, name, slug, requires_start_otp),
        provider_service:provider_services(id, title, duration_mins, price_pence),
        address:addresses(id, label, line1, line2, city, postcode, lat, lng),
        payments(id, status, method, amount_pence, vat_pence, stripe_payment_intent_id, created_at)
      `)
      .eq('id', bookingId)
      .single(),
    (db as any)
      .from('booking_status_logs')
      .select(`
        id, from_status, to_status, previous_provider_id, provider_id,
        action_type, reason, strategy, admin_user_id, context, created_at,
        admin:profiles!booking_status_logs_admin_user_id_fkey(full_name, email),
        provider:profiles!booking_status_logs_provider_id_fkey(full_name, email),
        previous_provider:profiles!booking_status_logs_previous_provider_id_fkey(full_name, email)
      `)
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false }),
  ]);

  if (error) throw error;
  return { booking, statusLogs: statusLogs ?? [] };
}

export async function getBookingFilterOptions(db: SupabaseClient) {
  const [{ data: categories }, { data: providers }, { data: customers }] = await Promise.all([
    db.from('service_categories').select('id, name').order('name'),
    db
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', 'provider')
      .order('full_name')
      .limit(500),
    db
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', 'customer')
      .order('full_name')
      .limit(500),
  ]);

  return {
    categories: categories ?? [],
    providers: providers ?? [],
    customers: customers ?? [],
  };
}
