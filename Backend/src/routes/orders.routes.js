const express = require("express");
const { withDb } = require("../lib/store");
const authMiddleware = require("../middleware/auth");
const { writeLimiter } = require("../middleware/rateLimits");
const { decorateOrder, effectiveStatus } = require("../lib/order-lifecycle");
const { resolveCoupon } = require("./coupons.routes");
const { withUserProfile, touchCart } = require("../lib/user-profile");

const router = express.Router();

router.use(authMiddleware);

// Prices are stored and persisted in INR end-to-end (no currency conversion).
const TAX_RATE = 0.08;
const MAX_ORDER_LINES = 50;

/**
 * Re-price a cart line at order time. Where the product still exists in the
 * catalog we use the live `price` (in INR) so the snapshot baked into the
 * order is server-authoritative; for synthetic items (e.g. the cart upsell
 * that isn't in the products table) we honour the unitPrice the FE attached.
 */
function priceLine(line, productMap) {
  const product =
    productMap.get(String(line.productId)) || line.product || null;
  let unitPrice = Number(product?.price ?? line.unitPrice);
  if (product && Number.isFinite(Number(product.price))) {
    unitPrice = Number(product.price);
  }
  if (!Number.isFinite(unitPrice) || unitPrice < 0) unitPrice = 0;

  const quantity = Math.max(1, Math.floor(Number(line.quantity) || 1));

  const category = product?.category || line.product?.category || "Product";
  const rating = product?.rating ?? line.product?.rating;
  const ratingLabel =
    rating != null && Number.isFinite(Number(rating)) ? `${rating}★` : "—★";

  return {
    productId: String(line.productId),
    title: product?.title || line.product?.title || line.title || String(line.productId),
    image: product?.image || line.product?.image || line.image || "",
    subtitle: `${category} • ${ratingLabel} rated`,
    unitPrice: Number(unitPrice.toFixed(2)),
    quantity,
    lineTotal: Number((unitPrice * quantity).toFixed(2)),
  };
}

function summarise(items, discountAmount = 0) {
  const subtotal = items.reduce((s, l) => s + l.lineTotal, 0);
  const discount = Math.max(0, Math.min(subtotal, Number(discountAmount) || 0));
  const taxable = Math.max(0, subtotal - discount);
  const tax = Number((taxable * TAX_RATE).toFixed(2));
  const total = Number((taxable + tax).toFixed(2));
  return {
    subtotal: Number(subtotal.toFixed(2)),
    discount: Number(discount.toFixed(2)),
    tax,
    total,
  };
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

  const couponCodeRaw = typeof req.body?.couponCode === "string"
    ? req.body.couponCode.trim()
    : "";

  // Pre-compute pricing outside the write queue. We need the subtotal to
  // re-validate the coupon before we touch the cart/orders collections.
  const previewSubtotalResult = await withDb(async (db) => {
    const user = withUserProfile(db, req.user.sub);
    const sourceItems = Array.isArray(user?.cart?.items) ? user.cart.items : [];
    if (sourceItems.length === 0) return { error: "Cart is empty" };
    if (sourceItems.length > MAX_ORDER_LINES) {
      return { error: `Order cannot exceed ${MAX_ORDER_LINES} items` };
    }
    const productMap = new Map(db.products.map((p) => [String(p.id), p]));
    const items = sourceItems.map((line) => priceLine(line, productMap));
    const subtotal = items.reduce((s, l) => s + l.lineTotal, 0);
    return { items, subtotal: Number(subtotal.toFixed(2)) };
  });

  if (previewSubtotalResult.error) {
    return res.status(400).json({ message: previewSubtotalResult.error });
  }

  let resolvedCoupon = null;
  let discountUsd = 0;
  if (couponCodeRaw) {
    const couponResult = await resolveCoupon(couponCodeRaw, previewSubtotalResult.subtotal);
    if (couponResult.error) {
      return res.status(400).json({ message: couponResult.error });
    }
    resolvedCoupon = couponResult.coupon;
    discountUsd = couponResult.discount;
  }

  const result = await withDb(async (db) => {
    if (!Array.isArray(db.orders)) db.orders = [];

    const user = withUserProfile(db, req.user.sub);
    const cart = user?.cart;
    const sourceItems = Array.isArray(cart?.items) ? cart.items : [];
    if (sourceItems.length === 0) {
      return { error: "Cart is empty" };
    }

    const productMap = new Map(
      db.products.map((p) => [String(p.id), p])
    );
    const items = sourceItems.map((line) => priceLine(line, productMap));
    const totals = summarise(items, discountUsd);

    const now = new Date().toISOString();
    const order = {
      id: `o${Date.now()}`,
      userId: req.user.sub,
      items,
      ...totals,
      ...(resolvedCoupon ? { coupon: resolvedCoupon } : {}),
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
    if (cart) {
      cart.items = [];
      touchCart(cart);
    }
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
