import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseServer } from '@urban-assist/db/server';
import { Card, Badge, RatingStars, EmptyState } from '@urban-assist/ui';
import { pence } from '@urban-assist/lib';
import { Eye, ShieldCheck } from 'lucide-react';

export const dynamic = 'force-dynamic';

/**
 * The provider's own view of their public listing.
 *
 * Queries mirror apps/customer/app/(dashboard)/providers/[id]/page.tsx exactly — same
 * columns, same filters (active services only, customer_to_provider reviews) — so this
 * shows what a customer actually sees rather than a flattering approximation.
 */
export default async function PublicProfilePage() {
  const db = getSupabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: profile }, { data: services }, { data: reviews }, { count: completedJobs }] =
    await Promise.all([
      db
        .from('profiles')
        .select('id, full_name, avatar_url, bio, rating_avg, rating_count, kyc_status, business_name, years_experience')
        .eq('id', user.id)
        .single(),
      db
        .from('provider_services')
        .select('id, title, price_pence, duration_mins, category:service_categories(name)')
        .eq('provider_id', user.id)
        .eq('is_active', true)
        .order('price_pence', { ascending: true }),
      db
        .from('reviews')
        .select('id, rating, comment, author:profiles!reviews_author_id_fkey(full_name)')
        .eq('target_id', user.id)
        .eq('direction', 'customer_to_provider')
        .order('created_at', { ascending: false })
        .limit(10),
      db
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('provider_id', user.id)
        .eq('status', 'completed'),
    ]);

  const verified = profile?.kyc_status === 'approved';

  return (
    <div className="space-y-4 py-2">
      <header className="space-y-1">
        <h1 className="font-display text-xl uppercase font-bold text-ink tracking-tight">
          Your public profile
        </h1>
        <p className="flex items-center gap-1.5 text-xs text-muted">
          <Eye className="h-3.5 w-3.5" />
          This is what customers see when they view you.
        </p>
      </header>

      <Card className="!p-5 bg-white space-y-4">
        <div className="flex items-start gap-4">
          {profile?.avatar_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={profile.avatar_url}
              alt=""
              className="h-16 w-16 rounded-full object-cover border border-hairline"
            />
          ) : (
            <div className="grid h-16 w-16 place-items-center rounded-full bg-bg border border-hairline font-display text-xl font-bold text-muted">
              {(profile?.full_name ?? '?').charAt(0).toUpperCase()}
            </div>
          )}

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-display text-lg font-bold text-ink">
                {profile?.full_name ?? 'Your name'}
              </h2>
              {verified && (
                <Badge tone="success">
                  <ShieldCheck className="h-3 w-3" />
                  Verified
                </Badge>
              )}
            </div>
            {profile?.business_name && profile.business_name !== profile.full_name && (
              <p className="text-sm text-muted">{profile.business_name}</p>
            )}
            <div className="flex items-center gap-2 text-sm">
              {(profile?.rating_count ?? 0) > 0 ? (
                <>
                  <RatingStars value={Number(profile?.rating_avg ?? 0)} />
                  <span className="text-muted">
                    {Number(profile?.rating_avg ?? 0).toFixed(1)} ({profile?.rating_count})
                  </span>
                </>
              ) : (
                <span className="text-muted">No reviews yet</span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-hairline pt-3">
          <div>
            <p className="font-mono-utility text-[10px] uppercase tracking-wider text-muted">
              Jobs completed
            </p>
            <p className="font-display text-lg font-bold text-ink">{completedJobs ?? 0}</p>
          </div>
          <div>
            <p className="font-mono-utility text-[10px] uppercase tracking-wider text-muted">
              Experience
            </p>
            <p className="font-display text-lg font-bold text-ink">
              {profile?.years_experience ? `${profile.years_experience} yrs` : '—'}
            </p>
          </div>
        </div>

        {profile?.bio && (
          <div className="border-t border-hairline pt-3">
            <p className="font-mono-utility text-[10px] uppercase tracking-wider text-muted mb-1">
              About
            </p>
            <p className="text-sm text-charcoal whitespace-pre-wrap">{profile.bio}</p>
          </div>
        )}
      </Card>

      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h2 className="font-mono-utility text-[10px] uppercase tracking-wider text-muted">
            Services listed
          </h2>
          <Link href="/services" className="tap text-xs text-accent hover:underline">
            Edit →
          </Link>
        </div>
        {!services?.length ? (
          <EmptyState
            title="No services listed"
            description="Customers cannot find you until you add at least one active service."
          />
        ) : (
          <ul className="space-y-2">
            {services.map((s: any) => (
              <li key={s.id}>
                <Card className="!p-3 bg-white flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{s.title}</p>
                    <p className="text-xs text-muted">
                      {s.category?.name}
                      {s.duration_mins ? ` · ${s.duration_mins} mins` : ''}
                    </p>
                  </div>
                  <span className="font-mono-utility text-sm text-ink shrink-0">
                    {pence(s.price_pence ?? 0)}
                  </span>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="font-mono-utility text-[10px] uppercase tracking-wider text-muted">
          Reviews customers can read
        </h2>
        {!reviews?.length ? (
          <p className="text-sm text-muted">No reviews yet.</p>
        ) : (
          <ul className="space-y-2">
            {reviews.map((r: any) => (
              <li key={r.id}>
                <Card className="!p-3 bg-white space-y-1">
                  <div className="flex items-center gap-2">
                    <RatingStars value={r.rating} />
                    <span className="text-xs text-muted">{r.author?.full_name ?? 'Customer'}</span>
                  </div>
                  {r.comment && <p className="text-sm text-charcoal">{r.comment}</p>}
                </Card>
              </li>
            ))}
          </ul>
        )}
        <Link href="/performance" className="tap inline-block text-xs text-accent hover:underline">
          See all reviews and metrics →
        </Link>
      </section>
    </div>
  );
}
