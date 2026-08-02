import { notFound, redirect } from 'next/navigation';
import { getSupabaseServer, createServiceRole } from '@urban-assist/db/server';
import { loadCategoryTrainingEligibility } from '@urban-assist/domain';
import {
  loadOffer,
  loadProviderLocation,
  loadCommissionRates,
} from '../../../../lib/provider-data';
import { OfferDetail } from './offer-detail';

export const dynamic = 'force-dynamic';

export default async function OfferDetailPage({ params }: { params: { id: string } }) {
  const db = getSupabaseServer();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect('/login');

  const [offer, providerLoc, commissionFor] = await Promise.all([
    loadOffer(db, user.id, params.id),
    loadProviderLocation(db, user.id),
    loadCommissionRates(createServiceRole()),
  ]);

  if (!offer) notFound();

  const categoryId = (offer as any).booking?.category_id as string | undefined;
  const training = await loadCategoryTrainingEligibility(
    createServiceRole(),
    user.id,
    categoryId,
  );

  return (
    <OfferDetail
      offer={offer}
      providerLoc={providerLoc}
      commissionBps={commissionFor(categoryId)}
      trainingGate={
        training.eligible
          ? null
          : {
              message: training.message ?? 'Complete required training to accept this job.',
              href: '/training',
            }
      }
    />
  );
}
