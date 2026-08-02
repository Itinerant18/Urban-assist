import { notFound, redirect } from 'next/navigation';
import { getSupabaseServer, createServiceRole } from '@urban-assist/db/server';
import {
  loadOffer,
  loadProviderLocation,
  loadCommissionRates,
} from '../../../../lib/provider-data';
import { OfferDetail } from './offer-detail';

export const dynamic = 'force-dynamic';

export default async function OfferDetailPage({ params }: { params: { id: string } }) {
  const db = getSupabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');

  const [offer, providerLoc, commissionFor] = await Promise.all([
    // Scoped to provider_id inside the loader, so another provider's offer 404s
    // rather than leaking a customer address.
    loadOffer(db, user.id, params.id),
    loadProviderLocation(db, user.id),
    loadCommissionRates(createServiceRole()),
  ]);

  if (!offer) notFound();

  return (
    <OfferDetail
      offer={offer}
      providerLoc={providerLoc}
      commissionBps={commissionFor((offer as any).booking?.category_id)}
    />
  );
}
