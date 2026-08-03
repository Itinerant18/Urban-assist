import type { SupabaseClient } from '@supabase/supabase-js';

export type BookingFilterPreset =
  | 'needs_match'
  | 'preference_pending'
  | 'today'
  | 'disputed';

export interface AdminBookingFilters {
  status?: string;
  from?: string;
  to?: string;
  category?: string;
  postcode?: string;
  provider?: string;
  customer?: string;
  unassigned: boolean;
  /** Bookings where the customer set preferred_provider_id. */
  withPreference: boolean;
  /** Active one-click ops preset (for chip highlight). */
  preset: BookingFilterPreset | null;
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/** YYYY-MM-DD in Europe/London (UK ops day). */
export function todayLondonIso(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(now);
}

export const BOOKING_FILTER_PRESETS: {
  id: BookingFilterPreset;
  label: string;
}[] = [
  { id: 'needs_match', label: 'Needs match' },
  { id: 'preference_pending', label: 'Preference pending' },
  { id: 'today', label: 'Today' },
  { id: 'disputed', label: 'Disputed' },
];

export function bookingPresetHref(preset: BookingFilterPreset): string {
  return `/bookings?preset=${preset}`;
}

/**
 * Expand a named ops preset into concrete filters.
 * Explicit query params still win when both are present (preset applied first).
 */
export function applyBookingPreset(
  preset: string | undefined,
  base: Omit<AdminBookingFilters, 'preset'>,
  today = todayLondonIso(),
): AdminBookingFilters {
  const id =
    preset === 'needs_match' ||
    preset === 'preference_pending' ||
    preset === 'today' ||
    preset === 'disputed'
      ? preset
      : null;

  if (!id) return { ...base, preset: null };

  switch (id) {
    case 'needs_match':
      return { ...base, unassigned: true, withPreference: false, status: undefined, preset: id };
    case 'preference_pending':
      return { ...base, unassigned: true, withPreference: true, status: undefined, preset: id };
    case 'today':
      return { ...base, from: today, to: today, preset: id };
    case 'disputed':
      return {
        ...base,
        status: 'disputed',
        unassigned: false,
        withPreference: false,
        preset: id,
      };
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

export function readBookingFilters(
  input: Record<string, string | string[] | undefined>,
  today = todayLondonIso(),
): AdminBookingFilters {
  const base: Omit<AdminBookingFilters, 'preset'> = {
    status: first(input.status) || undefined,
    from: first(input.from) || undefined,
    to: first(input.to) || undefined,
    category: first(input.category) || undefined,
    postcode: first(input.postcode)?.trim() || undefined,
    provider: first(input.provider) || undefined,
    customer: first(input.customer) || undefined,
    unassigned: first(input.unassigned) === '1' || first(input.scope) === 'unassigned',
    withPreference: first(input.preferred) === '1',
  };

  // Preset expands defaults; explicit flags/dates in the URL override after.
  const fromPreset = applyBookingPreset(first(input.preset), base, today);
  return {
    ...fromPreset,
    status: first(input.status) || fromPreset.status,
    from: first(input.from) || fromPreset.from,
    to: first(input.to) || fromPreset.to,
    unassigned:
      first(input.unassigned) === '1' ||
      first(input.scope) === 'unassigned' ||
      fromPreset.unassigned,
    withPreference: first(input.preferred) === '1' || fromPreset.withPreference,
    preset: fromPreset.preset,
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
  preferred_provider_id,
  customer:profiles!bookings_customer_id_fkey(id, full_name, email),
  provider:profiles!bookings_provider_id_fkey(id, full_name, email),
  preferred_provider:profiles!bookings_preferred_provider_id_fkey(id, full_name, email),
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
  if (filters.withPreference) query = query.not('preferred_provider_id', 'is', null);

  const { data, error, count } = await query;
  if (error) throw error;
  const bookings = ((data ?? []) as any[]).map((booking) => {
    const preferredId = booking.preferred_provider_id as string | null;
    const assignedId = booking.provider_id as string | null;
    let preferenceOutcome: 'none' | 'pending' | 'honored' | 'overridden' = 'none';
    if (preferredId) {
      if (!assignedId) preferenceOutcome = 'pending';
      else if (assignedId === preferredId) preferenceOutcome = 'honored';
      else preferenceOutcome = 'overridden';
    }
    return {
      ...booking,
      category_name: booking.category?.name ?? null,
      postcode: booking.address?.postcode ?? null,
      customer_name: booking.customer?.full_name ?? null,
      customer_email: booking.customer?.email ?? null,
      provider_name: booking.provider?.full_name ?? booking.provider?.email ?? null,
      preferred_name:
        booking.preferred_provider?.full_name ?? booking.preferred_provider?.email ?? null,
      preference_outcome: preferenceOutcome,
    };
  });
  return { bookings, count: count ?? bookings.length };
}

/** Soft-preference KPIs for admin analytics. */
export async function getPreferenceMetrics(db: SupabaseClient) {
  const { data, error } = await db
    .from('bookings')
    .select('id, status, preferred_provider_id, provider_id')
    .not('preferred_provider_id', 'is', null)
    .limit(10_000);
  if (error) throw error;
  const rows = data ?? [];
  const withPreference = rows.length;
  let honored = 0;
  let overridden = 0;
  let pending = 0;
  let completedHonored = 0;
  let completedOverridden = 0;
  let cancelledWithPreference = 0;
  for (const row of rows) {
    const preferred = row.preferred_provider_id;
    const assigned = row.provider_id;
    if (!assigned) {
      pending += 1;
      continue;
    }
    const match = assigned === preferred;
    if (match) honored += 1;
    else overridden += 1;
    if (row.status === 'completed') {
      if (match) completedHonored += 1;
      else completedOverridden += 1;
    }
    if (row.status === 'cancelled') cancelledWithPreference += 1;
  }
  const decided = honored + overridden;
  return {
    withPreference,
    pending,
    honored,
    overridden,
    honorRatePct: decided ? Math.round((honored / decided) * 100) : null,
    completedHonored,
    completedOverridden,
    cancelledWithPreference,
  };
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
