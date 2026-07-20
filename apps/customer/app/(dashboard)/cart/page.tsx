'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '../../../components/cart-context';
import { Card, Button, EmptyState } from '@urban-assist/ui';
import { pence } from '@urban-assist/lib';
import { Clock, Trash2, ArrowRight } from 'lucide-react';

export default function CartPage() {
  const { cart, removeFromCart } = useCart();
  const router = useRouter();

  if (!cart) {
    return (
      <div className="space-y-4 py-6">
        <h1 className="font-display text-xl">Cart</h1>
        <EmptyState
          title="Your cart is empty"
          description="Find a service to get started."
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
      <h1 className="font-display text-xl">Cart</h1>
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

        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted">Total Price</div>
            <div className="font-display text-xl font-bold text-ink">{pence(cart.pricePence)}</div>
          </div>
          <Button
            onClick={() => router.push(`/book/${cart.id}`)}
            className="flex items-center gap-2"
          >
            Checkout <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
