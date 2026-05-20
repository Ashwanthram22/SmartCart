const express = require("express");
const { withDb } = require("../lib/store");
const authMiddleware = require("../middleware/auth");
const {
  MAX_LINE_QTY,
  normaliseStoredLine,
  buildCartResponse,
  productMapFromDb,
} = require("../lib/cart-lines");
const { withUserProfile, touchCart } = require("../lib/user-profile");

const router = express.Router();

router.use(authMiddleware);

const MAX_LINES = 50;

function requireCart(db, userId) {
  const user = withUserProfile(db, userId);
  if (!user) return null;
  return user.cart;
}

/** Strip legacy snapshot fields; keep only productId + quantity in storage. */
function persistItems(rawItems) {
  const seen = new Map();
  for (const raw of rawItems || []) {
    const line = normaliseStoredLine(raw);
    if (!line) continue;
    const prior = seen.get(line.productId);
    if (prior) {
      prior.quantity = Math.min(MAX_LINE_QTY, prior.quantity + line.quantity);
    } else {
      seen.set(line.productId, line);
    }
  }
  return Array.from(seen.values());
}

router.get("/", async (req, res) => {
  const result = await withDb(async (db) => {
    const cart = requireCart(db, req.user.sub);
    if (!cart) return { error: "User not found" };
    cart.items = persistItems(cart.items);
    return buildCartResponse(db, cart);
  });
  return res.json(result);
});

router.put("/", async (req, res) => {
  const incoming = Array.isArray(req.body?.items) ? req.body.items : [];
  if (incoming.length > MAX_LINES) {
    return res
      .status(400)
      .json({ message: `Cart cannot exceed ${MAX_LINES} items` });
  }

  const result = await withDb(async (db) => {
    const cart = requireCart(db, req.user.sub);
    if (!cart) return { error: "User not found" };
    const map = productMapFromDb(db);
    const stored = [];
    for (const raw of incoming) {
      const line = normaliseStoredLine(raw);
      if (!line || !map.has(line.productId)) continue;
      const prior = stored.find((l) => l.productId === line.productId);
      if (prior) {
        prior.quantity = Math.min(MAX_LINE_QTY, prior.quantity + line.quantity);
      } else {
        stored.push(line);
      }
    }
    cart.items = stored.slice(0, MAX_LINES);
    touchCart(cart);
    return buildCartResponse(db, cart);
  });

  return res.json(result);
});

/** Body: { productId, quantity? } — product fields loaded from products collection. */
router.post("/items", async (req, res) => {
  const productId = String(req.body?.productId || "").trim();
  const quantity = Math.min(
    MAX_LINE_QTY,
    Math.max(1, Math.floor(Number(req.body?.quantity) || 1))
  );

  if (!productId) {
    return res.status(400).json({ message: "productId is required" });
  }

  const result = await withDb(async (db) => {
    const product = (db.products || []).find((p) => String(p.id) === productId);
    if (!product) return { notFound: true };

    const stock = Number(product.stock);
    if (Number.isFinite(stock) && stock < 1) {
      return { error: "Product is out of stock" };
    }

    const cart = requireCart(db, req.user.sub);
    if (!cart) return { error: "User not found" };
    const idx = cart.items.findIndex((l) => String(l.productId) === productId);

    if (idx >= 0) {
      const mergedQty = Math.min(
        MAX_LINE_QTY,
        (Number(cart.items[idx].quantity) || 0) + quantity
      );
      const cap = Number.isFinite(stock) ? Math.min(stock, MAX_LINE_QTY) : MAX_LINE_QTY;
      cart.items[idx] = { productId, quantity: Math.min(mergedQty, cap) };
    } else {
      if (cart.items.length >= MAX_LINES) {
        return { error: `Cart cannot exceed ${MAX_LINES} items` };
      }
      const cap = Number.isFinite(stock) ? Math.min(stock, MAX_LINE_QTY) : MAX_LINE_QTY;
      cart.items.push({ productId, quantity: Math.min(quantity, cap) });
    }

    touchCart(cart);
    return buildCartResponse(db, cart);
  });

  if (result.notFound) {
    return res.status(404).json({ message: "Product not found" });
  }
  if (result.error) return res.status(400).json({ message: result.error });
  return res.json(result);
});

router.patch("/items/:productId", async (req, res) => {
  const productId = String(req.params.productId);
  const qty = Math.max(0, Math.floor(Number(req.body?.quantity) || 0));

  const result = await withDb(async (db) => {
    const cart = requireCart(db, req.user.sub);
    if (!cart) return { error: "User not found" };
    const idx = cart.items.findIndex((l) => String(l.productId) === productId);
    if (idx < 0) return { notFound: true };

    if (qty === 0) {
      cart.items.splice(idx, 1);
    } else {
      const product = (db.products || []).find((p) => String(p.id) === productId);
      const stock = product ? Number(product.stock) : NaN;
      const cap = Number.isFinite(stock) ? Math.min(stock, MAX_LINE_QTY) : MAX_LINE_QTY;
      cart.items[idx] = {
        productId,
        quantity: Math.min(qty, cap, MAX_LINE_QTY),
      };
    }
    touchCart(cart);
    return buildCartResponse(db, cart);
  });

  if (result.notFound) return res.status(404).json({ message: "Line not found" });
  return res.json(result);
});

router.delete("/items/:productId", async (req, res) => {
  const productId = String(req.params.productId);
  const result = await withDb(async (db) => {
    const cart = requireCart(db, req.user.sub);
    if (!cart) return { error: "User not found" };
    cart.items = cart.items.filter((l) => String(l.productId) !== productId);
    touchCart(cart);
    return buildCartResponse(db, cart);
  });
  return res.json(result);
});

router.delete("/", async (req, res) => {
  const result = await withDb(async (db) => {
    const cart = requireCart(db, req.user.sub);
    if (!cart) return { error: "User not found" };
    cart.items = [];
    touchCart(cart);
    return buildCartResponse(db, cart);
  });
  return res.json(result);
});

module.exports = router;
