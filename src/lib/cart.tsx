"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { CartItem } from "@/lib/types";

type CartState = {
  items: CartItem[];
};

type CartApi = CartState & {
  addItem: (item: Omit<CartItem, "qty"> & { qty?: number }) => void;
  setQty: (key: { productSlug: string; variantId: string }, qty: number) => void;
  removeItem: (key: { productSlug: string; variantId: string }) => void;
  clear: () => void;
};

const STORAGE_KEY = "burger-size.cart.v1";

function sameKey(a: { productSlug: string; variantId: string }, b: { productSlug: string; variantId: string }) {
  return a.productSlug === b.productSlug && a.variantId === b.variantId;
}

function safeParse(json: string | null): CartState | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json) as CartState;
    if (!parsed || !Array.isArray(parsed.items)) return null;
    return {
      items: parsed.items
        .filter(
          (x) =>
            x &&
            typeof x.productSlug === "string" &&
            typeof x.variantId === "string" &&
            typeof x.title === "string" &&
            typeof x.variantTitle === "string" &&
            typeof x.priceRub === "number" &&
            typeof x.imageUrl === "string" &&
            typeof x.qty === "number",
        )
        .map((x) => ({
          productSlug: x.productSlug,
          variantId: x.variantId,
          title: x.title,
          variantTitle: x.variantTitle,
          priceRub: Math.max(0, Math.floor(x.priceRub)),
          imageUrl: x.imageUrl,
          qty: Math.max(0, Math.floor(x.qty)),
        }))
        .filter((x) => x.qty > 0),
    };
  } catch {
    return null;
  }
}

const CartContext = createContext<CartApi | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<CartState>(() => {
    if (typeof window === "undefined") return { items: [] };
    return safeParse(window.localStorage.getItem(STORAGE_KEY)) ?? { items: [] };
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const addItem = useCallback((item: Omit<CartItem, "qty"> & { qty?: number }) => {
    const qty = Math.max(1, Math.floor(item.qty ?? 1));
    setState((prev) => {
      const idx = prev.items.findIndex((x) => sameKey(x, item));
      if (idx === -1)
        return {
          items: [
            ...prev.items,
            {
              productSlug: item.productSlug,
              variantId: item.variantId,
              title: item.title,
              variantTitle: item.variantTitle,
              priceRub: item.priceRub,
              imageUrl: item.imageUrl,
              qty,
            },
          ],
        };
      const next = [...prev.items];
      next[idx] = { ...next[idx], qty: next[idx].qty + qty };
      return { items: next };
    });
  }, []);

  const setQty = useCallback((key: { productSlug: string; variantId: string }, qtyRaw: number) => {
    const qty = Math.max(0, Math.floor(qtyRaw));
    setState((prev) => {
      const next = prev.items
        .map((x) => (sameKey(x, key) ? { ...x, qty } : x))
        .filter((x) => x.qty > 0);
      return { items: next };
    });
  }, []);

  const removeItem = useCallback((key: { productSlug: string; variantId: string }) => {
    setState((prev) => ({ items: prev.items.filter((x) => !sameKey(x, key)) }));
  }, []);

  const clear = useCallback(() => setState({ items: [] }), []);

  const value = useMemo<CartApi>(() => ({ ...state, addItem, setQty, removeItem, clear }), [state, addItem, setQty, removeItem, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartApi {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

