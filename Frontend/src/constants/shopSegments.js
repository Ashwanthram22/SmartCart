/** Catalog category tabs — shared by ShopSegmentNav and filtering */
export const SHOP_SEGMENTS = [
  "AI Picks",
  "Electronics",
  "Mobiles",
  "Laptops",
  "Accessories",
  "Fashion",
  "Home & Kitchen",
  "Appliances",
  "Books",
  "Groceries",
];

export function isValidSegment(value) {
  return typeof value === "string" && SHOP_SEGMENTS.includes(value);
}

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
  Wellness: ["Appliances", "Home & Kitchen"],
  "Smart Home": ["Electronics", "Appliances", "Home & Kitchen"],
  Sports: ["Fashion", "Accessories"],
  Books: ["Books"],
  Groceries: ["Groceries"],
  Mobiles: ["Mobiles", "Electronics"],
};

export function productMatchesSegment(product, segment) {
  if (!product || segment === "AI Picks") return true;

  const explicit = Array.isArray(product.catalogSegments) ? product.catalogSegments : [];
  if (explicit.length > 0) {
    return explicit.includes(segment);
  }

  const cat = product.category || "";
  const tabs = CATEGORY_TO_TABS[cat];
  return Array.isArray(tabs) && tabs.includes(segment);
}
