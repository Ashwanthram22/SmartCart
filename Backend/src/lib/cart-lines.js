const MAX_LINE_QTY = 99;

/**
 * Persist only product reference + quantity. Product fields always come from
 * the products collection when building API responses.
 */
function normaliseStoredLine(input) {
  const productId = String(input?.productId || input?.id || "").trim();
  if (!productId) return null;
  const quantity = Math.min(
    MAX_LINE_QTY,
    Math.max(1, Math.floor(Number(input?.quantity) || 1))
  );
  return { productId, quantity };
}

function productMapFromDb(db) {
  return new Map((db.products || []).map((p) => [String(p.id), p]));
}

/**
 * Join cart lines with live catalog products. Drops lines whose product no
 * longer exists. Caps quantity by current stock.
 */
function enrichCartItems(db, storedLines) {
  const map = productMapFromDb(db);
  const items = [];
  let subtotal = 0;
  let itemCount = 0;

  for (const raw of storedLines || []) {
    const productId = String(raw?.productId || "").trim();
    if (!productId) continue;
    const product = map.get(productId);
    if (!product) continue;

    const stock = Number(product.stock);
    const stockCap = Number.isFinite(stock) ? Math.max(0, stock) : MAX_LINE_QTY;
    let quantity = Math.min(
      MAX_LINE_QTY,
      Math.max(1, Math.floor(Number(raw?.quantity) || 1))
    );
    if (stockCap < 1) continue;
    if (quantity > stockCap) quantity = stockCap;

    const unitPrice = Number(product.price) || 0;
    const lineTotal = Number((unitPrice * quantity).toFixed(2));
    subtotal += lineTotal;
    itemCount += quantity;

    items.push({
      productId,
      quantity,
      product: { ...product },
      lineTotal,
    });
  }

  return {
    items,
    subtotal: Number(subtotal.toFixed(2)),
    itemCount,
  };
}

function buildCartResponse(db, cart) {
  const enriched = enrichCartItems(db, cart.items);
  return {
    ...enriched,
    updatedAt: cart.updatedAt,
  };
}

module.exports = {
  MAX_LINE_QTY,
  normaliseStoredLine,
  enrichCartItems,
  buildCartResponse,
  productMapFromDb,
};
