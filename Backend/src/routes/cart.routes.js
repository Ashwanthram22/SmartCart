const express = require("express");
const { withDb } = require("../lib/data-store");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

router.use(authMiddleware);

const MAX_LINE_QTY = 99;
const MAX_LINES = 50;

function ensureCart(db, userId) {
  if (!Array.isArray(db.carts)) db.carts = [];
  let cart = db.carts.find((c) => c.userId === userId);
  if (!cart) {
    cart = { userId, items: [], updatedAt: new Date().toISOString() };
    db.carts.push(cart);
  } else if (!Array.isArray(cart.items)) {
    cart.items = [];
  }
  return cart;
}

function touch(cart) {
  cart.updatedAt = new Date().toISOString();
}

/**
 * Normalise a line payload into our canonical shape. We deliberately keep
 * snapshot fields (title, image, unitPrice) on the line itself so:
 *   - cart UX shows cached info instantly
 *   - synthetic items (e.g. the SmartSleeve upsell, which isn't in the
 *     products table) survive across devices
 * Server-authoritative pricing kicks in at order creation time, where lines
 * are re-priced from the products table when available.
 */
function normaliseLine(input, existingStock) {
  const productId = String(input?.productId || "").trim();
  if (!productId) return null;

  const quantity = Math.min(
    MAX_LINE_QTY,
    Math.max(1, Math.floor(Number(input?.quantity) || 1))
  );

  const stockRaw = input?.stockAvailable ?? existingStock;
  const stockAvailable =
    typeof stockRaw === "number" && Number.isFinite(stockRaw)
      ? Math.max(0, stockRaw)
      : null;

  const unitPrice = Number(input?.unitPrice);

  return {
    productId,
    title: String(input?.title || "").trim() || productId,
    image: typeof input?.image === "string" ? input.image : "",
    subtitle: typeof input?.subtitle === "string" ? input.subtitle : "",
    unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
    quantity,
    ...(stockAvailable != null ? { stockAvailable } : {}),
  };
}

router.get("/", async (req, res) => {
  const result = await withDb(async (db) => {
    const cart = ensureCart(db, req.user.sub);
    return { items: cart.items, updatedAt: cart.updatedAt };
  });
  return res.json(result);
});

/**
 * Replace the entire cart. Used when the client merges a guest (localStorage)
 * cart with the server cart on login. We accept up to MAX_LINES items.
 */
router.put("/", async (req, res) => {
  const incoming = Array.isArray(req.body?.items) ? req.body.items : [];
  if (incoming.length > MAX_LINES) {
    return res
      .status(400)
      .json({ message: `Cart cannot exceed ${MAX_LINES} items` });
  }

  const result = await withDb(async (db) => {
    const cart = ensureCart(db, req.user.sub);
    const seen = new Map();
    for (const raw of incoming) {
      const line = normaliseLine(raw);
      if (!line) continue;
      const prior = seen.get(line.productId);
      if (prior) {
        prior.quantity = Math.min(MAX_LINE_QTY, prior.quantity + line.quantity);
      } else {
        seen.set(line.productId, line);
      }
    }
    cart.items = Array.from(seen.values());
    touch(cart);
    return { items: cart.items, updatedAt: cart.updatedAt };
  });

  return res.json(result);
});

/** Add (or increment) a single line. */
router.post("/items", async (req, res) => {
  const result = await withDb(async (db) => {
    const cart = ensureCart(db, req.user.sub);
    const incoming = normaliseLine(req.body);
    if (!incoming) return { error: "productId is required" };

    const idx = cart.items.findIndex((l) => l.productId === incoming.productId);
    if (idx >= 0) {
      const merged = { ...cart.items[idx] };
      merged.quantity = Math.min(
        MAX_LINE_QTY,
        merged.quantity + incoming.quantity
      );
      // preserve newest snapshot fields
      merged.title = incoming.title || merged.title;
      merged.image = incoming.image || merged.image;
      merged.subtitle = incoming.subtitle || merged.subtitle;
      if (Number.isFinite(incoming.unitPrice)) merged.unitPrice = incoming.unitPrice;
      if (incoming.stockAvailable != null) merged.stockAvailable = incoming.stockAvailable;
      cart.items[idx] = merged;
    } else {
      if (cart.items.length >= MAX_LINES) {
        return { error: `Cart cannot exceed ${MAX_LINES} items` };
      }
      cart.items.push(incoming);
    }

    touch(cart);
    return { items: cart.items, updatedAt: cart.updatedAt };
  });

  if (result.error) return res.status(400).json({ message: result.error });
  return res.json(result);
});

/** Set quantity on an existing line. Quantity 0 removes it. */
router.patch("/items/:productId", async (req, res) => {
  const productId = String(req.params.productId);
  const qty = Math.max(0, Math.floor(Number(req.body?.quantity) || 0));

  const result = await withDb(async (db) => {
    const cart = ensureCart(db, req.user.sub);
    const idx = cart.items.findIndex((l) => l.productId === productId);
    if (idx < 0) return { notFound: true };

    if (qty === 0) {
      cart.items.splice(idx, 1);
    } else {
      const cap = cart.items[idx].stockAvailable ?? MAX_LINE_QTY;
      cart.items[idx] = {
        ...cart.items[idx],
        quantity: Math.min(qty, cap, MAX_LINE_QTY),
      };
    }
    touch(cart);
    return { items: cart.items, updatedAt: cart.updatedAt };
  });

  if (result.notFound) return res.status(404).json({ message: "Line not found" });
  return res.json(result);
});

router.delete("/items/:productId", async (req, res) => {
  const productId = String(req.params.productId);
  const result = await withDb(async (db) => {
    const cart = ensureCart(db, req.user.sub);
    cart.items = cart.items.filter((l) => l.productId !== productId);
    touch(cart);
    return { items: cart.items, updatedAt: cart.updatedAt };
  });
  return res.json(result);
});

router.delete("/", async (req, res) => {
  const result = await withDb(async (db) => {
    const cart = ensureCart(db, req.user.sub);
    cart.items = [];
    touch(cart);
    return { items: cart.items, updatedAt: cart.updatedAt };
  });
  return res.json(result);
});

module.exports = router;
