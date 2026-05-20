import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SavedContext } from "./saved-context";
import { isAuthenticated, onAuthChange } from "../utils/authToken";
import {
  addSavedItem,
  clearSavedItems as clearSavedServer,
  getSavedItems,
  removeSavedItem,
  replaceSavedItems,
} from "../api/client";
import {
  buildSavedLine,
  mergeGuestSavedLines,
  resolveSavedProductInput,
  savedLineId,
  storedSavedLines,
} from "../utils/savedLine";

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

function adoptServerSaved(data) {
  return Array.isArray(data?.items) ? data.items : [];
}

export function SavedProvider({ children }) {
  const [items, setItems] = useState(readStoredItems);
  const [authed, setAuthed] = useState(isAuthenticated);
  const syncGenRef = useRef(0);
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
        setItems([]);
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
        const server = await getSavedItems();
        if (cancelled || myGen !== syncGenRef.current) return;

        const serverItems = adoptServerSaved(server);

        if (!shouldMergeGuest) {
          setItems(serverItems);
          return;
        }

        const localItems = readStoredItems();
        if (localItems.length === 0) {
          setItems(serverItems);
          return;
        }
        const merged = mergeGuestSavedLines(serverItems, localItems);
        const pushed = await replaceSavedItems(storedSavedLines(merged));
        if (cancelled || myGen !== syncGenRef.current) return;
        setItems(adoptServerSaved(pushed));
      } catch {
        /* keep local cache */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authed]);

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
        /* ignore */
      }
      if (fallbackOptimistic) fallbackOptimistic();
    }
  }, []);

  const isSaved = useCallback(
    (productId) =>
      items.some((i) => savedLineId(i) === String(productId)),
    [items]
  );

  const removeSaved = useCallback(
    (productId) => {
      const id = String(productId);
      let snapshotBefore = null;
      setItems((prev) => {
        snapshotBefore = prev;
        return prev.filter((i) => savedLineId(i) !== id);
      });
      syncFromResponse(
        () => removeSavedItem(id),
        () => setItems(snapshotBefore || [])
      );
    },
    [syncFromResponse]
  );

  const toggleSaved = useCallback(
    (input) => {
      const product = resolveSavedProductInput(input);
      if (!product?.id) return;

      const id = String(product.id);
      const alreadySaved = items.some((i) => savedLineId(i) === id);

      if (alreadySaved) {
        removeSaved(id);
        return;
      }

      const line = buildSavedLine(product);
      let snapshotBefore = null;
      setItems((prev) => {
        snapshotBefore = prev;
        if (prev.some((i) => savedLineId(i) === id)) return prev;
        return [line, ...prev];
      });
      syncFromResponse(
        () => addSavedItem({ productId: id }),
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
