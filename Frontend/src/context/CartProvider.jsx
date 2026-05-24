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

function initialCartItems() {
  return isAuthenticated() ? [] : readStoredItems();
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(initialCartItems);
  const [authed, setAuthed] = useState(isAuthenticated);
  const syncGenRef = useRef(0);
  const itemsRef = useRef(items);
  /** True only right after login — used to merge guest localStorage once, not on refresh. */
  const mergeGuestOnLoadRef = useRef(false);

  itemsRef.current = items;

  // Guest-only cache — logged-in carts live on the server.
  useEffect(() => {
    if (authed) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ items }));
  }, [items, authed]);

  useEffect(() => {
    return onAuthChange(({ authenticated }) => {
      setAuthed(authenticated);
      if (authenticated) {
        mergeGuestOnLoadRef.current = true;
      } else {
        mergeGuestOnLoadRef.current = false;
        setItems(readStoredItems());
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
    const myGen = ++syncGenRef.current;

    (async () => {
      try {
        const server = await getCart();
        if (cancelled || myGen !== syncGenRef.current) return;

        const serverItems = adoptServerCart(server);

        if (!shouldMergeGuest) {
          setItems(serverItems);
          return;
        }

        const localItems = readStoredItems();
        if (localItems.length === 0) {
          setItems(serverItems);
          return;
        }
        const merged = mergeGuestCartLines(serverItems, localItems);
        const pushed = await replaceCart(storedCartLines(merged));
        if (cancelled || myGen !== syncGenRef.current) return;
        setItems(adoptServerCart(pushed));
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* ignore */
        }
      } catch {
        if (cancelled || myGen !== syncGenRef.current) return;
        // Do not show a stale localStorage cart while logged in — it breaks checkout.
        setItems([]);
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

  /**
   * Push the current UI cart to the server (used before checkout).
   * Throws if the server rejects or drops every line.
   */
  const syncCartToServer = useCallback(async () => {
    if (!isAuthenticated()) {
      throw new Error("Sign in to continue checkout");
    }
    const snapshot = itemsRef.current;
    if (snapshot.length === 0) {
      throw new Error("Your cart is empty");
    }
    const res = await replaceCart(storedCartLines(snapshot));
    const serverItems = adoptServerCart(res);
    setItems(serverItems);
    if (serverItems.length === 0) {
      throw new Error(
        "Your cart could not be saved. The items may no longer be available — go back to the cart and try again."
      );
    }
    return serverItems;
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
    () => ({
      items,
      addItem,
      setQuantity,
      removeItem,
      clearCart,
      syncCartToServer,
      itemCount,
    }),
    [items, addItem, setQuantity, removeItem, clearCart, syncCartToServer, itemCount]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
