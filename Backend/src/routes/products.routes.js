const express = require("express");
const { readDb, writeDb } = require("../lib/data-store");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

function reviewsForProduct(db, productId) {
  const list = Array.isArray(db.reviews) ? db.reviews : [];
  return list
    .filter((review) => String(review.productId) === String(productId))
    .sort((a, b) => {
      const ta = Date.parse(a.createdAt) || 0;
      const tb = Date.parse(b.createdAt) || 0;
      return tb - ta;
    });
}

router.get("/", authMiddleware, async (req, res) => {
  const db = await readDb();
  let list = db.products;
  const q = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : "";
  if (q) {
    list = list.filter((p) => {
      const hay = `${p.title || ""} ${p.category || ""} ${(p.catalogSegments || []).join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }
  res.json(list);
});

router.get("/:id", authMiddleware, async (req, res) => {
  const db = await readDb();
  const product = db.products.find((item) => String(item.id) === String(req.params.id));

  if (!product) {
    return res.status(404).json({
      message: "Product not found",
    });
  }

  const similar = db.products
    .filter((item) => item.id !== product.id)
    .slice(0, 2);

  return res.json({
    product,
    similar,
    reviews: reviewsForProduct(db, product.id),
  });
});

router.get("/:id/reviews", authMiddleware, async (req, res) => {
  const db = await readDb();
  const product = db.products.find((item) => String(item.id) === String(req.params.id));

  if (!product) {
    return res.status(404).json({
      message: "Product not found",
    });
  }

  return res.json({
    reviews: reviewsForProduct(db, product.id),
  });
});

router.post("/:id/reviews", authMiddleware, async (req, res) => {
  const db = await readDb();
  const product = db.products.find((item) => String(item.id) === String(req.params.id));

  if (!product) {
    return res.status(404).json({
      message: "Product not found",
    });
  }

  const ratingRaw = req.body?.rating;
  const textRaw = typeof req.body?.text === "string" ? req.body.text.trim() : "";
  const rating = Number(ratingRaw);

  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({
      message: "Rating must be a number between 1 and 5",
    });
  }

  if (!textRaw) {
    return res.status(400).json({
      message: "Review text is required",
    });
  }

  if (textRaw.length > 1500) {
    return res.status(400).json({
      message: "Review text is too long (1500 characters max)",
    });
  }

  const author = db.users.find((user) => user.id === req.user.sub);
  const userName = author?.name || req.user.email || "SmartCart Shopper";

  const review = {
    id: `r${Date.now()}`,
    productId: product.id,
    userId: req.user.sub,
    userName,
    rating: Math.round(rating),
    text: textRaw,
    createdAt: new Date().toISOString(),
  };

  if (!Array.isArray(db.reviews)) {
    db.reviews = [];
  }
  db.reviews.push(review);
  await writeDb(db);

  return res.status(201).json({
    message: "Review submitted",
    review,
  });
});

module.exports = router;
