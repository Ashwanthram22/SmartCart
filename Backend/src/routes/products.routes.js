const express = require("express");
const { readDb, withDb } = require("../lib/data-store");
const authMiddleware = require("../middleware/auth");
const { writeLimiter } = require("../middleware/rateLimits");
const { productMatchesSegment, pickTrendingProducts } = require("../lib/segments");

const router = express.Router();

const TRENDING_TAB_LIMIT = 12;
const RATING_TIERS = [3, 3.5, 4, 4.5];

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

function applySearch(products, qNorm) {
  if (!qNorm) return products;
  return products.filter((p) => {
    const hay = `${p.title || ""} ${p.category || ""} ${p.brand || ""} ${(
      p.catalogSegments || []
    ).join(" ")}`.toLowerCase();
    return hay.includes(qNorm);
  });
}

function parseList(value) {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value
      .flatMap((entry) => String(entry).split(","))
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return String(value)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseNumber(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function capitalizeKey(key) {
  if (!key) return key;
  return String(key).charAt(0).toUpperCase() + String(key).slice(1);
}

/**
 * Catalog product list. Filters compose in this order so the result always
 * matches what the sidebar facets in `/filters` were derived from:
 *   1. segment match (or trending top-N short-circuit)
 *   2. text search
 *   3. brand whitelist (empty = no brand restriction)
 *   4. price range
 *   5. rating floor
 *
 * All filter params are optional. Calling `GET /api/products?segment=Books`
 * with no other params returns every Books product, which is the behaviour
 * the catalog page relies on when the sidebar selection is empty.
 */
router.get("/", authMiddleware, async (req, res) => {
  const db = await readDb();
  const segment =
    typeof req.query.segment === "string" && req.query.segment.trim()
      ? req.query.segment.trim()
      : "AI Picks";
  const q = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : "";
  const brandFilters = parseList(req.query.brand);
  const priceMin = parseNumber(req.query.priceMin);
  const priceMax = parseNumber(req.query.priceMax);
  const minRating = parseNumber(req.query.minRating);

  let list = db.products.filter((p) => productMatchesSegment(p, segment));
  if (segment === "Trending") {
    list = pickTrendingProducts(list, TRENDING_TAB_LIMIT);
  }

  list = applySearch(list, q);

  if (brandFilters.length > 0) {
    const allowed = new Set(brandFilters);
    list = list.filter((p) => p.brand && allowed.has(p.brand));
  }

  if (priceMin != null) {
    list = list.filter((p) => Number(p.price || 0) >= priceMin);
  }
  if (priceMax != null) {
    list = list.filter((p) => Number(p.price || 0) <= priceMax);
  }

  if (minRating != null && minRating > 0) {
    list = list.filter((p) => Number(p.rating || 0) >= minRating);
  }

  res.json(list);
});

/**
 * Filter facets for the catalog sidebar. Always derived from the products
 * actually present in the requested segment (after the optional `q` search),
 * so the UI never offers a brand / processor / price range that wouldn't
 * return any results. Trending is treated as a virtual segment using the
 * shared popularity ranker.
 *
 * NOTE: This route MUST be declared before `/:id` so Express doesn't try to
 * resolve "filters" as a product id.
 */
router.get("/filters", authMiddleware, async (req, res) => {
  const db = await readDb();
  const segment =
    typeof req.query.segment === "string" && req.query.segment.trim()
      ? req.query.segment.trim()
      : "AI Picks";
  const q = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : "";

  let inSegment = db.products.filter((p) => productMatchesSegment(p, segment));
  if (segment === "Trending") {
    inSegment = pickTrendingProducts(inSegment, TRENDING_TAB_LIMIT);
  }
  inSegment = applySearch(inSegment, q);

  const prices = inSegment
    .map((p) => Number(p.price))
    .filter((n) => Number.isFinite(n) && n > 0);
  const priceMin = prices.length ? Math.min(...prices) : 0;
  const priceMax = prices.length ? Math.max(...prices) : 0;

  const brandsSet = new Set();
  inSegment.forEach((p) => {
    if (p.brand && typeof p.brand === "string") brandsSet.add(p.brand);
  });
  const brands = Array.from(brandsSet).sort((a, b) => a.localeCompare(b));

  const specsBuckets = {};
  inSegment.forEach((p) => {
    const specs = p.specs && typeof p.specs === "object" ? p.specs : {};
    Object.entries(specs).forEach(([key, value]) => {
      if (value == null || value === "") return;
      const bucketKey = capitalizeKey(key);
      if (!specsBuckets[bucketKey]) specsBuckets[bucketKey] = new Set();
      specsBuckets[bucketKey].add(String(value));
    });
  });
  const specifications = {};
  Object.entries(specsBuckets).forEach(([key, values]) => {
    specifications[key] = Array.from(values).sort((a, b) => a.localeCompare(b));
  });

  const ratings = RATING_TIERS.filter((tier) =>
    inSegment.some((p) => (Number(p.rating) || 0) >= tier)
  );

  return res.json({
    segment,
    totalCount: inSegment.length,
    price: { min: priceMin, max: priceMax },
    brands,
    ratings,
    specifications,
  });
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

router.post("/:id/reviews", writeLimiter, authMiddleware, async (req, res) => {
  const ratingRaw = req.body?.rating;
  const textRaw = typeof req.body?.text === "string" ? req.body.text.trim() : "";
  const rating = Number(ratingRaw);

  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return res
      .status(400)
      .json({ message: "Rating must be a number between 1 and 5" });
  }
  if (!textRaw) {
    return res.status(400).json({ message: "Review text is required" });
  }
  if (textRaw.length > 1500) {
    return res
      .status(400)
      .json({ message: "Review text is too long (1500 characters max)" });
  }

  const result = await withDb(async (db) => {
    const product = db.products.find(
      (item) => String(item.id) === String(req.params.id)
    );
    if (!product) return { notFound: true };

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
    db.reviews.push(review);
    return { review };
  });

  if (result.notFound) {
    return res.status(404).json({ message: "Product not found" });
  }
  return res
    .status(201)
    .json({ message: "Review submitted", review: result.review });
});

module.exports = router;
