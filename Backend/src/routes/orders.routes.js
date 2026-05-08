const express = require("express");
const { withDb } = require("../lib/data-store");
const authMiddleware = require("../middleware/auth");
const { writeLimiter } = require("../middleware/rateLimits");
const { decorateOrder, effectiveStatus } = require("../lib/order-lifecycle");

const router = express.Router();

router.use(authMiddleware);

/** Mock USD rate used to convert backend INR prices into the FE display unit. */
const INR_TO_USD = 2.8;
const TAX_RATE = 0.08;
const MAX_ORDER_LINES = 50;

/**
 * Re-price a cart line at order time. Where the product still exists in the
 * catalog we use the live `price` (in INR) converted to USD so the snapshot
 * baked into the order is server-authoritative; for synthetic items (e.g.
 * the cart upsell that isn't in the products table) we honour the unitPrice
 * the FE attached.
 */
function priceLine(line, productMap) {
  const product = productMap.get(String(line.productId));
  let unitPrice = Number(line.unitPrice);
  if (product && Number.isFinite(Number(product.price))) {
    unitPrice = Number(product.price) / INR_TO_USD;
  }
  if (!Number.isFinite(unitPrice) || unitPrice < 0) unitPrice = 0;

  const quantity = Math.max(1, Math.floor(Number(line.quantity) || 1));

  return {
    productId: String(line.productId),
    title: product?.title || line.title || String(line.productId),
    image: product?.image || line.image || "",
    subtitle: line.subtitle || product?.category || "",
    unitPrice: Number(unitPrice.toFixed(2)),
    quantity,
    lineTotal: Number((unitPrice * quantity).toFixed(2)),
  };
}

function summarise(items) {
  const subtotal = items.reduce((s, l) => s + l.lineTotal, 0);
  const tax = Number((subtotal * TAX_RATE).toFixed(2));
  const total = Number((subtotal + tax).toFixed(2));
  return { subtotal: Number(subtotal.toFixed(2)), tax, total };
}

function validateAddress(addr) {
  if (!addr || typeof addr !== "object") return "Shipping address is required";
  const required = ["fullName", "line1", "city", "postal"];
  for (const key of required) {
    if (!addr[key] || String(addr[key]).trim().length < 2) {
      return `Address field '${key}' is required`;
    }
  }
  return null;
}

router.post("/", writeLimiter, async (req, res) => {
  const addressErr = validateAddress(req.body?.address);
  if (addressErr) return res.status(400).json({ message: addressErr });

  const result = await withDb(async (db) => {
    if (!Array.isArray(db.carts)) db.carts = [];
    if (!Array.isArray(db.orders)) db.orders = [];

    const cart = db.carts.find((c) => c.userId === req.user.sub);
    const sourceItems = Array.isArray(cart?.items) ? cart.items : [];
    if (sourceItems.length === 0) {
      return { error: "Cart is empty" };
    }
    if (sourceItems.length > MAX_ORDER_LINES) {
      return { error: `Order cannot exceed ${MAX_ORDER_LINES} items` };
    }

    const productMap = new Map(
      db.products.map((p) => [String(p.id), p])
    );
    const items = sourceItems.map((line) => priceLine(line, productMap));
    const totals = summarise(items);

    const now = new Date().toISOString();
    const order = {
      id: `o${Date.now()}`,
      userId: req.user.sub,
      items,
      ...totals,
      address: {
        fullName: String(req.body.address.fullName).trim(),
        line1: String(req.body.address.line1).trim(),
        city: String(req.body.address.city).trim(),
        postal: String(req.body.address.postal).trim(),
      },
      status: "processing",
      createdAt: now,
      updatedAt: now,
    };

    db.orders.push(order);
    if (cart) cart.items = [];
    return { order };
  });

  if (result.error) return res.status(400).json({ message: result.error });
  return res
    .status(201)
    .json({ message: "Order placed", order: decorateOrder(result.order) });
});

router.get("/", async (req, res) => {
  const orders = await withDb(async (db) => {
    if (!Array.isArray(db.orders)) db.orders = [];
    return db.orders
      .filter((o) => o.userId === req.user.sub)
      .sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0));
  });
  return res.json({ orders: orders.map(decorateOrder) });
});

router.get("/:id", async (req, res) => {
  const orders = await withDb(async (db) => {
    if (!Array.isArray(db.orders)) db.orders = [];
    return db.orders;
  });
  const order = orders.find(
    (o) => o.id === req.params.id && o.userId === req.user.sub
  );
  if (!order) return res.status(404).json({ message: "Order not found" });
  return res.json({ order: decorateOrder(order) });
});

/**
 * Cancel an order. Only allowed while it's still `processing` (computed via
 * the lifecycle helper). Once it's progressed to `transit` or `delivered`
 * the cancel button is hidden in the UI but we still defend against a
 * crafted request reaching this endpoint.
 */
router.patch("/:id/cancel", writeLimiter, async (req, res) => {
  const result = await withDb(async (db) => {
    if (!Array.isArray(db.orders)) db.orders = [];
    const order = db.orders.find(
      (o) => o.id === req.params.id && o.userId === req.user.sub
    );
    if (!order) return { notFound: true };

    const live = effectiveStatus(order);
    if (live === "cancelled") return { order };
    if (live !== "processing") {
      return { error: `Order is already ${live} and can no longer be cancelled` };
    }

    order.status = "cancelled";
    order.updatedAt = new Date().toISOString();
    return { order };
  });

  if (result.notFound) return res.status(404).json({ message: "Order not found" });
  if (result.error) return res.status(409).json({ message: result.error });
  return res.json({ message: "Order cancelled", order: decorateOrder(result.order) });
});

module.exports = router;
