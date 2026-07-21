import { requireAdminPermission } from './admin-auth';

export type ProviderServiceArea = {
  id: string;
  category_id: string | null;
  postcode_pattern: string;
};

export async function getAdminProviderDetail(providerId: string) {
  const { db, roles } = await requireAdminPermission('can_manage_providers');
  const adminDb = db as any;

  const [
    profileResult,
    servicesResult,
    areasResult,
    categoriesResult,
    documentsResult,
    notesResult,
    bookingsResult,
    reviewsResult,
    disputesResult,
  ] = await Promise.all([
    adminDb
      .from('profiles')
      .select('id, full_name, email, phone, kyc_status, is_online, is_blocked, last_seen_at, rating_avg, rating_count, acceptance_rate, stripe_account_id, created_at')
      .eq('id', providerId)
      .eq('role', 'provider')
      .single(),
    adminDb
      .from('provider_services')
      .select('id, category_id, title, price_pence, duration_mins, is_active, category:service_categories(id, name, slug)')
      .eq('provider_id', providerId)
      .order('created_at'),
    adminDb
      .from('provider_service_areas')
      .select('id, category_id, postcode_pattern')
      .eq('provider_id', providerId)
      .order('postcode_pattern'),
    adminDb
      .from('service_categories')
      .select('id, name, slug')
      .order('sort_order')
      .order('name'),
    adminDb
      .from('provider_documents')
      .select('id, doc_type, storage_path, expires_at, uploaded_at')
      .eq('provider_id', providerId)
      .order('uploaded_at', { ascending: false }),
    adminDb
      .from('provider_admin_notes')
      .select('id, note, created_at, admin:profiles!provider_admin_notes_admin_user_id_fkey(full_name, email)')
      .eq('provider_id', providerId)
      .order('created_at', { ascending: false })
      .limit(50),
    adminDb
      .from('bookings')
      .select('id, customer_id, status, total_pence, created_at')
      .eq('provider_id', providerId),
    adminDb
      .from('reviews')
      .select('rating')
      .eq('target_id', providerId)
      .eq('direction', 'customer_to_provider'),
    adminDb
      .from('support_tickets')
      .select('id, bookings!inner(provider_id)')
      .eq('bookings.provider_id', providerId),
  ]);

  if (profileResult.error) throw profileResult.error;
  const bookings = bookingsResult.data ?? [];
  const completed = bookings.filter((booking: any) => booking.status === 'completed');
  const cancelled = bookings.filter((booking: any) => booking.status === 'cancelled');
  const customerCounts = new Map<string, number>();
  for (const booking of completed) {
    customerCounts.set(booking.customer_id, (customerCounts.get(booking.customer_id) ?? 0) + 1);
  }
  const repeatCustomers = Array.from(customerCounts.values()).filter((count) => count > 1).length;
  const ratings = reviewsResult.data ?? [];

  return {
    profile: profileResult.data,
    services: servicesResult.data ?? [],
    serviceAreas: areasResult.data ?? [],
    categories: categoriesResult.data ?? [],
    documents: documentsResult.data ?? [],
    notes: notesResult.data ?? [],
    canAddNotes: roles.some((role: string) => ['super_admin', 'ops_admin', 'support_agent'].includes(role)),
    metrics: {
      completedJobs: completed.length,
      cancellationRate: bookings.length ? cancelled.length / bookings.length : 0,
      averageRating: ratings.length
        ? ratings.reduce((sum: number, review: any) => sum + Number(review.rating), 0) / ratings.length
        : Number(profileResult.data.rating_avg ?? 0),
      revenueGeneratedPence: completed.reduce(
        (sum: number, booking: any) => sum + Number(booking.total_pence ?? 0),
        0,
      ),
      disputesCount: disputesResult.data?.length ?? 0,
      repeatCustomerRate: customerCounts.size ? repeatCustomers / customerCounts.size : 0,
    },
  };
}
