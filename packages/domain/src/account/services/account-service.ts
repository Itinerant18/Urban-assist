import type { SupabaseClient } from '@supabase/supabase-js';

const ACTIVE_BOOKING_STATUSES = ['assigned', 'on_the_way', 'arrived', 'in_progress'];

/**
 * Gather everything the platform holds about one user, for GDPR data-access
 * (Article 15). Reads go through the caller's RLS-scoped client, so a user can
 * only ever export their own rows.
 */
export async function exportUserData(db: SupabaseClient, userId: string) {
  const [
    profile,
    addresses,
    customerBookings,
    providerBookings,
    reviewsAuthored,
    messages,
    wallet,
    providerServices,
    providerDocuments,
    providerLocation,
    payouts,
  ] = await Promise.all([
    db.from('profiles').select('*').eq('id', userId).maybeSingle(),
    db.from('addresses').select('*').eq('profile_id', userId),
    db.from('bookings').select('*').eq('customer_id', userId),
    db.from('bookings').select('*').eq('provider_id', userId),
    db.from('reviews').select('*').eq('author_id', userId),
    db.from('messages').select('*').eq('sender_id', userId),
    db.from('wallet_ledger').select('*').eq('profile_id', userId),
    db.from('provider_services').select('*').eq('provider_id', userId),
    db.from('provider_documents').select('*').eq('provider_id', userId),
    db.from('provider_location').select('*').eq('provider_id', userId),
    db.from('payouts').select('*').eq('provider_id', userId),
  ]);

  return {
    exported_at: new Date().toISOString(),
    user_id: userId,
    profile: profile.data ?? null,
    addresses: addresses.data ?? [],
    bookings_as_customer: customerBookings.data ?? [],
    bookings_as_provider: providerBookings.data ?? [],
    reviews_written: reviewsAuthored.data ?? [],
    messages_sent: messages.data ?? [],
    wallet_ledger: wallet.data ?? [],
    provider_services: providerServices.data ?? [],
    provider_documents: providerDocuments.data ?? [],
    provider_location: providerLocation.data ?? [],
    payouts: payouts.data ?? [],
  };
}

/**
 * Right-to-erasure (Article 17). Blocks deletion while the user has open
 * obligations, then removes the auth user — profiles and every child row
 * cascade from the auth.users FK (0001_schema.sql:28). `admin` must be a
 * service-role client.
 */
export async function deleteUserAccount(
  db: SupabaseClient,
  admin: SupabaseClient,
  userId: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  // Active jobs on either side block deletion.
  const { count: activeAsCustomer } = await db
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('customer_id', userId)
    .in('status', ACTIVE_BOOKING_STATUSES);
  const { count: activeAsProvider } = await db
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('provider_id', userId)
    .in('status', ACTIVE_BOOKING_STATUSES);
  if ((activeAsCustomer ?? 0) > 0 || (activeAsProvider ?? 0) > 0) {
    return { ok: false, reason: 'You have an active booking. It must finish before you can delete your account.' };
  }

  // A positive wallet balance is money owed to the user.
  const { data: ledger } = await db
    .from('wallet_ledger')
    .select('amount_pence')
    .eq('profile_id', userId);
  const walletBalance = (ledger ?? []).reduce((sum, row) => sum + (row.amount_pence ?? 0), 0);
  if (walletBalance > 0) {
    return { ok: false, reason: 'Your wallet still holds a balance. Spend or withdraw it before deleting your account.' };
  }

  // Unpaid provider earnings block deletion.
  const { count: pendingPayouts } = await db
    .from('payouts')
    .select('id', { count: 'exact', head: true })
    .eq('provider_id', userId)
    .eq('status', 'pending');
  if ((pendingPayouts ?? 0) > 0) {
    return { ok: false, reason: 'You have a pending payout. Wait for it to settle before deleting your account.' };
  }

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { ok: false, reason: error.message };
  return { ok: true };
}
