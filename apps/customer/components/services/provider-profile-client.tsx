'use client';
import * as React from 'react';
import Link from 'next/link';
import { Star, ShieldCheck, CheckCircle2, Award, Clock } from 'lucide-react';
import { pence } from '@urban-assist/lib';
import { Button, Card, Badge } from '@urban-assist/ui';
import { useCart } from '../../components/cart-context';

interface ServiceItem {
  id: string;
  title: string;
  price_pence: number;
  duration_mins: number;
}

interface ReviewItem {
  id: string;
  rating: number;
  comment: string | null;
  author: { full_name: string | null } | null;
}

interface ProviderProfileClientProps {
  provider: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    rating_avg: number;
    rating_count: number;
    kyc_status: string;
    acceptance_rate?: number;
  };
  services: ServiceItem[];
  reviews?: ReviewItem[];
}

export function ProviderProfileClient({ provider, services, reviews = [] }: ProviderProfileClientProps) {
  const { cart, addToCart, removeFromCart } = useCart();

  const reviewsCard = (
    <Card className="border border-hairline bg-white p-5 rounded-xl shadow-card space-y-4">
      <h3 className="font-display text-base font-bold text-ink uppercase tracking-wider border-b border-hairline pb-2">
        Reviews ({reviews.length})
      </h3>
      {reviews.length === 0 ? (
        <p className="text-sm text-muted">No reviews yet — be the first to book.</p>
      ) : (
        <ul className="space-y-4">
          {reviews.map((r) => (
            <li key={r.id} className="space-y-1.5">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`h-3.5 w-3.5 ${s <= r.rating ? 'fill-amber text-amber' : 'text-hairline'}`}
                  />
                ))}
              </div>
              {r.comment ? (
                <p className="text-sm text-ink leading-relaxed italic">"{r.comment}"</p>
              ) : null}
              <p className="text-xs text-muted font-bold">— {r.author?.full_name ?? 'Customer'}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* DESKTOP BREADCRUMB */}
      <nav className="hidden lg:flex items-center gap-1.5 text-xs text-muted">
        <Link href="/" className="hover:text-ink">Home</Link>
        <span>&gt;</span>
        <Link href="/browse" className="hover:text-ink">Browse</Link>
        <span>&gt;</span>
        <span className="font-semibold text-ink">{provider.full_name}</span>
      </nav>

      {/* DESKTOP SPLIT VIEW */}
      <div className="hidden lg:grid grid-cols-[280px,1fr] gap-8 items-start">
        {/* Left Side: Stats and Bio */}
        <aside className="space-y-6">
          <Card className="border border-hairline bg-white p-5 rounded-xl shadow-card text-center space-y-4">
            {/* Photo */}
            <div className="h-28 w-28 rounded-full overflow-hidden bg-hairline mx-auto">
              {provider.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={provider.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : null}
            </div>

            <div>
              <h2 className="font-display text-xl font-bold text-ink">{provider.full_name}</h2>
              <div className="mt-2 flex items-center justify-center gap-1.5 text-sm">
                <Star className="h-4 w-4 fill-amber text-amber" />
                <span className="font-bold text-ink">{Number(provider.rating_avg ?? 0).toFixed(1)}</span>
                <span className="text-muted">({provider.rating_count ?? 0} Reviews)</span>
              </div>
              <p className="text-xs text-muted mt-1 font-semibold text-success">
                {Math.round(Number(provider.acceptance_rate ?? 0.98) * 100)}% Acceptance Rate
              </p>
            </div>

            <hr className="border-hairline" />

            <div className="text-left space-y-2">
              <h4 className="text-xs font-bold text-muted uppercase tracking-wider">Verification</h4>
              <div className="flex items-center gap-2 text-xs text-charcoal">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span>Identity Verified</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-charcoal">
                <ShieldCheck className="h-4 w-4 text-success" />
                <span>Background Checked</span>
              </div>
            </div>
          </Card>

          <Card className="border border-hairline bg-white p-5 rounded-xl shadow-card space-y-2">
            <h4 className="text-xs font-bold text-muted uppercase tracking-wider">About Me</h4>
            <p className="text-xs text-muted leading-relaxed">
              Hi! I have over 5 years of experience in professional home cleaning and property maintenance. Fully vetted, insured, and committed to doing a spotless job.
            </p>
          </Card>
        </aside>

        {/* Right Side: Services & Reviews */}
        <div className="space-y-6">
          <Card className="border border-hairline bg-white p-5 rounded-xl shadow-card space-y-4">
            <h3 className="font-display text-base font-bold text-ink uppercase tracking-wider border-b border-hairline pb-2">
              Available Services
            </h3>

            <ul className="divide-y divide-hairline">
              {services.map((s) => {
                const isAdded = cart?.id === s.id;
                return (
                  <li key={s.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-sm text-ink">{s.title}</h4>
                      <p className="text-xs text-muted mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {s.duration_mins} mins duration
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-display text-base font-extrabold text-ink">
                        {pence(s.price_pence)}
                      </span>
                      {isAdded ? (
                        <div className="flex items-center gap-2 rounded-xl bg-accent/10 px-2.5 py-1.5 text-accent font-bold text-sm">
                          <button onClick={removeFromCart} className="px-1 hover:bg-accent/10 rounded">
                            -
                          </button>
                          <span>1</span>
                          <button className="px-1 opacity-50 cursor-not-allowed" disabled>
                            +
                          </button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() =>
                            addToCart({
                              id: s.id,
                              title: s.title,
                              pricePence: s.price_pence,
                              durationMins: s.duration_mins,
                              providerName: provider.full_name,
                              providerAvatar: provider.avatar_url,
                            })
                          }
                        >
                          ADD TO CART
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>

          {reviewsCard}
        </div>
      </div>

      {/* MOBILE STACKED VIEW */}
      <div className="lg:hidden space-y-5">
        {/* Header Profile card */}
        <Card className="border border-hairline bg-white p-4 rounded-xl shadow-card flex items-center gap-4">
          <div className="h-16 w-16 rounded-full overflow-hidden bg-hairline shrink-0">
            {provider.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={provider.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : null}
          </div>
          <div>
            <h2 className="font-display text-base font-bold text-ink">{provider.full_name}</h2>
            <div className="mt-1 flex items-center gap-1.5 text-xs">
              <Star className="h-3.5 w-3.5 fill-amber text-amber" />
              <span className="font-bold text-ink">{Number(provider.rating_avg ?? 0).toFixed(1)}</span>
              <span className="text-muted">({provider.rating_count ?? 0} Reviews)</span>
            </div>
            <div className="mt-1.5 flex items-center gap-1 text-[10px] text-success font-semibold">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Background Checked & Verified</span>
            </div>
          </div>
        </Card>

        {/* Bio */}
        <Card className="border border-hairline bg-white p-4 rounded-xl shadow-card space-y-1">
          <h4 className="text-xs font-bold text-muted uppercase tracking-wider">About Me</h4>
          <p className="text-xs text-muted leading-relaxed">
            Hi! I have over 5 years of experience in professional home cleaning and property maintenance. Fully vetted, insured, and committed to doing a spotless job.
          </p>
        </Card>

        {/* Services */}
        <Card className="border border-hairline bg-white p-4 rounded-xl shadow-card space-y-3">
          <h3 className="font-display text-sm font-bold text-ink uppercase tracking-wider border-b border-hairline pb-2">
            Services Offered
          </h3>
          <ul className="divide-y divide-hairline">
            {services.map((s) => {
              const isAdded = cart?.id === s.id;
              return (
                <li key={s.id} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-sm text-ink">{s.title}</h4>
                    <p className="text-xs text-muted mt-0.5">{s.duration_mins} mins duration</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-display text-sm font-bold text-ink">
                      {pence(s.price_pence)}
                    </span>
                    {isAdded ? (
                      <div className="flex items-center gap-2 rounded-xl bg-accent/10 px-2 py-1 text-accent font-bold text-sm">
                        <button onClick={removeFromCart} className="px-1">
                          -
                        </button>
                        <span>1</span>
                        <button className="px-1 opacity-50 cursor-not-allowed" disabled>
                          +
                        </button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          addToCart({
                            id: s.id,
                            title: s.title,
                            pricePence: s.price_pence,
                            durationMins: s.duration_mins,
                            providerName: provider.full_name,
                            providerAvatar: provider.avatar_url,
                          })
                        }
                      >
                        ADD +
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        {reviewsCard}
      </div>

      {/* STICKY BOTTOM CART SUMMARY CTA (Floats on mobile) */}
      {cart && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-white/95 px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-bold text-ink text-sm">1 Item</span>
              <span className="text-muted">|</span>
              <span className="font-extrabold text-ink text-base">{pence(cart.pricePence)}</span>
            </div>
            <Link
              href="/cart"
              className="rounded-xl bg-accent px-8 py-3 text-[14px] font-bold text-white transition hover:bg-accent-hover"
            >
              VIEW CART
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
