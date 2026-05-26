const express = require("express");
const { withDb } = require("../lib/store");
const authMiddleware = require("../middleware/auth");
const { withUserProfile } = require("../lib/user-profile");

const router = express.Router();

router.use(authMiddleware);

const MAX_PER_USER = 50;

router.get("/", async (req, res) => {
  const list = await withDb(async (db) => {
    const user = withUserProfile(db, req.user.sub);
    return (user?.stockAlerts || [])
      .filter((a) => a && a.fulfilled !== true)
      .map((a) => ({ ...a }));
  });
  return res.json({ alerts: list });
});

router.post("/", async (req, res) => {
  const productId = String(req.body?.productId || "").trim();
  if (!productId) {
    return res.status(400).json({ message: "productId is required" });
  }

  const result = await withDb(async (db) => {
    const product = (db.products || []).find((p) => String(p.id) === productId);
    if (!product) return { notFound: true };

    const user = withUserProfile(db, req.user.sub);
    if (!user) return { error: "User not found" };

    const own = user.stockAlerts;
    const existing = own.find((a) => String(a.productId) === productId);
    if (existing) return { alert: existing, alreadyExists: true };

    if (own.length >= MAX_PER_USER) {
      return { error: `You can subscribe to at most ${MAX_PER_USER} products` };
    }

    const alert = {
      id: `sa${Date.now()}`,
      productId,
      productTitle: product.title || productId,
      createdAt: new Date().toISOString(),
      notified: false,
      fulfilled: false,
    };
    own.push(alert);
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
    const user = withUserProfile(db, req.user.sub);
    if (!user) return { error: "User not found" };
    const idx = user.stockAlerts.findIndex(
      (a) => String(a.productId) === productId
    );
    if (idx < 0) return { notFound: true };
    user.stockAlerts.splice(idx, 1);
    return { removed: productId };
  });
  if (result.notFound) {
    return res.status(404).json({ message: "Subscription not found" });
  }
  if (result.error) return res.status(404).json({ message: result.error });
  return res.json({ removed: result.removed });
});

module.exports = router;
