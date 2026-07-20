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
  addToCart: (item: CartItem) => void;
  removeFromCart: () => void;
}

const CartContext = React.createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = React.useState<CartItem | null>(null);

  // Load from localStorage on mount
  React.useEffect(() => {
    const saved = localStorage.getItem('ua_cart');
    if (saved) {
      try {
        setCart(JSON.parse(saved));
      } catch {
        localStorage.removeItem('ua_cart');
      }
    }
  }, []);

  const addToCart = React.useCallback((item: CartItem) => {
    setCart(item);
    localStorage.setItem('ua_cart', JSON.stringify(item));
  }, []);

  const removeFromCart = React.useCallback(() => {
    setCart(null);
    localStorage.removeItem('ua_cart');
  }, []);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = React.useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
}
