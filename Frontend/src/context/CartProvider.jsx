import { useCallback, useEffect, useMemo, useState } from "react";
import { CartContext } from "./cart-context";

const STORAGE_KEY = "aicart_cart_v1";

function readStoredItems() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(readStoredItems);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ items }));
  }, [items]);

  const addItem = useCallback((payload) => {
    const qty = Math.max(1, Number(payload.quantity) || 1);
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.productId === payload.productId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + qty };
        return next;
      }
      return [
        ...prev,
        {
          productId: payload.productId,
          title: payload.title,
          image: payload.image,
          subtitle: payload.subtitle || "",
          unitPrice: Number(payload.unitPrice),
          quantity: qty,
        },
      ];
    });
  }, []);

  const setQuantity = useCallback((productId, quantity) => {
    const q = Math.max(0, Math.floor(Number(quantity)));
    setItems((prev) => {
      if (q < 1) return prev.filter((i) => i.productId !== productId);
      return prev.map((i) => (i.productId === productId ? { ...i, quantity: q } : i));
    });
  }, []);

  const removeItem = useCallback((productId) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const itemCount = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);

  const value = useMemo(
    () => ({ items, addItem, setQuantity, removeItem, itemCount }),
    [items, addItem, setQuantity, removeItem, itemCount]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
