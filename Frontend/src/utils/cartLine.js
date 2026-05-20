/**
 * Cart lines use the same product JSON as the catalog (`line.product`).
 * Subtitle in the UI is derived from category + rating, not a stored field.
 */

export function cartLineSubtitle(product) {
  if (!product) return "";
  const category = product.category || "Product";
  const rating =
    product.rating != null && Number.isFinite(Number(product.rating))
      ? `${product.rating}★`
      : "—★";
  return `${category} • ${rating} rated`;
}

export function cartLineUnitPrice(line) {
  return Number(line?.product?.price ?? line?.unitPrice ?? 0);
}

export function cartLineStock(line) {
  const stock = line?.product?.stock;
  return typeof stock === "number" && Number.isFinite(stock) ? stock : null;
}

export function cartLineTitle(line) {
  return line?.product?.title || line?.title || line?.productId || "";
}

export function cartLineImage(line) {
  return (
    line?.product?.image ||
    (Array.isArray(line?.product?.images) && line.product.images[0]) ||
    line?.image ||
    ""
  );
}

/** Normalize add-to-cart input: full product object or legacy snapshot. */
export function resolveAddToCartInput(input, quantityOverride) {
  if (!input) return null;

  if (input.product?.id) {
    return {
      product: input.product,
      quantity: Math.max(1, Number(quantityOverride ?? input.quantity) || 1),
    };
  }

  if (input.id) {
    return {
      product: input,
      quantity: Math.max(1, Number(quantityOverride ?? input.quantity) || 1),
    };
  }

  if (input.productId) {
    return {
      product: {
        id: input.productId,
        title: input.title || input.productId,
        image: input.image || "",
        category: input.category || "Product",
        price: Number(input.unitPrice ?? input.price) || 0,
        rating: input.rating ?? 0,
        stock: input.stockAvailable ?? input.stock,
      },
      quantity: Math.max(1, Number(quantityOverride ?? input.quantity) || 1),
    };
  }

  return null;
}

/** Build a cart line for optimistic UI / localStorage. */
export function buildCartLine(product, quantity) {
  const productId = String(product.id);
  const qty = Math.max(1, Math.floor(Number(quantity) || 1));
  const unitPrice = Number(product.price) || 0;
  return {
    productId,
    quantity: qty,
    product: { ...product },
    lineTotal: Number((unitPrice * qty).toFixed(2)),
  };
}

/**
 * Merge guest (localStorage) cart into server cart on login only.
 * - Lines only on the server → keep server row
 * - Lines only in local → add them
 * - Same productId on both → use the higher qty (never sum — avoids 1+1=2 dupes)
 */
export function mergeGuestCartLines(serverItems, localItems) {
  const map = new Map();
  for (const line of serverItems || []) {
    if (!line?.productId) continue;
    map.set(String(line.productId), { ...line });
  }
  for (const line of localItems || []) {
    if (!line?.productId) continue;
    const id = String(line.productId);
    const prior = map.get(id);
    const stock = cartLineStock(line);
    const cap = typeof stock === "number" ? stock : Infinity;
    if (prior) {
      const mergedQty = Math.min(
        cap,
        Math.max(prior.quantity || 0, line.quantity || 0)
      );
      map.set(id, {
        ...prior,
        quantity: mergedQty,
        lineTotal: Number((cartLineUnitPrice(prior) * mergedQty).toFixed(2)),
      });
    } else {
      map.set(id, { ...line });
    }
  }
  return Array.from(map.values());
}

/** Minimal payload for PUT /cart/items sync (id + qty only). */
export function storedCartLines(items) {
  return (items || []).map((line) => ({
    productId: line.productId,
    quantity: line.quantity,
  }));
}
