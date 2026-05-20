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

import { buildSavedLine } from "./savedLine";

/** @deprecated Prefer `buildSavedLine` — kept for any legacy imports. */
export function savedItemFromProduct(product) {
  return buildSavedLine(product);
}
