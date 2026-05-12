const crypto = require("crypto");
const express = require("express");
const { readDb, withDb } = require("../lib/data-store");
const authMiddleware = require("../middleware/auth");
const adminMiddleware = require("../middleware/admin");
const { writeLimiter } = require("../middleware/rateLimits");
const {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  CLOUDINARY_UPLOAD_FOLDER,
} = require("../config/env");
const { effectiveStatus } = require("../lib/order-lifecycle");

const router = express.Router();

router.use(authMiddleware, adminMiddleware);

/* ------------------------------------------------------------------
 * Helpers
 * ----------------------------------------------------------------*/

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function safeInt(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : fallback;
}

function nowIso() {
  return new Date().toISOString();
}

function nextProductId(products) {
  const max = (products || [])
    .map((p) => Number(String(p.id).replace(/\D/g, "")) || 0)
    .reduce((a, b) => Math.max(a, b), 0);
  return `p${Math.max(max + 1, 1)}`;
}

function normaliseStringList(input) {
  if (input == null) return [];
  const arr = Array.isArray(input) ? input : String(input).split(",");
  return arr
    .map((s) => String(s).trim())
    .filter(Boolean);
}

function normaliseSpecs(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const out = {};
  for (const [k, v] of Object.entries(input)) {
    if (k == null || v == null || v === "") continue;
    out[String(k).trim()] = typeof v === "string" ? v.trim() : v;
  }
  return out;
}

function buildProductPayload(body, existing = null) {
  const merged = { ...(existing || {}) };

  if ("title" in body) merged.title = String(body.title || "").trim();
  if ("description" in body) merged.description = String(body.description || "").trim();
  if ("category" in body) merged.category = String(body.category || "").trim();
  if ("brand" in body) merged.brand = String(body.brand || "").trim();
  if ("price" in body) merged.price = safeNumber(body.price, merged.price ?? 0);
  if ("originalPrice" in body) {
    merged.originalPrice = body.originalPrice === null
      ? null
      : safeNumber(body.originalPrice, merged.originalPrice ?? null);
  }
  if ("stock" in body) merged.stock = Math.max(0, safeInt(body.stock, merged.stock ?? 0));
  if ("rating" in body) merged.rating = Math.min(5, Math.max(0, safeNumber(body.rating, merged.rating ?? 4.5)));
  if ("reviewCount" in body) merged.reviewCount = Math.max(0, safeInt(body.reviewCount, merged.reviewCount ?? 0));
  if ("image" in body) merged.image = String(body.image || "").trim();
  if ("images" in body) merged.images = normaliseStringList(body.images);
  if ("catalogSegments" in body) merged.catalogSegments = normaliseStringList(body.catalogSegments);
  if ("specs" in body) merged.specs = normaliseSpecs(body.specs);

  return merged;
}

function validateProduct(p, { partial = false } = {}) {
  const errors = [];
  if (!partial || "title" in p) {
    if (!p.title || p.title.length < 2) errors.push("Title must be at least 2 characters");
    if (p.title && p.title.length > 200) errors.push("Title is too long");
  }
  if (!partial || "category" in p) {
    if (!p.category) errors.push("Category is required");
  }
  if (!partial || "price" in p) {
    if (!Number.isFinite(p.price) || p.price <= 0) {
      errors.push("Price must be a positive number");
    }
  }
  if (!partial || "stock" in p) {
    if (!Number.isFinite(p.stock) || p.stock < 0) {
      errors.push("Stock must be 0 or greater");
    }
  }
  if (p.image && p.image.length > 1000) errors.push("Image URL is too long");
  return errors;
}

/* ------------------------------------------------------------------
 * GET /api/admin/stats
 * Dashboard top-line metrics.
 * ----------------------------------------------------------------*/

router.get("/stats", async (req, res) => {
  const db = await readDb();
  const products = db.products || [];
  const orders = db.orders || [];
  const users = db.users || [];

  const totalRevenue = orders.reduce((sum, o) => sum + safeNumber(o.totals?.total), 0);
  const previousRevenue = orders
    .filter((o) => {
      const ts = Date.parse(o.createdAt);
      if (!ts) return false;
      const ageDays = (Date.now() - ts) / (1000 * 60 * 60 * 24);
      return ageDays > 30 && ageDays <= 60;
    })
    .reduce((sum, o) => sum + safeNumber(o.totals?.total), 0);

  const last30 = orders.filter((o) => {
    const ts = Date.parse(o.createdAt);
    return ts && Date.now() - ts <= 30 * 24 * 60 * 60 * 1000;
  });
  const last30Revenue = last30.reduce((sum, o) => sum + safeNumber(o.totals?.total), 0);

  const totalOrders = orders.length;
  const lowStockCount = products.filter(
    (p) => Number.isFinite(Number(p.stock)) && Number(p.stock) > 0 && Number(p.stock) <= 10
  ).length;
  const outOfStockCount = products.filter((p) => Number(p.stock) === 0).length;

  function pctChange(current, previous) {
    if (!previous || previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 1000) / 10;
  }

  return res.json({
    totals: {
      revenue: totalRevenue,
      revenueLast30: last30Revenue,
      revenueDeltaPct: pctChange(last30Revenue, previousRevenue),
      orders: totalOrders,
      ordersLast30: last30.length,
      activeProducts: products.length,
      lowStock: lowStockCount,
      outOfStock: outOfStockCount,
      customers: users.filter((u) => u.role !== "admin").length,
    },
  });
});

