import { notFound, redirect } from 'next/navigation';
import { getSupabaseServer, createServiceRole } from '@urban-assist/db/server';
import { loadCommissionRates } from '../../../../../lib/provider-data';
import { InvoiceView } from './invoice-view';

export const dynamic = 'force-dynamic';

export default async function InvoicePage({ params }: { params: { id: string } }) {
  const db = getSupabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');

  // RLS scopes bookings to their customer or provider; the extra provider_id filter
  // makes a customer's own booking 404 here rather than render a provider invoice.
  const [{ data: booking }, { data: payment }, commissionFor] = await Promise.all([
    db
      .from('bookings')
      .select(
        `id, short_code, status, scheduled_at, completed_at, notes, completion_report,
         price_pence, vat_pence, total_pence, wallet_applied_pence, payment_method,
         category_id,
         category:service_categories(name),
         address:addresses(line1, line2, city, postcode),
         customer:profiles!bookings_customer_id_fkey(full_name),
         sku:service_skus(name, duration_mins)`,
      )
      .eq('id', params.id)
      .eq('provider_id', user.id)
      .maybeSingle(),
    db
      .from('payments')
      .select('method, status, amount_pence, vat_pence, cash_collected_at, created_at')
      .eq('booking_id', params.id)
      .maybeSingle(),
    loadCommissionRates(createServiceRole()),
  ]);

  if (!booking) notFound();

  return (
    <InvoiceView
      booking={booking}
      payment={payment}
      commissionBps={commissionFor((booking as any).category_id)}
    />
  );
}
