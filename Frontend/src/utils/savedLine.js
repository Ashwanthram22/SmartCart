/**
 * Saved rows use the same product JSON as the catalog (`line.product`).
 * UI fields (subtitle, category chip) are derived from `product`, not stored.
 */

import { getSavedCategory } from "./savedItemFromProduct";

export function savedLineId(line) {
  return String(line?.productId || line?.id || line?.product?.id || "");
}

export function savedLineSubtitle(product) {
  if (!product) return "";
  const category = product.category || "Product";
  const rating =
    product.rating != null && Number.isFinite(Number(product.rating))
      ? `${product.rating}★`
      : "—★";
  return `${category} • ${rating} rated`;
}

export function savedLineTitle(line) {
  return line?.product?.title || line?.title || savedLineId(line) || "";
}

export function savedLineImage(line) {
  return (
    line?.product?.image ||
    (Array.isArray(line?.product?.images) && line.product.images[0]) ||
    line?.image ||
    ""
  );
}

export function savedLinePrice(line) {
  return Number(line?.product?.price ?? line?.price ?? 0);
}

export function savedLineRating(line) {
  return Number(line?.product?.rating ?? line?.rating ?? 0);
}

export function savedLineStock(line) {
  const stock = line?.product?.stock ?? line?.stock;
  return typeof stock === "number" && Number.isFinite(stock) ? stock : null;
}

export function savedLineCategory(line) {
  if (line?.product) return getSavedCategory(line.product);
  if (typeof line?.category === "string" && line.category) return line.category;
  return "electronics";
}

/** Build a saved row for optimistic UI / localStorage. */
export function buildSavedLine(product, savedAt) {
  const productId = String(product.id);
  return {
    productId,
    savedAt: savedAt || new Date().toISOString(),
    product: { ...product },
  };
}

/**
 * Merge guest (localStorage) saved list into server list on login only.
 * Prefer the server's `savedAt` when the same product exists on both sides.
 */
export function mergeGuestSavedLines(serverItems, localItems) {
  const map = new Map();
  for (const line of serverItems || []) {
    const id = savedLineId(line);
    if (!id) continue;
    map.set(id, { ...line });
  }
  for (const line of localItems || []) {
    const id = savedLineId(line);
    if (!id) continue;
    if (!map.has(id)) map.set(id, { ...line });
  }
  return Array.from(map.values());
}

/** Minimal payload for PUT /saved sync (product id + savedAt only). */
export function storedSavedLines(items) {
  return (items || [])
    .map((line) => {
      const productId = savedLineId(line);
      if (!productId) return null;
      return {
        productId,
        savedAt:
          typeof line.savedAt === "string" && line.savedAt
            ? line.savedAt
            : new Date().toISOString(),
      };
    })
    .filter(Boolean);
}

/** Normalize toggle input: full product from catalog. */
export function resolveSavedProductInput(input) {
  if (!input) return null;
  if (input.product?.id) return input.product;
  if (input.id) return input;
  return null;
}
