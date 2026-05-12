const express = require("express");
const { withDb } = require("../lib/data-store");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

router.use(authMiddleware);

const MAX_PER_USER = 50;

function ensureCollection(db) {
  if (!Array.isArray(db.stockAlerts)) db.stockAlerts = [];
}

router.get("/", async (req, res) => {
  const list = await withDb(async (db) => {
    ensureCollection(db);
    return db.stockAlerts
      .filter((a) => a.userId === req.user.sub)
      .map((a) => ({ ...a }));
  });
  return res.json({ alerts: list });
});

/**
 * Subscribe the current user to be notified when a product is back in
 * stock. Returns the existing record if they're already subscribed
 * (no-op so the UI can call this on every click without duplicating
 * rows). The product must exist in the catalog.
 */
router.post("/", async (req, res) => {
  const productId = String(req.body?.productId || "").trim();
  if (!productId) {
    return res.status(400).json({ message: "productId is required" });
  }

  const result = await withDb(async (db) => {
    ensureCollection(db);
    const product = (db.products || []).find((p) => String(p.id) === productId);
    if (!product) return { notFound: true };

    const own = db.stockAlerts.filter((a) => a.userId === req.user.sub);
    const existing = own.find((a) => String(a.productId) === productId);
    if (existing) return { alert: existing, alreadyExists: true };

    if (own.length >= MAX_PER_USER) {
      return { error: `You can subscribe to at most ${MAX_PER_USER} products` };
    }

    const alert = {
      id: `sa${Date.now()}`,
      userId: req.user.sub,
      productId,
      productTitle: product.title || productId,
      createdAt: new Date().toISOString(),
      notified: false,
    };
    db.stockAlerts.push(alert);
    return { alert };
  });

  if (result.notFound) return res.status(404).json({ message: "Product not found" });
  if (result.error) return res.status(400).json({ message: result.error });
  return res
    .status(result.alreadyExists ? 200 : 201)
    .json({ alert: result.alert, alreadyExists: Boolean(result.alreadyExists) });
});

router.delete("/:productId", async (req, res) => {
  const productId = String(req.params.productId || "").trim();
  const result = await withDb(async (db) => {
    ensureCollection(db);
    const idx = db.stockAlerts.findIndex(
      (a) => a.userId === req.user.sub && String(a.productId) === productId
    );
    if (idx < 0) return { notFound: true };
    db.stockAlerts.splice(idx, 1);
    return { removed: productId };
  });
  if (result.notFound) {
    return res.status(404).json({ message: "Subscription not found" });
  }
  return res.json({ removed: result.removed });
});

module.exports = router;
