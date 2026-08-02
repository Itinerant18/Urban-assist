'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';
import { CartProvider } from '../components/cart-context';
import { GlobalMobileCta } from '../components/global-mobile-cta';

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
  }));
  return (
    <QueryClientProvider client={client}>
      <CartProvider>
        {children}
        <GlobalMobileCta />
      </CartProvider>
    </QueryClientProvider>
  );
}
