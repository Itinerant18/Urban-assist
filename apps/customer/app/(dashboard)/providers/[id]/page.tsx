import * as React from 'react';
import { notFound } from 'next/navigation';
import { getSupabaseServer } from '@urban-assist/db/server';
import { ProviderProfileClient } from '../../../../components/services/provider-profile-client';

export const dynamic = 'force-dynamic';

export default async function ProviderPublicProfilePage({ params }: { params: { id: string } }) {
  const db = getSupabaseServer();

  // Fetch provider profile
  const { data: provider } = await db
    .from('profiles')
    .select('id, full_name, avatar_url, rating_avg, rating_count, kyc_status, acceptance_rate')
    .eq('id', params.id)
    .eq('role', 'provider')
    .single();

  if (!provider) {
    notFound();
  }

  // Fetch provider's active services
  const { data: services } = await db
    .from('provider_services')
    .select('id, title, price_pence, duration_mins')
    .eq('provider_id', params.id)
    .eq('is_active', true)
    .order('price_pence', { ascending: true });

  // Fetch customer reviews for this provider (reviews.target_id, public read)
  const { data: reviews } = await db
    .from('reviews')
    .select('id, rating, comment, author:profiles!reviews_author_id_fkey(full_name)')
    .eq('target_id', params.id)
    .eq('direction', 'customer_to_provider')
    .order('created_at', { ascending: false })
    .limit(10);

  return (
    <div className="py-2">
      <ProviderProfileClient
        provider={provider as any}
        services={(services ?? []) as any}
        reviews={(reviews ?? []) as any}
      />
    </div>
  );
}
