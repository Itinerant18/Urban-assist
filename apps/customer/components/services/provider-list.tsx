'use client';
import * as React from 'react';
import Link from 'next/link';
import { Star, Plus, Minus } from 'lucide-react';
import { pence } from '@urban-assist/lib';
import { useCart } from '../cart-context';
import { ReviewAvatar } from '../review-avatar';
import { Button } from '@urban-assist/ui';

interface ProviderService {
  id: string;
  title: string;
  price_pence: number;
  duration_mins: number;
  provider: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    rating_avg: number;
    rating_count: number;
    kyc_status: string;
  };
}

export function ProviderList({ providers }: { providers: ProviderService[] }) {
  const { cart, addToCart, removeFromCart } = useCart();

  return (
    <div className="space-y-4">
      <ul className="mt-3 space-y-3">
        {providers.map((p) => {
          const isAdded = cart?.id === p.id;
          const hasRating =
            Number(p.provider?.rating_avg ?? 0) > 0 && Number(p.provider?.rating_count ?? 0) > 0;
          return (
            <li key={p.id}>
              <div
                className={`card card-shadow flex items-center gap-4 rounded-xl border p-4 bg-white transition ${
                  isAdded ? 'border-accent' : 'border-hairline'
                }`}
              >
                {/* Avatar — initials fallback beats a blank grey circle */}
                <ReviewAvatar
                  name={p.provider?.full_name ?? 'Professional'}
                  src={p.provider?.avatar_url}
                  className="h-11 w-11 text-[13px]"
                />

                {/* Details */}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-bold text-ink">
                    {p.provider?.full_name ?? 'Local professional'}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[12px] text-muted">
                    <span>{p.title}</span>
                    {hasRating ? (
                      <span className="flex items-center gap-0.5">
                        <Star className="h-3 w-3 fill-amber text-amber" />
                        {Number(p.provider.rating_avg).toFixed(1)} ({p.provider.rating_count})
                      </span>
                    ) : (
                      <span className="font-semibold text-success-deep">New</span>
                    )}
                    <span>· {p.duration_mins} min</span>
                  </div>
                </div>

                {/* Action / Price — stacked, not side-by-side: a horizontal pair ate
                    ~188px of a 343px card and squeezed the provider name to "Anik…" */}
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <div className="text-right">
                    <div className="text-[11px] text-muted">From</div>
                    <div className="text-[16px] font-extrabold text-ink">{pence(p.price_pence)}</div>
                  </div>
                  
                  {isAdded ? (
                    <div className="flex items-center gap-2 rounded-xl bg-accent/10 px-2.5 py-1.5 text-accent font-bold text-sm">
                      <span>Added</span>
                      <button
                        onClick={removeFromCart}
                        className="tap rounded px-1.5 py-0.5 hover:bg-accent/10 transition"
                        aria-label="Remove from cart"
                      >
                        <Minus className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </div>
                  ) : (
                    <Button
                      onClick={() =>
                        addToCart({
                          id: p.id,
                          title: p.title,
                          pricePence: p.price_pence,
                          durationMins: p.duration_mins,
                          providerName: p.provider.full_name,
                          providerAvatar: p.provider.avatar_url,
                        })
                      }
                      size="sm"
                      variant="outline"
                      className="flex items-center gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add
                    </Button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Sticky Bottom Cart Summary CTA (Floats over content) */}
      {cart && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-white/95 px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur">
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
