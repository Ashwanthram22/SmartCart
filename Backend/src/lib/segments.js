/**
 * Server-side mirror of the catalog segment + trending logic that lives in
 * Frontend/src/constants/shopSegments.js and Frontend/src/utils/productSelection.js.
 *
 * Keeping a copy here lets the filter API decide which products belong to a
 * given tab without the frontend having to ship the whole catalog. If you
 * change one side, please mirror the change on the other so home, catalog,
 * and the filter endpoint stay in sync.
 */

const CATEGORY_TO_TABS = {
  Wearables: ["Electronics", "Mobiles"],
  Audio: ["Electronics", "Accessories"],
  Tablets: ["Electronics", "Mobiles", "Laptops"],
  Fitness: ["Electronics", "Accessories"],
  Home: ["Home & Kitchen"],
  Wellness: ["Sports", "Home & Kitchen"],
  "Smart Home": ["Electronics", "Home & Kitchen"],
  Sports: ["Sports", "Fashion", "Accessories"],
  Books: ["Books"],
  Groceries: ["Groceries"],
  Mobiles: ["Mobiles", "Electronics"],
};

function productMatchesSegment(product, segment) {
  if (!product) return false;
  if (segment === "AI Picks" || segment === "Trending") return true;

  if (segment === "Sports" && product.category === "Sports") {
    return true;
  }

  const explicit = Array.isArray(product.catalogSegments) ? product.catalogSegments : [];
  if (explicit.length > 0) {
    return explicit.includes(segment);
  }

  const tabs = CATEGORY_TO_TABS[product.category];
  return Array.isArray(tabs) && tabs.includes(segment);
}

function trendingScore(product) {
  const rating = Number(product?.rating) || 0;
  const reviews = Number(product?.reviewCount) || 0;
  const base = rating * Math.log10(reviews + 10);
  const badge = String(product?.badge || "").toUpperCase();
  const boost = badge.includes("TRENDING") ? 0.6 : 0;
  return base + boost;
}

function pickTrendingProducts(products, count = 12) {
  if (!Array.isArray(products)) return [];
  return [...products]
    .filter((item) => item?.id != null)
    .sort((a, b) => trendingScore(b) - trendingScore(a))
    .slice(0, count);
}

module.exports = {
  productMatchesSegment,
  pickTrendingProducts,
};
