const { productMapFromDb } = require("./cart-lines");

/**
 * Persist only product reference + savedAt. Product fields always come from
 * the products collection when building API responses.
 */
function normaliseStoredSaved(input) {
  const productId = String(input?.productId || input?.id || "").trim();
  if (!productId) return null;
  const savedAt =
    typeof input?.savedAt === "string" && input.savedAt.trim()
      ? input.savedAt.trim()
      : new Date().toISOString();
  return { productId, savedAt };
}

/**
 * Join saved rows with live catalog products. Drops rows whose product no
 * longer exists.
 */
function enrichSavedItems(db, storedItems) {
  const map = productMapFromDb(db);
  const items = [];

  for (const raw of storedItems || []) {
    const productId = String(raw?.productId || raw?.id || "").trim();
    if (!productId) continue;
    const product = map.get(productId);
    if (!product) continue;

    const savedAt =
      typeof raw?.savedAt === "string" && raw.savedAt.trim()
        ? raw.savedAt.trim()
        : new Date().toISOString();

    items.push({
      productId,
      savedAt,
      product: { ...product },
    });
  }

  return { items };
}

function buildSavedResponse(db, entry) {
  const enriched = enrichSavedItems(db, entry.items);
  return {
    ...enriched,
    updatedAt: entry.updatedAt,
  };
}

/** Strip legacy snapshot fields; keep only productId + savedAt in storage. */
function persistSavedItems(rawItems) {
  const seen = new Map();
  for (const raw of rawItems || []) {
    const row = normaliseStoredSaved(raw);
    if (!row) continue;
    const prior = seen.get(row.productId);
    if (!prior || Date.parse(row.savedAt) < Date.parse(prior.savedAt)) {
      seen.set(row.productId, row);
    }
  }
  return Array.from(seen.values());
}

module.exports = {
  normaliseStoredSaved,
  enrichSavedItems,
  buildSavedResponse,
  persistSavedItems,
  productMapFromDb,
};
