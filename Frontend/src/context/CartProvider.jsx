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

/**
 * Fold two carts (server + local) into one, summing quantities by productId.
 * Local snapshot fields win where the server doesn't have them, so newly added
 * lines from a guest session keep their title/image after merge.
 */
function mergeCarts(serverItems, localItems) {
  const map = new Map();
  for (const item of serverItems) map.set(item.productId, { ...item });
  for (const item of localItems) {
    if (!item?.productId) continue;
    const prior = map.get(item.productId);
    if (prior) {
      const cap =
        typeof prior.stockAvailable === "number" ? prior.stockAvailable : Infinity;
      prior.quantity = Math.min(cap, prior.quantity + (Number(item.quantity) || 0));
    } else {
      map.set(item.productId, { ...item });
    }
  }
  return Array.from(map.values());
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(readStoredItems);
  const [authed, setAuthed] = useState(isAuthenticated);
  const syncGenRef = useRef(0);
  const isSyncingRef = useRef(false);

  /** Mirror local cart to localStorage so guests / refreshes / offline work. */
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ items }));
  }, [items]);

  /** Keep auth state reactive so we trigger a sync on login/logout. */
  useEffect(() => {
    return onAuthChange(({ authenticated }) => setAuthed(authenticated));
  }, []);

  /**
   * On login: merge any guest items with whatever the server already has,
   * push the result back, and adopt the server's view as the new local cart.
   * On logout: drop the cart so a different user signing in next never sees
   * the previous user's items.
   */
  useEffect(() => {
    if (!authed) {
      setItems([]);
      return undefined;
    }

    let cancelled = false;
    isSyncingRef.current = true;
    const myGen = ++syncGenRef.current;

    (async () => {
      try {
        const localItems = readStoredItems();
        const server = await getCart();
        if (cancelled || myGen !== syncGenRef.current) return;

        const serverItems = Array.isArray(server?.items) ? server.items : [];
        if (localItems.length === 0) {
          setItems(serverItems);
          return;
        }
        const merged = mergeCarts(serverItems, localItems);
        const pushed = await replaceCart(merged);
        if (cancelled || myGen !== syncGenRef.current) return;
        setItems(Array.isArray(pushed?.items) ? pushed.items : merged);
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

  /**
   * Helper: when the server returns the canonical cart after a mutation we
   * adopt it as the truth; if the request failed we just keep the optimistic
   * state and try a full refetch so the next render matches reality.
   */
  const syncFromResponse = useCallback(async (promise, fallbackOptimistic) => {
    if (!isAuthenticated()) {
      // guest mode: optimistic state is the only state
      return;
    }
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
        /* ignore — keep optimistic */
      }
      if (fallbackOptimistic) fallbackOptimistic();
    }
  }, []);

  const addItem = useCallback(
    (payload) => {
      const qty = Math.max(1, Number(payload.quantity) || 1);
      const payloadStock =
        typeof payload.stockAvailable === "number" && Number.isFinite(payload.stockAvailable)
          ? Math.max(0, payload.stockAvailable)
          : null;

      if (payloadStock !== null && payloadStock < 1) return false;

      let accepted = false;
      let snapshotBefore = null;
      setItems((prev) => {
        snapshotBefore = prev;
        const idx = prev.findIndex((i) => i.productId === payload.productId);
        const existing = idx >= 0 ? prev[idx] : null;
        const lineStock =
          payloadStock !== null
            ? payloadStock
            : typeof existing?.stockAvailable === "number"
              ? existing.stockAvailable
              : Infinity;
        const existingQty = existing?.quantity ?? 0;
        if (existingQty + qty > lineStock) return prev;

        accepted = true;
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = {
            ...next[idx],
            quantity: next[idx].quantity + qty,
            ...(payloadStock !== null ? { stockAvailable: payloadStock } : {}),
          };
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
            ...(payloadStock !== null ? { stockAvailable: payloadStock } : {}),
          },
        ];
      });

      if (accepted) {
        syncFromResponse(
          () =>
            addCartItem({
              productId: payload.productId,
              title: payload.title,
              image: payload.image,
              subtitle: payload.subtitle || "",
              unitPrice: Number(payload.unitPrice),
              quantity: qty,
              ...(payloadStock !== null ? { stockAvailable: payloadStock } : {}),
            }),
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
        const cap = typeof item.stockAvailable === "number" ? item.stockAvailable : Infinity;
        nextQ = Math.min(q, cap);
        if (nextQ < 1) return prev.filter((i) => i.productId !== productId);
        return prev.map((i) =>
          i.productId === productId ? { ...i, quantity: nextQ } : i
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
}
