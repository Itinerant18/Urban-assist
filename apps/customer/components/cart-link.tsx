'use client';
import * as React from 'react';
import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { useCart } from './cart-context';

export function CartLink() {
  const { cart } = useCart();
  return (
    <Link
      href="/cart"
      aria-label="Cart"
      className="relative tap flex items-center justify-center rounded-full p-2 hover:bg-hairline/40 transition"
    >
      <ShoppingCart className="h-5 w-5 text-ink" />
      {cart && (
        <span className="absolute right-1.5 top-1.5 flex h-2.5 w-2.5 rounded-full bg-accent" />
      )}
    </Link>
  );
}
