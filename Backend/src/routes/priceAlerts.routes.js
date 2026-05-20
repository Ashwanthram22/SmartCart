const express = require("express");
const { withDb } = require("../lib/store");
const authMiddleware = require("../middleware/auth");
const { withUserProfile } = require("../lib/user-profile");

const router = express.Router();

router.use(authMiddleware);

const MAX_PER_USER = 50;

function findProduct(db, productId) {
  return (db.products || []).find((p) => String(p.id) === String(productId));
}

function publicShape(alert) {
  if (!alert) return null;
  return {
    id: alert.id,
    productId: alert.productId,
    productTitle: alert.productTitle,
    targetPrice: alert.targetPrice,
    referencePrice: alert.referencePrice,
    createdAt: alert.createdAt,
    triggered: Boolean(alert.triggered),
  };
}

router.get("/", async (req, res) => {
  const list = await withDb(async (db) => {
    const user = withUserProfile(db, req.user.sub);
    return (user?.priceAlerts || []).map(publicShape);
  });
  return res.json({ alerts: list });
});

router.post("/", async (req, res) => {
  const productId = String(req.body?.productId || "").trim();
  const targetPriceRaw = Number(req.body?.targetPrice);
  if (!productId) {
    return res.status(400).json({ message: "productId is required" });
  }
  if (!Number.isFinite(targetPriceRaw) || targetPriceRaw <= 0) {
    return res.status(400).json({ message: "targetPrice must be a positive number" });
  }
  const targetPrice = Math.round(targetPriceRaw * 100) / 100;

  const result = await withDb(async (db) => {
    const product = findProduct(db, productId);
    if (!product) return { notFound: true };

    const user = withUserProfile(db, req.user.sub);
    if (!user) return { error: "User not found" };

    const referencePrice = Number(product.price) || 0;
    if (targetPrice >= referencePrice) {
      return {
        error:
          "Target price must be below the current price for the alert to fire.",
      };
    }

    const own = user.priceAlerts;
    const existing = own.find((a) => String(a.productId) === productId);
    if (existing) {
      existing.targetPrice = targetPrice;
      existing.referencePrice = referencePrice;
      existing.triggered = false;
      existing.updatedAt = new Date().toISOString();
      return { alert: existing, updated: true };
    }

    if (own.length >= MAX_PER_USER) {
      return { error: `You can subscribe to at most ${MAX_PER_USER} price alerts` };
    }

    const alert = {
      id: `pa${Date.now()}`,
      productId,
      productTitle: product.title || productId,
      targetPrice,
      referencePrice,
      createdAt: new Date().toISOString(),
      triggered: false,
    };
    own.push(alert);
    return { alert, created: true };
  });

  if (result.notFound) return res.status(404).json({ message: "Product not found" });
  if (result.error) return res.status(400).json({ message: result.error });
  return res
    .status(result.created ? 201 : 200)
    .json({ alert: publicShape(result.alert), updated: Boolean(result.updated) });
});

router.delete("/:productId", async (req, res) => {
  const productId = String(req.params.productId || "").trim();
  const result = await withDb(async (db) => {
    const user = withUserProfile(db, req.user.sub);
    if (!user) return { error: "User not found" };
    const idx = user.priceAlerts.findIndex(
      (a) => String(a.productId) === productId
    );
    if (idx < 0) return { notFound: true };
    user.priceAlerts.splice(idx, 1);
    return { removed: productId };
  });
  if (result.notFound) {
    return res.status(404).json({ message: "Price alert not found" });
  }
  if (result.error) return res.status(404).json({ message: result.error });
  return res.json({ removed: result.removed });
});

module.exports = router;
