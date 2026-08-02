import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseServer } from '@urban-assist/db/server';
import { RatingPrompt } from '../../../../../components/rating-prompt';

export const dynamic = 'force-dynamic';

export default async function RateBookingPage({ params }: { params: { id: string } }) {
  const db = getSupabaseServer();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect(`/login?redirect=${encodeURIComponent(`/bookings/${params.id}/rate`)}`);

  const { data: booking } = await db
    .from('bookings')
    .select(
      'id, short_code, status, provider_service_id, customer_id, category:service_categories(name), provider:profiles!bookings_provider_id_fkey(id, full_name, avatar_url)',
    )
    .eq('id', params.id)
    .eq('customer_id', user.id)
    .single();

  if (!booking) return notFound();

  if (booking.status !== 'completed') {
    redirect(`/bookings/${params.id}`);
  }

  const { data: existing } = await db
    .from('reviews')
    .select('id')
    .eq('booking_id', params.id)
    .eq('author_id', user.id)
    .maybeSingle();

  if (existing) {
    redirect(`/bookings/${params.id}`);
  }

  const provider = Array.isArray(booking.provider) ? booking.provider[0] : booking.provider;
  const category = Array.isArray(booking.category) ? booking.category[0] : booking.category;

  return (
    <div className="py-2">
      <div className="mb-2 lg:mb-4">
        <Link href={`/bookings/${params.id}`} className="text-sm font-semibold text-accent">
          ← Booking details
        </Link>
      </div>
      <RatingPrompt
        booking={{
          id: booking.id,
          short_code: booking.short_code,
          provider_service_id: booking.provider_service_id,
          category,
          provider,
        }}
      />
    </div>
  );
}
