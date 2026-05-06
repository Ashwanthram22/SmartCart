import { useCallback, useEffect, useMemo, useState } from "react";
import { SavedContext } from "./saved-context";
import { savedItemFromProduct } from "../utils/savedItemFromProduct";

const STORAGE_KEY = "aicart_saved_v1";

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

export function SavedProvider({ children }) {
  const [items, setItems] = useState(readStored);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ items }));
  }, [items]);

  const isSaved = useCallback(
    (productId) => items.some((i) => i.id === String(productId)),
    [items]
  );

  const toggleSaved = useCallback((product) => {
    if (!product?.id) return;
    const id = String(product.id);
    setItems((prev) => {
      if (prev.some((i) => i.id === id)) {
        return prev.filter((i) => i.id !== id);
      }
      return [savedItemFromProduct(product), ...prev];
    });
  }, []);

  const removeSaved = useCallback((productId) => {
    const id = String(productId);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const value = useMemo(
    () => ({ items, isSaved, toggleSaved, removeSaved }),
    [items, isSaved, toggleSaved, removeSaved]
  );

  return <SavedContext.Provider value={value}>{children}</SavedContext.Provider>;
}
