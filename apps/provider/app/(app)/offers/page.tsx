import { redirect } from 'next/navigation';
import { getSupabaseServer, createServiceRole } from '@urban-assist/db/server';
import {
  loadOffers,
  loadProviderLocation,
  loadCommissionRates,
} from '../../../lib/provider-data';
import { OffersList } from './offers-list';

export const dynamic = 'force-dynamic';

export default async function OffersPage() {
  const db = getSupabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');

  const [offers, providerLoc, commissionFor] = await Promise.all([
    loadOffers(db, user.id),
    loadProviderLocation(db, user.id),
    loadCommissionRates(createServiceRole()),
  ]);

  // Resolve commission on the server so the client never needs the rules table.
  const withCommission = offers.map((o: any) => ({
    ...o,
    commission_bps: commissionFor(o.booking?.category_id),
  }));

  return <OffersList offers={withCommission} providerLoc={providerLoc} />;
}