/* ------------------------------------------------------------------
 * GET /api/admin/sales-chart
 * Daily revenue for the last N days (default 30) for the dashboard.
 * ----------------------------------------------------------------*/

router.get("/sales-chart", async (req, res) => {
  const days = Math.min(90, Math.max(7, safeInt(req.query.days, 30)));
  const db = await readDb();
  const orders = db.orders || [];

  const buckets = new Array(days).fill(0);
  const dayLabels = new Array(days);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < days; i += 1) {
    const d = new Date(today.getTime() - (days - 1 - i) * 86400000);
    dayLabels[i] = d.toISOString().slice(0, 10);
  }

  for (const order of orders) {
    const ts = Date.parse(order.createdAt);
    if (!ts) continue;
    const day = new Date(ts);
    day.setHours(0, 0, 0, 0);
    const idx = days - 1 - Math.round((today.getTime() - day.getTime()) / 86400000);
    if (idx >= 0 && idx < days) {
      buckets[idx] += safeNumber(order.totals?.total);
    }
  }

  return res.json({ days, labels: dayLabels, revenue: buckets });
});

/* ------------------------------------------------------------------
 * GET /api/admin/recent-activity
 * Mixed feed: latest orders, low-stock alerts, new users.
 * ----------------------------------------------------------------*/

router.get("/recent-activity", async (req, res) => {
  const db = await readDb();
  const orders = (db.orders || [])
    .slice()
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 5)
    .map((o) => ({
      type: "order",
      id: o.id,
      title: `New order #${o.id}`,
      detail: `Customer: ${o.userEmail || o.userId} • $${safeNumber(o.totals?.total).toFixed(2)}`,
      timestamp: o.createdAt,
    }));

  const lowStock = (db.products || [])
    .filter((p) => Number(p.stock) > 0 && Number(p.stock) <= 10)
    .slice(0, 3)
    .map((p) => ({
      type: "stock",
      id: p.id,
      title: `Stock alert: ${p.title}`,
      detail: `Low stock remaining (${p.stock} units)`,
      timestamp: nowIso(),
    }));

  const newUsers = (db.users || [])
    .filter((u) => u.role !== "admin")
    .slice(-3)
    .reverse()
    .map((u) => ({
      type: "user",
      id: u.id,
      title: "New customer registered",
      detail: u.email,
      timestamp: nowIso(),
    }));

  const items = [...orders, ...lowStock, ...newUsers]
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));

  return res.json({ items });
});

/* ------------------------------------------------------------------
 * Products CRUD (admin)
 * ----------------------------------------------------------------*/

