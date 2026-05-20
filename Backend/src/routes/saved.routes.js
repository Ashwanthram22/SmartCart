const express = require("express");
const { withDb } = require("../lib/store");
const authMiddleware = require("../middleware/auth");

const { withUserProfile, touchSaved } = require("../lib/user-profile");

const router = express.Router();

router.use(authMiddleware);

const MAX_ITEMS = 100;

function requireSaved(db, userId) {
  const user = withUserProfile(db, userId);
  if (!user) return null;
  return user.savedItems;
}

/**
 * Normalise a saved item payload. Like the cart, we keep the snapshot
 * fields client-side too (title, image, subtitle, price) so the saved
 * page renders instantly without re-fetching every product. The optional
 * `category` is the chip-group ("electronics" | "home" | "apparel") the
 * frontend uses for filtering, so we let the client tell us once and store
 * it alongside the item rather than recomputing on every request.
 */
function normaliseItem(input) {
  const id = String(input?.id || "").trim();
  if (!id) return null;
  const priceNum = Number(input?.price);
  const ratingNum = Number(input?.rating);
  const stockNum = Number(input?.stock);
  return {
    id,
    title: String(input?.title || "").trim() || id,
    subtitle: typeof input?.subtitle === "string" ? input.subtitle : "",
    image: typeof input?.image === "string" ? input.image : "",
    category: typeof input?.category === "string" ? input.category : "electronics",
    price: Number.isFinite(priceNum) ? priceNum : 0,
    rating: Number.isFinite(ratingNum) ? ratingNum : 0,
    ...(Number.isFinite(stockNum) ? { stock: stockNum } : {}),
    savedAt: new Date().toISOString(),
  };
}

router.get("/", async (req, res) => {
  const result = await withDb(async (db) => {
    const entry = requireSaved(db, req.user.sub);
    if (!entry) return { error: "User not found" };
    return { items: entry.items, updatedAt: entry.updatedAt };
  });
  return res.json(result);
});

/**
 * Replace the whole list. Used when the client merges its guest
 * (localStorage) saved list with the server list on login. The merge
 * strategy is "union, keeping the server's snapshot when the same id
 * exists in both" — we treat re-saving an item as a no-op rather than a
 * timestamp bump.
 */
router.put("/", async (req, res) => {
  const incoming = Array.isArray(req.body?.items) ? req.body.items : [];
  if (incoming.length > MAX_ITEMS) {
    return res
      .status(400)
      .json({ message: `Saved list cannot exceed ${MAX_ITEMS} items` });
  }

  const result = await withDb(async (db) => {
    const entry = requireSaved(db, req.user.sub);
    if (!entry) return { error: "User not found" };
    const seen = new Map();
    // Existing items take precedence so we keep the original savedAt.
    for (const it of entry.items) seen.set(it.id, it);
    for (const raw of incoming) {
      const item = normaliseItem(raw);
      if (!item) continue;
      if (!seen.has(item.id)) seen.set(item.id, item);
    }
    entry.items = Array.from(seen.values()).slice(0, MAX_ITEMS);
    touchSaved(entry);
    return { items: entry.items, updatedAt: entry.updatedAt };
  });

  return res.json(result);
});

/** Add a single item (no-op if already saved). */
router.post("/items", async (req, res) => {
  const result = await withDb(async (db) => {
    const entry = requireSaved(db, req.user.sub);
    if (!entry) return { error: "User not found" };
    const item = normaliseItem(req.body);
    if (!item) return { error: "Item id is required" };
    if (entry.items.length >= MAX_ITEMS) {
      return { error: `Saved list cannot exceed ${MAX_ITEMS} items` };
    }
    if (!entry.items.some((i) => i.id === item.id)) {
      entry.items.unshift(item);
      touchSaved(entry);
    }
    return { items: entry.items, updatedAt: entry.updatedAt };
  });
  if (result.error) return res.status(400).json({ message: result.error });
  return res.json(result);
});

router.delete("/items/:id", async (req, res) => {
  const id = String(req.params.id);
  const result = await withDb(async (db) => {
    const entry = requireSaved(db, req.user.sub);
    if (!entry) return { error: "User not found" };
    entry.items = entry.items.filter((i) => i.id !== id);
    touchSaved(entry);
    return { items: entry.items, updatedAt: entry.updatedAt };
  });
  return res.json(result);
});

router.delete("/", async (req, res) => {
  const result = await withDb(async (db) => {
    const entry = requireSaved(db, req.user.sub);
    if (!entry) return { error: "User not found" };
    entry.items = [];
    touchSaved(entry);
    return { items: entry.items, updatedAt: entry.updatedAt };
  });
  return res.json(result);
});

module.exports = router;
