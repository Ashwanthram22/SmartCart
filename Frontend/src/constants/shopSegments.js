/** Catalog category tabs — shared by ShopSegmentNav and filtering */
export const SHOP_SEGMENTS = [
  "AI Picks",
  "Trending",
  "Electronics",
  "Mobiles",
  "Laptops",
  "Accessories",
  "Fashion",
  "Home & Kitchen",
  "Sports",
  "Books",
  "Groceries",
];

export function isValidSegment(value) {
  return typeof value === "string" && SHOP_SEGMENTS.includes(value);
}

/** Shop tabs that map to `product.category` (excludes virtual segments). */
export const PRODUCT_CATALOG_CATEGORIES = SHOP_SEGMENTS.filter(
  (s) => s !== "AI Picks" && s !== "Trending"
);

/**
 * Maps backend `category` (and optional `catalogSegments` on a product) to tabs.
 * Extend `catalogSegments` on products in JSON/API for Books, Groceries, etc.
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

export function productMatchesSegment(product, segment) {
  if (!product || segment === "AI Picks") return true;

  /**
   * "Trending" is a virtual segment computed across the whole catalog
   * (top items by popularity score). We let it pass here so the consumer
   * can apply a separate trending-set filter alongside other facets
   * like price / rating / brand.
   */
  if (segment === "Trending") return true;

  if (segment === "Sports" && product.category === "Sports") {
    return true;
  }

  const explicit = Array.isArray(product.catalogSegments) ? product.catalogSegments : [];
  if (explicit.length > 0) {
    return explicit.includes(segment);
  }

  const cat = product.category || "";
  const tabs = CATEGORY_TO_TABS[cat];
  return Array.isArray(tabs) && tabs.includes(segment);
}
