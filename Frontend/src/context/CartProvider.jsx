import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CartContext } from "./cart-context";
import { isAuthenticated, onAuthChange } from "../utils/authToken";
import {
  addCartItem,
  clearCartServer,
  getCart,
  removeCartItem,
  replaceCart,
  setCartItemQuantity,
} from "../api/client";
import {
  buildCartLine,
  cartLineStock,
  mergeGuestCartLines,
  resolveAddToCartInput,
  storedCartLines,
} from "../utils/cartLine";

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

function adoptServerCart(data) {
  return Array.isArray(data?.items) ? data.items : [];
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(readStoredItems);
  const [authed, setAuthed] = useState(isAuthenticated);
  const syncGenRef = useRef(0);
  const isSyncingRef = useRef(false);
  /** True only right after login — used to merge guest localStorage once, not on refresh. */
  const mergeGuestOnLoadRef = useRef(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ items }));
  }, [items]);

  useEffect(() => {
    return onAuthChange(({ authenticated }) => {
      setAuthed(authenticated);
      if (authenticated) {
        mergeGuestOnLoadRef.current = true;
      } else {
        mergeGuestOnLoadRef.current = false;
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* ignore */
        }
      }
    });
  }, []);

  useEffect(() => {
    if (!authed) {
      setItems([]);
      return undefined;
    }

    const shouldMergeGuest = mergeGuestOnLoadRef.current;
    mergeGuestOnLoadRef.current = false;

    let cancelled = false;
    isSyncingRef.current = true;
    const myGen = ++syncGenRef.current;

    (async () => {
      try {
        const server = await getCart();
        if (cancelled || myGen !== syncGenRef.current) return;

        const serverItems = adoptServerCart(server);

        // Normal page load / refresh: server is the only source of truth.
        if (!shouldMergeGuest) {
          setItems(serverItems);
          return;
        }

        // Login only: fold guest localStorage cart into the server cart once.
        const localItems = readStoredItems();
        if (localItems.length === 0) {
          setItems(serverItems);
          return;
        }
        const merged = mergeGuestCartLines(serverItems, localItems);
        const pushed = await replaceCart(storedCartLines(merged));
        if (cancelled || myGen !== syncGenRef.current) return;
        setItems(adoptServerCart(pushed));
      } catch {
        // network failure: keep using local cache silently
      } finally {
        if (!cancelled) isSyncingRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authed]);

  const syncFromResponse = useCallback(async (promise, fallbackOptimistic) => {
    if (!isAuthenticated()) return;
    try {
      const res = await promise();
      if (res && Array.isArray(res.items)) {
        setItems(res.items);
      }
    } catch {
      try {
        const fresh = await getCart();
        if (fresh && Array.isArray(fresh.items)) {
          setItems(fresh.items);
          return;
        }
      } catch {
        /* keep optimistic */
      }
      if (fallbackOptimistic) fallbackOptimistic();
    }
  }, []);

  const addItem = useCallback(
    (input, quantityOverride) => {
      const resolved = resolveAddToCartInput(input, quantityOverride);
      if (!resolved?.product?.id) return false;

      const { product, quantity: qty } = resolved;
      const productId = String(product.id);
      const stock = cartLineStock({ product });
      if (stock !== null && stock < 1) return false;

      let accepted = false;
      let snapshotBefore = null;

      setItems((prev) => {
        snapshotBefore = prev;
        const idx = prev.findIndex((i) => i.productId === productId);
        const existing = idx >= 0 ? prev[idx] : null;
        const lineStock =
          stock !== null
            ? stock
            : cartLineStock(existing) ?? Infinity;
        const existingQty = existing?.quantity ?? 0;
        if (existingQty + qty > lineStock) return prev;

        accepted = true;
        if (idx >= 0) {
          const next = [...prev];
          const mergedQty = existingQty + qty;
          next[idx] = buildCartLine(
            { ...existing.product, ...product },
            mergedQty
          );
          return next;
        }
        return [...prev, buildCartLine(product, qty)];
      });

      if (accepted) {
        syncFromResponse(
          () => addCartItem({ productId, quantity: qty }),
          () => setItems(snapshotBefore || [])
        );
      }
      return accepted;
    },
    [syncFromResponse]
  );

  const setQuantity = useCallback(
    (productId, quantity) => {
      const q = Math.max(0, Math.floor(Number(quantity)));
      let snapshotBefore = null;
      let nextQ = q;

      setItems((prev) => {
        snapshotBefore = prev;
        const item = prev.find((i) => i.productId === productId);
        if (!item) return prev;
        const stock = cartLineStock(item);
        const cap = typeof stock === "number" ? stock : Infinity;
        nextQ = Math.min(q, cap);
        if (nextQ < 1) return prev.filter((i) => i.productId !== productId);
        return prev.map((i) =>
          i.productId === productId ? buildCartLine(i.product, nextQ) : i
        );
      });

      syncFromResponse(
        () => setCartItemQuantity(productId, nextQ),
        () => setItems(snapshotBefore || [])
      );
    },
    [syncFromResponse]
  );

  const removeItem = useCallback(
    (productId) => {
      let snapshotBefore = null;
      setItems((prev) => {
        snapshotBefore = prev;
        return prev.filter((i) => i.productId !== productId);
      });
      syncFromResponse(
        () => removeCartItem(productId),
        () => setItems(snapshotBefore || [])
      );
    },
    [syncFromResponse]
  );

  const clearCart = useCallback(() => {
    let snapshotBefore = null;
    setItems((prev) => {
      snapshotBefore = prev;
      return [];
    });
    syncFromResponse(
      () => clearCartServer(),
      () => setItems(snapshotBefore || [])
    );
  }, [syncFromResponse]);

  const itemCount = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items]
  );

  const value = useMemo(
    () => ({ items, addItem, setQuantity, removeItem, clearCart, itemCount }),
    [items, addItem, setQuantity, removeItem, clearCart, itemCount]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
