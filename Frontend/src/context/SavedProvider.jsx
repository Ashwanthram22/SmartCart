import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SavedContext } from "./saved-context";
import { savedItemFromProduct } from "../utils/savedItemFromProduct";
import { isAuthenticated, onAuthChange } from "../utils/authToken";
import {
  addSavedItem,
  clearSavedItems as clearSavedServer,
  getSavedItems,
  removeSavedItem,
  replaceSavedItems,
} from "../api/client";

const STORAGE_KEY = "aicart_saved_v1";

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
 * Union-merge by id: prefer the existing entry (server) when both contain
 * the same id so we don't blow away the original `savedAt` timestamp on
 * re-save. Items unique to either side are kept.
 */
function mergeSaved(serverItems, localItems) {
  const map = new Map();
  for (const item of serverItems) map.set(String(item.id), { ...item });
  for (const item of localItems) {
    if (!item?.id) continue;
    const id = String(item.id);
    if (!map.has(id)) map.set(id, { ...item });
  }
  return Array.from(map.values());
}

export function SavedProvider({ children }) {
  const [items, setItems] = useState(readStoredItems);
  const [authed, setAuthed] = useState(isAuthenticated);
  const syncGenRef = useRef(0);

  /** Mirror to localStorage so guest mode + refresh continue to work. */
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ items }));
  }, [items]);

  /**
   * Auth-change subscriber. Drives both the local `authed` flag (which
   * triggers the load effect below) and the immediate logout cleanup.
   * The setItems on logout sits inside an event handler — not the effect
   * body — which is what the React docs recommend for external-system
   * synchronisation.
   */
  useEffect(() => {
    return onAuthChange(({ authenticated }) => {
      setAuthed(authenticated);
      if (!authenticated) setItems([]);
    });
  }, []);

  /**
   * On login: merge any guest items into the server list, push the union
   * back, and adopt the server's view as truth.
   */
  useEffect(() => {
    if (!authed) return undefined;

    let cancelled = false;
    const myGen = ++syncGenRef.current;

    (async () => {
      try {
        const localItems = readStoredItems();
        const server = await getSavedItems();
        if (cancelled || myGen !== syncGenRef.current) return;

        const serverItems = Array.isArray(server?.items) ? server.items : [];
        if (localItems.length === 0) {
          setItems(serverItems);
          return;
        }
        const merged = mergeSaved(serverItems, localItems);
        const pushed = await replaceSavedItems(merged);
        if (cancelled || myGen !== syncGenRef.current) return;
        setItems(Array.isArray(pushed?.items) ? pushed.items : merged);
      } catch {
        // Network failure: keep using local cache silently.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authed]);

  /**
   * Mirror of CartProvider.syncFromResponse — adopts the server's
   * canonical list after a mutation, falls back to a refetch, then
   * finally to a local rollback if everything fails.
   */
  const syncFromResponse = useCallback(async (call, fallbackOptimistic) => {
    if (!isAuthenticated()) return;
    try {
      const res = await call();
      if (res && Array.isArray(res.items)) setItems(res.items);
    } catch {
      try {
        const fresh = await getSavedItems();
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

  const isSaved = useCallback(
    (productId) => items.some((i) => String(i.id) === String(productId)),
    [items]
  );

  const removeSaved = useCallback(
    (productId) => {
      const id = String(productId);
      let snapshotBefore = null;
      setItems((prev) => {
        snapshotBefore = prev;
        return prev.filter((i) => String(i.id) !== id);
      });
      syncFromResponse(
        () => removeSavedItem(id),
        () => setItems(snapshotBefore || [])
      );
    },
    [syncFromResponse]
  );

  const toggleSaved = useCallback(
    (product) => {
      if (!product?.id) return;
      const id = String(product.id);
      const alreadySaved = items.some((i) => String(i.id) === id);

      if (alreadySaved) {
        removeSaved(id);
        return;
      }

      const item = savedItemFromProduct(product);
      let snapshotBefore = null;
      setItems((prev) => {
        snapshotBefore = prev;
        if (prev.some((i) => String(i.id) === id)) return prev;
        return [item, ...prev];
      });
      syncFromResponse(
        () => addSavedItem(item),
        () => setItems(snapshotBefore || [])
      );
    },
    [items, removeSaved, syncFromResponse]
  );

  const clearSaved = useCallback(() => {
    let snapshotBefore = null;
    setItems((prev) => {
      snapshotBefore = prev;
      return [];
    });
    syncFromResponse(
      () => clearSavedServer(),
      () => setItems(snapshotBefore || [])
    );
  }, [syncFromResponse]);

  const value = useMemo(
    () => ({ items, isSaved, toggleSaved, removeSaved, clearSaved }),
    [items, isSaved, toggleSaved, removeSaved, clearSaved]
  );

  return <SavedContext.Provider value={value}>{children}</SavedContext.Provider>;
}
