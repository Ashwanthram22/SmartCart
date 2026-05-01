/** Laptop catalog tabs — shared by ShopSegmentNav and filtering logic */
export const SHOP_SEGMENTS = [
  "AI Picks",
  "Gaming",
  "Business",
  "Ultra-portable",
  "Student",
  "Workstations",
];

export function isValidSegment(value) {
  return typeof value === "string" && SHOP_SEGMENTS.includes(value);
}

/**
 * Maps each tab to a subset of demo products (by category/title/price).
 * Tune rules as your catalog data grows.
 */
export function productMatchesSegment(product, segment) {
  if (!product || segment === "AI Picks") return true;

  const cat = product.category || "";
  const title = (product.title || "").toLowerCase();
  const price = Number(product.price) || 0;

  switch (segment) {
    case "Gaming":
      return (
        ["Audio", "Fitness", "Sports"].includes(cat) ||
        /game|pulse|stride|aura|sound/i.test(title)
      );
    case "Business":
      return ["Tablets", "Smart Home", "Wellness", "Home"].includes(cat);
    case "Ultra-portable":
      return ["Wearables", "Audio", "Fitness"].includes(cat);
    case "Student":
      return price <= 15000 || ["Tablets", "Wearables", "Audio", "Fitness"].includes(cat);
    case "Workstations":
      return cat === "Tablets" || price >= 12000;
    default:
      return true;
  }
}