router.get("/products", async (req, res) => {
  const db = await readDb();
  const q = String(req.query.q || "").trim().toLowerCase();
  let products = (db.products || []).slice();

  if (q) {
    products = products.filter((p) => {
      const hay = `${p.title || ""} ${p.brand || ""} ${p.category || ""} ${p.id || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }

  // Newest-first by id ordinal so freshly added products surface immediately.
  products.sort((a, b) => {
    const na = Number(String(a.id).replace(/\D/g, "")) || 0;
    const nb = Number(String(b.id).replace(/\D/g, "")) || 0;
    return nb - na;
  });

  return res.json({ products, total: products.length });
});

router.post("/products", writeLimiter, async (req, res) => {
  const payload = buildProductPayload(req.body || {});
  // Required defaults so the catalog and recommendations don't need to defend.
  if (!payload.images || payload.images.length === 0) {
    payload.images = payload.image ? [payload.image] : [];
  }
  if (!payload.image && payload.images.length > 0) payload.image = payload.images[0];
  if (payload.rating == null) payload.rating = 4.5;
  if (payload.reviewCount == null) payload.reviewCount = 0;
  if (!payload.catalogSegments || payload.catalogSegments.length === 0) {
    payload.catalogSegments = ["AI Picks"];
  }

  const errors = validateProduct(payload);
  if (errors.length > 0) {
    return res.status(400).json({ message: errors.join("; "), errors });
  }

  const result = await withDb(async (db) => {
    if (!Array.isArray(db.products)) db.products = [];
    const created = {
      id: nextProductId(db.products),
      ...payload,
      createdAt: nowIso(),
    };
    db.products.push(created);
    return created;
  });

  return res.status(201).json({ product: result });
});

router.patch("/products/:id", writeLimiter, async (req, res) => {
  const id = String(req.params.id || "");

  const result = await withDb(async (db) => {
    const product = (db.products || []).find((p) => String(p.id) === id);
    if (!product) return { notFound: true };

    const payload = buildProductPayload(req.body || {}, product);
    const errors = validateProduct(payload, { partial: false });
    if (errors.length > 0) return { errors };

    Object.assign(product, payload);
    product.updatedAt = nowIso();
    return { product };
  });

  if (result.notFound) return res.status(404).json({ message: "Product not found" });
  if (result.errors) return res.status(400).json({ message: result.errors.join("; "), errors: result.errors });
  return res.json({ product: result.product });
});

router.delete("/products/:id", writeLimiter, async (req, res) => {
  const id = String(req.params.id || "");
  const result = await withDb(async (db) => {
    if (!Array.isArray(db.products)) db.products = [];
    const idx = db.products.findIndex((p) => String(p.id) === id);
    if (idx < 0) return { notFound: true };
    const [removed] = db.products.splice(idx, 1);
    return { removed };
  });

  if (result.notFound) return res.status(404).json({ message: "Product not found" });
  return res.json({ removed: result.removed.id });
});

/* ------------------------------------------------------------------
 * Orders (admin view + status updates)
 * ----------------------------------------------------------------*/

router.get("/orders", async (req, res) => {
  const db = await readDb();
  const status = String(req.query.status || "").trim().toLowerCase();
  const q = String(req.query.q || "").trim().toLowerCase();
  let orders = (db.orders || []).slice();

  if (status) {
    orders = orders.filter((o) => effectiveStatus(o) === status);
  }
  if (q) {
    orders = orders.filter((o) => {
      const hay = `${o.id} ${o.userEmail || ""} ${o.userId || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }

  orders.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return res.json({ orders, total: orders.length });
});

const ALLOWED_STATUS = new Set([
  "processing",
  "transit",
  "delivered",
  "cancelled",
]);

router.patch("/orders/:id/status", writeLimiter, async (req, res) => {
  const id = String(req.params.id || "");
  const status = String(req.body?.status || "").toLowerCase();
  if (!ALLOWED_STATUS.has(status)) {
    return res.status(400).json({
      message: `status must be one of: ${[...ALLOWED_STATUS].join(", ")}`,
    });
  }

  const result = await withDb(async (db) => {
    const order = (db.orders || []).find((o) => String(o.id) === id);
    if (!order) return { notFound: true };
    order.status = status;
    if (status === "delivered") order.deliveredAt = nowIso();
    if (status === "cancelled") order.cancelledAt = nowIso();
    order.updatedAt = nowIso();
    return { order };
  });

  if (result.notFound) return res.status(404).json({ message: "Order not found" });
  return res.json({ order: result.order });
});

/* ------------------------------------------------------------------
 * Cloudinary signed-upload signature
 * ----------------------------------------------------------------*/

router.post("/uploads/signature", (req, res) => {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    return res.status(503).json({
      message:
        "Cloudinary is not configured on the server. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET (or CLOUDINARY_URL) in Backend/.env to enable uploads.",
    });
  }

  const timestamp = Math.round(Date.now() / 1000);
  // Only sign params Cloudinary actually expects to verify; the signature
  // formula is sha1(`<param>=<value>&<param>=<value>...` + apiSecret) with
  // params alphabetically sorted and joined by `&`.
  const folder = String(req.body?.folder || CLOUDINARY_UPLOAD_FOLDER);
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
  const signature = crypto
    .createHash("sha1")
    .update(paramsToSign + CLOUDINARY_API_SECRET)
    .digest("hex");

  return res.json({
    cloudName: CLOUDINARY_CLOUD_NAME,
    apiKey: CLOUDINARY_API_KEY,
    timestamp,
    signature,
    folder,
    uploadUrl: `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
  });
});

router.get("/uploads/config", (req, res) => {
  return res.json({
    configured: Boolean(
      CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET
    ),
    cloudName: CLOUDINARY_CLOUD_NAME || null,
    folder: CLOUDINARY_UPLOAD_FOLDER,
  });
});

module.exports = router;
