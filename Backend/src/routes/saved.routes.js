const express = require("express");
const { withDb } = require("../lib/store");
const authMiddleware = require("../middleware/auth");
const {
  normaliseStoredSaved,
  buildSavedResponse,
  persistSavedItems,
  productMapFromDb,
} = require("../lib/saved-items");
const { withUserProfile, touchSaved } = require("../lib/user-profile");

const router = express.Router();

router.use(authMiddleware);

const MAX_ITEMS = 100;

function requireSaved(db, userId) {
  const user = withUserProfile(db, userId);
  if (!user) return null;
  return user.savedItems;
}

router.get("/", async (req, res) => {
  const result = await withDb(async (db) => {
    const entry = requireSaved(db, req.user.sub);
    if (!entry) return { error: "User not found" };
    entry.items = persistSavedItems(entry.items);
    return buildSavedResponse(db, entry);
  });
  return res.json(result);
});

/**
 * Replace the whole list (login merge). Body items: { productId } or legacy { id }.
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
    const map = productMapFromDb(db);
    const seen = new Map();

    for (const it of entry.items) {
      const row = normaliseStoredSaved(it);
      if (row && map.has(row.productId)) seen.set(row.productId, row);
    }
    for (const raw of incoming) {
      const row = normaliseStoredSaved(raw);
      if (!row || !map.has(row.productId)) continue;
      if (!seen.has(row.productId)) seen.set(row.productId, row);
    }

    entry.items = Array.from(seen.values()).slice(0, MAX_ITEMS);
    touchSaved(entry);
    return buildSavedResponse(db, entry);
  });

  return res.json(result);
});

/** Body: { productId } — product fields loaded from products collection. */
router.post("/items", async (req, res) => {
  const productId = String(
    req.body?.productId || req.body?.id || ""
  ).trim();

  if (!productId) {
    return res.status(400).json({ message: "productId is required" });
  }

  const result = await withDb(async (db) => {
    const product = (db.products || []).find((p) => String(p.id) === productId);
    if (!product) return { notFound: true };

    const entry = requireSaved(db, req.user.sub);
    if (!entry) return { error: "User not found" };

    if (!entry.items.some((i) => String(i.productId || i.id) === productId)) {
      if (entry.items.length >= MAX_ITEMS) {
        return { error: `Saved list cannot exceed ${MAX_ITEMS} items` };
      }
      entry.items.unshift({
        productId,
        savedAt: new Date().toISOString(),
      });
      touchSaved(entry);
    }

    return buildSavedResponse(db, entry);
  });

  if (result.notFound) {
    return res.status(404).json({ message: "Product not found" });
  }
  if (result.error) return res.status(400).json({ message: result.error });
  return res.json(result);
});

router.delete("/items/:id", async (req, res) => {
  const productId = String(req.params.id);
  const result = await withDb(async (db) => {
    const entry = requireSaved(db, req.user.sub);
    if (!entry) return { error: "User not found" };
    entry.items = entry.items.filter(
      (i) => String(i.productId || i.id) !== productId
    );
    touchSaved(entry);
    return buildSavedResponse(db, entry);
  });
  return res.json(result);
});

router.delete("/", async (req, res) => {
  const result = await withDb(async (db) => {
    const entry = requireSaved(db, req.user.sub);
    if (!entry) return { error: "User not found" };
    entry.items = [];
    touchSaved(entry);
    return buildSavedResponse(db, entry);
  });
  return res.json(result);
});

module.exports = router;
