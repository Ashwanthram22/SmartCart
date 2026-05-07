/**
 * Product selection helpers used by the Home page.
 *
 * Both helpers are pure functions over the API product list so the same logic
 * can be reused by the catalog or future personalization endpoints.
 */

/**
 * Recommended ("AI Picks") — keeps the curated order returned by the API.
 * The backend is expected to sort by personalization score; we just take the
 * first `count` items so the UI stays in sync with whatever the API decides.
 */
export function pickRecommendedProducts(products, count = 4) {
  if (!Array.isArray(products)) return [];
  return products.slice(0, count);
}

/**
 * Popularity score combining rating and review volume.
 *
 * `log10(reviews + 10)` dampens the effect of huge review counts so a 4.9★
 * product with 800 reviews can still beat a 4.5★ product with 5k reviews.
 * A small boost is added for products explicitly flagged as TRENDING so
 * editors can pin items into the row.
 */
function trendingScore(product) {
  const rating = Number(product?.rating) || 0;
  const reviews = Number(product?.reviewCount) || 0;
  const base = rating * Math.log10(reviews + 10);
  const badge = String(product?.badge || "").toUpperCase();
  const boost = badge.includes("TRENDING") ? 0.6 : 0;
  return base + boost;
}

/**
 * Trending row — top `count` products by popularity, excluding anything
 * already shown in another section (e.g. the Recommended row) so the
 * homepage doesn't duplicate cards.
 */
export function pickTrendingProducts(products, count = 4, exclude = []) {
  if (!Array.isArray(products)) return [];
  const excludedIds = new Set(
    (Array.isArray(exclude) ? exclude : [])
      .map((item) => item?.id)
      .filter((id) => id != null)
  );
  return [...products]
    .filter((item) => item?.id != null && !excludedIds.has(item.id))
    .sort((a, b) => trendingScore(b) - trendingScore(a))
    .slice(0, count);
}
