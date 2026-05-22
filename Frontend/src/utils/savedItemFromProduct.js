/** Product `category` as stored in the catalog (e.g. Electronics, Fashion). */
export function getSavedCategory(product) {
  const cat = String(product?.category || "").trim();
  return cat || "Uncategorized";
}

import { buildSavedLine } from "./savedLine";

/** @deprecated Prefer `buildSavedLine` — kept for any legacy imports. */
export function savedItemFromProduct(product) {
  return buildSavedLine(product);
}
