'use client';
import * as React from 'react';

export interface CartItem {
  id: string; // provider_service_id
  title: string;
  pricePence: number;
  durationMins: number;
  providerName: string;
  providerAvatar: string | null;
}

interface CartContextType {
  cart: CartItem | null;
  hydrated: boolean;
  addToCart: (item: CartItem) => void;
  removeFromCart: () => void;
}

// v2: carts saved before the clear-on-booking-success fix could hold an
// already-booked item with a live Checkout button. Bumping the key drops
// every pre-fix cart exactly once (a cart is one item — two taps to re-add).
const KEY = 'ua_cart_v2';

const CartContext = React.createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = React.useState<CartItem | null>(null);
  const [hydrated, setHydrated] = React.useState(false);

  // Load from localStorage on mount
  React.useEffect(() => {
    localStorage.removeItem('ua_cart');
    const saved = localStorage.getItem(KEY);
    if (saved) {
      try {
        setCart(JSON.parse(saved));
      } catch {
        localStorage.removeItem(KEY);
      }
    }
    setHydrated(true);
  }, []);

  const addToCart = React.useCallback((item: CartItem) => {
    setCart(item);
    localStorage.setItem(KEY, JSON.stringify(item));
  }, []);

  const removeFromCart = React.useCallback(() => {
    setCart(null);
    localStorage.removeItem(KEY);
  }, []);

  return (
    <CartContext.Provider value={{ cart, hydrated, addToCart, removeFromCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = React.useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
}
