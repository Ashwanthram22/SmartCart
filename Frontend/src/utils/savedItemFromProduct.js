/**
 * Maps catalog API product → Saved Items page category chips (electronics | home | apparel).
 * @param {Record<string, unknown>} product
 */
export function getSavedCategory(product) {
  const segs = (product.catalogSegments || []).map((s) => String(s).toLowerCase());
  const cat = String(product.category || "").toLowerCase();
  if (segs.some((s) => s.includes("fashion")) || cat === "sports") {
    return "apparel";
  }
  if (
    segs.some((s) => s.includes("home & kitchen")) ||
    cat === "home" ||
    cat === "smart home" ||
    cat === "groceries"
  ) {
    return "home";
  }
  return "electronics";
}

/**
 * @param {Record<string, unknown>} product
 */
export function savedItemFromProduct(product) {
  const stockNum = Number(product.stock);
  return {
    id: String(product.id),
    category: getSavedCategory(product),
    title: String(product.title || ""),
    subtitle: `${product.category || "Product"} • ${product.rating ?? "—"}★ rated`,
    price: Number(product.price) || 0,
    rating: Number(product.rating) || 0,
    image: String(product.image || ""),
    ...(Number.isFinite(stockNum) ? { stock: stockNum } : {}),
  };
}
