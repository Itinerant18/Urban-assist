'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '../../../components/cart-context';
import { Card, Button, EmptyState, Skeleton } from '@urban-assist/ui';
import { pence, quote } from '@urban-assist/lib';
import { Clock, Trash2, ArrowRight, ShoppingBag } from 'lucide-react';
import { vatLabel } from '@urban-assist/ui';

export default function CartPage() {
  const { cart, hydrated, removeFromCart } = useCart();
  const router = useRouter();

  if (!hydrated) {
    return (
      <div className="space-y-4 py-6">
        <div>
          <p className="font-mono-utility text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-deep">
            Booking
          </p>
          <h1 className="mt-2 text-[26px] font-extrabold tracking-tight text-ink">Cart</h1>
        </div>
        <Card className="border border-hairline bg-white p-4 rounded-xl">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="mt-3 h-4 w-2/3" />
          <Skeleton className="mt-6 h-10 w-full" />
        </Card>
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  if (!cart) {
    return (
      <div className="space-y-4 py-6">
        <div>
          <p className="font-mono-utility text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-deep">
            Booking
          </p>
          <h1 className="mt-2 text-[26px] font-extrabold tracking-tight text-ink">Cart</h1>
        </div>
        <EmptyState
          title="Your cart is empty"
          description="Find a service to get started."
          icon={<ShoppingBag className="h-8 w-8 text-amber-deep" />}
          action={
            <Link href="/">
              <Button>Find a service</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-5 py-6">
      <div>
        <p className="font-mono-utility text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-deep">
          Booking
        </p>
        <h1 className="mt-2 text-[26px] font-extrabold tracking-tight text-ink">Cart</h1>
      </div>
      <Card className="flex flex-col gap-4 border border-hairline bg-white p-4 rounded-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="font-mono-utility text-xs text-muted">Service Selection</span>
            <h2 className="mt-1 font-display text-lg font-bold text-ink">{cart.title}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> {cart.durationMins} min
              </span>
              <span>·</span>
              <span>Provider: {cart.providerName}</span>
            </div>
          </div>
          <button
            onClick={removeFromCart}
            className="tap flex h-8 w-8 items-center justify-center rounded-xl bg-danger/10 text-danger transition hover:bg-danger/20"
            aria-label="Remove item"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <hr className="border-hairline" />

        {/* Same VAT breakdown the checkout shows — the cart used to present the
            net figure as "Total Price". */}
        {(() => {
          const q = quote(cart.pricePence);
          return (
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted">Subtotal</span>
                <span className="font-mono-utility font-medium text-ink">{pence(q.subtotal_pence)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">{vatLabel}</span>
                <span className="font-mono-utility font-medium text-ink">{pence(q.vat_pence)}</span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <div>
                  <div className="text-xs text-muted">Total (inc. VAT)</div>
                  <div className="font-mono-utility font-display text-xl font-bold text-ink">
                    {pence(q.total_pence)}
                  </div>
                </div>
                <Button
                  onClick={() => router.push(`/book/${cart.id}`)}
                  className="flex items-center gap-2"
                >
                  Checkout <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })()}
      </Card>
    </div>
  );
}
