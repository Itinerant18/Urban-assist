'use client';
import * as React from 'react';
import Link from 'next/link';
import { Button, Card, Badge, EmptyState, RatingStars } from '@urban-assist/ui';
import { pence, ukDateTime } from '@urban-assist/lib';
import { getSupabaseBrowser as supabase } from '@urban-assist/db/browser';
import { OfferCard } from './offer-card';
import { postCurrentLocation } from '../../lib/post-location';

export function Dashboard({
  profile,
  jobsToday,
  openOffer: initialOffer,
  servicesCount,
  weeklyEarnings,
  completionRate,
}: {
  profile: any;
  jobsToday: any[];
  openOffer: any | null;
  servicesCount: number;
  weeklyEarnings: { label: string; pence: number }[];
  /** null when the provider has no completed or cancelled jobs yet. */
  completionRate: number | null;
}) {
  const [online, setOnline] = React.useState<boolean>(!!profile?.is_online);
  const [offer, setOffer] = React.useState(initialOffer);
  const [toggling, setToggling] = React.useState(false);

  // Live: listen for new offers landing in `notifications`.
  React.useEffect(() => {
    const sb = supabase();
    const ch = sb
      .channel(`provider-${profile.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `profile_id=eq.${profile.id}` },
        async (payload) => {
          const n = payload.new as any;
          if (n.type !== 'offer.new') return;
          // Fetch the offer fresh so we have booking + address.
          const { data } = await sb
            .from('booking_offers')
            .select('id, booking_id, responds_by, booking:bookings(id,short_code,scheduled_at,total_pence,category:service_categories(name),address:addresses(line1,postcode,lat,lng))')
            .eq('id', n.payload.offer_id)
            .single();
          if (data) setOffer(data as any);
        },
      )
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, [profile.id]);

  async function toggleOnline() {
    setToggling(true);
    const next = !online;
    await fetch('/api/online', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ online: next }),
    });
    // Refresh position on going online so distance scoring in findCandidates() works
    // off where the provider actually is, not the postcode geocoded at registration.
    if (next) void postCurrentLocation();
    setOnline(next);
    setToggling(false);
  }

  const earningsToday = jobsToday
    .filter((j) => j.status === 'completed')
    .reduce((s, j) => s + (j.total_pence ?? 0), 0);

  const weekPeak = Math.max(0, ...weeklyEarnings.map((d) => d.pence));

  return (
    <div className="space-y-4 py-2">
      <header className="flex items-center justify-between">
        <div>
          <p className="font-mono-utility text-muted">Today</p>
          <h1 className="font-display text-xl">{greet()}</h1>
        </div>
        <button
          onClick={toggleOnline}
          disabled={toggling}
          className="tap flex items-center gap-2 rounded-full border border-hairline bg-white px-3.5 py-1.5 text-xs font-medium text-ink transition hover:border-ink"
        >
          <span className={`h-2 w-2 rounded-full ${online ? 'bg-success animate-pulse' : 'bg-muted'}`} />
          Status: {online ? 'ONLINE' : 'OFFLINE'}
        </button>
      </header>

      {/* Prominent stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card className="flex flex-col gap-1 border border-hairline p-4 bg-white shadow-card rounded-xl">
          <span className="font-mono-utility text-[10px] uppercase tracking-wider text-muted">Today's Earnings</span>
          <span className="font-display text-2xl font-extrabold text-ink">{pence(earningsToday)}</span>
        </Card>
        <Card className="flex flex-col gap-1 border border-hairline p-4 bg-white shadow-card rounded-xl">
          <span className="font-mono-utility text-[10px] uppercase tracking-wider text-muted">Completion Rate</span>
          <span
            className={`font-display text-2xl font-extrabold ${
              completionRate === null ? 'text-muted' : 'text-success'
            }`}
          >
            {completionRate === null ? '—' : `${Math.round(completionRate * 100)}%`}
          </span>
        </Card>
        {/* Links to the offers list — previously the only way to see an offer was to
            catch the realtime modal while the app was open. */}
        <Link href="/offers" className="tap col-span-2 sm:col-span-1">
          <Card className="h-full flex flex-col gap-1 border border-hairline p-4 bg-white shadow-card rounded-xl transition hover:border-ink">
            <span className="font-mono-utility text-[10px] uppercase tracking-wider text-muted">New Requests</span>
            <span className="font-display text-2xl font-extrabold text-ink">
              {offer ? '1 Pending' : '0 Pending'}
            </span>
            <span className="text-[10px] text-accent">View all offers →</span>
          </Card>
        </Link>
      </div>

      {/* Both tiles open the performance dashboard, where the same figures are
          broken down with the thresholds that affect matching. */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/performance" className="tap">
          <Card className="h-full !p-3 flex flex-col justify-between bg-white border border-hairline rounded-xl transition hover:border-ink">
            <div className="font-mono-utility text-xs text-muted">Rating</div>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="font-display text-lg font-bold">{Number(profile.rating_avg ?? 0).toFixed(1)}</span>
              <RatingStars value={Number(profile.rating_avg ?? 0)} />
            </div>
            <div className="text-[10px] text-muted mt-1">{profile.rating_count ?? 0} reviews</div>
          </Card>
        </Link>
        <Link href="/performance" className="tap">
          <Stat label="Accept rate" value={`${Math.round(Number(profile.acceptance_rate ?? 1) * 100)}%`} />
        </Link>
      </div>

      {/* Weekly Earnings Chart - Desktop Only */}
      <Card className="hidden lg:block border border-hairline bg-white p-5 rounded-xl shadow-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-xs font-bold text-ink uppercase tracking-wider">Weekly Earnings Chart</h3>
          <span className="text-xs text-muted">Last 7 Days</span>
        </div>
        <div className="flex items-end justify-between h-40 px-4 pt-4 border-b border-hairline">
          {weeklyEarnings.map((bar, i) => (
            <div
              key={`${bar.label}-${i}`}
              className="flex flex-col items-center gap-2 w-10 group relative justify-end h-full"
            >
              {/* Tooltip */}
              <span className="absolute -top-8 scale-0 transition-all rounded bg-ink px-2 py-1 text-[10px] text-bg group-hover:scale-100 font-mono-utility">
                {pence(bar.pence)}
              </span>
              {/* Bar — scaled against the week's own peak, so the shape is readable
                  whatever the absolute amounts. Inline height: Tailwind cannot
                  generate arbitrary values at runtime. A zero day keeps a 2px stub
                  so the day is still visibly present rather than missing. */}
              <div
                className="w-6 rounded-t bg-accent/80 transition group-hover:bg-accent min-h-[2px]"
                style={{ height: weekPeak > 0 ? `${(bar.pence / weekPeak) * 100}%` : '2px' }}
              />
              {/* Label */}
              <span className="text-[10px] text-muted font-mono-utility">{bar.label}</span>
            </div>
          ))}
        </div>
        {weekPeak === 0 && (
          <p className="mt-3 text-center text-xs text-muted">No completed jobs in the last 7 days.</p>
        )}
      </Card>

      {profile.kyc_status !== 'approved' && (
        <Card className="border-accent/50 bg-accent/5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-medium">Verification pending</div>
              <p className="text-sm text-muted">
                Upload your ID, insurance and any certifications to start accepting jobs.
              </p>
            </div>
            <Link href="/onboarding"><Button>Continue</Button></Link>
          </div>
        </Card>
      )}

      {servicesCount === 0 && (
        <Card>
          <div className="font-medium">Set up your services</div>
          <p className="mt-1 text-sm text-muted">
            Pick the categories you cover and set your prices.
          </p>
          <Link href="/onboarding/services"><Button className="mt-3">Add services</Button></Link>
        </Card>
      )}

      {offer && <OfferCard offer={offer} onResolved={() => setOffer(null)} />}

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="font-display text-lg">Today&apos;s schedule</h2>
          <Link href="/jobs" className="tap text-xs text-accent hover:underline">
            All jobs →
          </Link>
        </div>
        {!jobsToday.length ? (
          <EmptyState
            title="No jobs scheduled today"
            description={online ? "We'll send offers when there's a match nearby." : 'Go online to start receiving offers.'}
          />
        ) : (
          <ul className="space-y-2">
            {jobsToday.map((j) => (
              <li key={j.id}>
                <Link href={`/jobs/${j.id}`}>
                  <Card className="flex items-center gap-3 transition hover:border-ink">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{j.category?.name ?? 'Job'}</span>
                        <Badge tone={j.status === 'completed' ? 'success' : 'accent'}>{j.status.replace(/_/g, ' ')}</Badge>
                      </div>
                      <div className="text-xs text-muted">
                        {ukDateTime(j.scheduled_at)} · {[j.address?.line1, j.address?.postcode].filter(Boolean).join(', ')}
                      </div>
                      <div className="font-mono-utility text-muted">#{j.short_code}</div>
                    </div>
                    <div className="text-right font-display text-lg">{pence(j.total_pence)}</div>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="h-full !p-3 transition hover:border-ink">
      <div className="font-mono-utility text-muted">{label}</div>
      <div className="font-display text-lg">{value}</div>
      {sub && <div className="text-[10px] text-muted">{sub}</div>}
    </Card>
  );
}

function greet() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

