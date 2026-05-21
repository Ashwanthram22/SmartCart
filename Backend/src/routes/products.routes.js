const express = require("express");
const { readDb, withDb } = require("../lib/store");
const authMiddleware = require("../middleware/auth");
const { writeLimiter } = require("../middleware/rateLimits");
const { productMatchesSegment, pickTrendingProducts } = require("../lib/segments");

const router = express.Router();

const TRENDING_TAB_LIMIT = 12;
const RATING_TIERS = [3, 3.5, 4, 4.5];

const SORT_KEYS = new Set([
  "recommended",
  "price-asc",
  "price-desc",
  "rating",
  "newest",
]);

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 60;

/**
 * Parse + clamp pagination/sort params with defaults that keep the
 * endpoint backward-compatible: when neither `page` nor `limit` is sent
 * the response is still a bare array. Only requests that opt in via
 * `page` / `limit` (query or JSON body) get the `{ items, total, ... }` envelope.
 */
function parsePagination(input) {
  const source = input && typeof input === "object" ? input : {};
  const opted = "page" in source || "limit" in source;
  const limitRaw = Number(source.limit);
  const pageRaw = Number(source.page);
  const limit = Number.isFinite(limitRaw) && limitRaw > 0
    ? Math.min(MAX_LIMIT, Math.floor(limitRaw))
    : DEFAULT_LIMIT;
  const page = Number.isFinite(pageRaw) && pageRaw > 0
    ? Math.floor(pageRaw)
    : 1;
  return { opted, page, limit };
}

function parseSort(value) {
  if (typeof value !== "string") return "recommended";
  const v = value.trim().toLowerCase();
  return SORT_KEYS.has(v) ? v : "recommended";
}

/**
 * `recommended` is the implicit catalog order (preserves the rule-based
 * ranking the segment filter already produced — Trending uses popularity
 * scores, others fall back to insertion order). All other sorts re-order
 * a *copy* so we never mutate the cached `db.products` array.
 */
function applySort(list, sort) {
  if (sort === "recommended") return list;
  const copy = list.slice();
  switch (sort) {
    case "price-asc":
      copy.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
      break;
    case "price-desc":
      copy.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
      break;
    case "rating":
      copy.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
      break;
    case "newest":
      copy.sort((a, b) => {
        const ta = Date.parse(a.createdAt) || 0;
        const tb = Date.parse(b.createdAt) || 0;
        if (tb !== ta) return tb - ta;
        // Stable secondary key when no timestamps exist (most seed data has
        // none): use the numeric tail of the id, e.g. "p15" > "p2".
        const na = Number(String(a.id).replace(/\D/g, "")) || 0;
        const nb = Number(String(b.id).replace(/\D/g, "")) || 0;
        return nb - na;
      });
      break;
    default:
      break;
  }
  return copy;
}

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
 * Then the sort key is applied, then pagination if requested.
 *
 * `input` is either query (GET) or JSON body (POST). When neither `page` nor
 * `limit` is present the response is a bare array; otherwise paginated envelope.
 */
async function buildProductListResponse(db, input) {
  const segment =
    typeof input.segment === "string" && input.segment.trim()
      ? input.segment.trim()
      : "AI Picks";
  const q = typeof input.q === "string" ? input.q.trim().toLowerCase() : "";
  const brandFilters = parseList(input.brand);
  const priceMin = parseNumber(input.priceMin);
  const priceMax = parseNumber(input.priceMax);
  const minRating = parseNumber(input.minRating);
  const sort = parseSort(input.sort);
  const { opted: paginate, page, limit } = parsePagination(input);

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

  list = applySort(list, sort);

  if (!paginate) {
    return list;
  }

  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * limit;
  const items = list.slice(start, start + limit);

  return {
    items,
    total,
    page: safePage,
    limit,
    totalPages,
    hasMore: safePage < totalPages,
    sort,
  };
}

/** POST /api/products — segment, filters, pagination in JSON body (preferred). */
router.post("/", authMiddleware, async (req, res) => {
  const db = await readDb();
  return res.json(await buildProductListResponse(db, req.body || {}));
});

/** GET /api/products — legacy query-string variant (same behaviour). */
router.get("/", authMiddleware, async (req, res) => {
  const db = await readDb();
  return res.json(await buildProductListResponse(db, req.query));
});

/**
 * Filter facets for the catalog sidebar. `input` is query (GET) or JSON body (POST).
 * Must stay before `/:id` so "filters" is not parsed as a product id.
 */
async function buildFilterFacetsResponse(db, input) {
  const segment =
    typeof input.segment === "string" && input.segment.trim()
      ? input.segment.trim()
      : "AI Picks";
  const q = typeof input.q === "string" ? input.q.trim().toLowerCase() : "";

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

  return {
    segment,
    totalCount: inSegment.length,
    price: { min: priceMin, max: priceMax },
    brands,
    ratings,
    specifications,
  };
}

/** POST /api/products/filters — segment + optional search in JSON body (no query string). */
router.post("/filters", authMiddleware, async (req, res) => {
  const db = await readDb();
  return res.json(await buildFilterFacetsResponse(db, req.body || {}));
});

/** GET /api/products/filters — legacy query-string variant. */
router.get("/filters", authMiddleware, async (req, res) => {
  const db = await readDb();
  return res.json(await buildFilterFacetsResponse(db, req.query));
});

function resolveSimilarProducts(db, product, limit = 2) {
  const productId = String(product.id);
  const byId = new Map((db.products || []).map((p) => [String(p.id), p]));
  const picked = [];

  const requested = Array.isArray(product.similarProductIds)
    ? product.similarProductIds.map((id) => String(id).trim()).filter(Boolean)
    : [];

  for (const id of requested) {
    if (picked.length >= limit) break;
    if (id === productId) continue;
    const match = byId.get(id);
    if (match && !picked.some((p) => String(p.id) === String(match.id))) {
      picked.push(match);
    }
  }

  if (picked.length < limit) {
    for (const candidate of db.products || []) {
      if (picked.length >= limit) break;
      if (String(candidate.id) === productId) continue;
      if (picked.some((p) => String(p.id) === String(candidate.id))) continue;
      picked.push(candidate);
    }
  }

  return picked.slice(0, limit);
}

router.get("/:id", authMiddleware, async (req, res) => {
  const db = await readDb();
  const product = db.products.find((item) => String(item.id) === String(req.params.id));

  if (!product) {
    return res.status(404).json({
      message: "Product not found",
    });
  }

  const similar = resolveSimilarProducts(db, product, 2);

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
