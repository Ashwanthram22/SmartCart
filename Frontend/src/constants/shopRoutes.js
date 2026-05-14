import { isValidSegment } from "./shopSegments";

/**
 * Path slug for `/products/:slug` (list). Empty string means the default tab
 * uses the bare `/products` URL (AI Picks).
 */
export const SEGMENT_PATH_SLUG = {
  "AI Picks": "",
  Trending: "trending",
  Electronics: "electronics",
  Mobiles: "mobiles",
  Laptops: "laptops",
  Accessories: "accessories",
  Fashion: "fashion",
  "Home & Kitchen": "home-kitchen",
  Sports: "sports",
  Books: "books",
  Groceries: "groceries",
};

/** Base list URL for the default products tab (AI Picks). */
export const CATALOG_LIST_BASE = "/products";

/**
 * Slug for `/product/:slug/:id`. AI Picks uses `ai-picks` so the path always
 * has an explicit segment (list stays `/products` without a slug).
 */
export function productDetailSlugForSegment(segment) {
  if (segment === "AI Picks") return "ai-picks";
  if (!isValidSegment(segment)) return "ai-picks";
  const slug = SEGMENT_PATH_SLUG[segment];
  return slug || "ai-picks";
}

/** Pathname for product list: `/products` or `/products/electronics`. */
export function catalogPathnameForSegment(segment) {
  if (!isValidSegment(segment)) return CATALOG_LIST_BASE;
  const slug = SEGMENT_PATH_SLUG[segment];
  if (!slug) return CATALOG_LIST_BASE;
  return `${CATALOG_LIST_BASE}/${slug}`;
}

/**
 * Resolve segment from a list URL slug. Returns `null` if missing or unknown.
 * Callers treat missing slug on `/products` as AI Picks separately.
 */
export function segmentFromCatalogListSlug(slug) {
  if (slug == null || String(slug).trim() === "") return null;
  const normalized = String(slug).toLowerCase();
  const entry = Object.entries(SEGMENT_PATH_SLUG).find(([, s]) => s === normalized);
  return entry ? entry[0] : null;
}

/** `/products` → AI Picks; `/products/foo` → segment or null if unknown. */
export function segmentForProductsListRoute(segmentSlug) {
  if (segmentSlug == null || segmentSlug === "") return "AI Picks";
  return segmentFromCatalogListSlug(segmentSlug);
}

/**
 * Resolve segment from a product-detail URL slug (`ai-picks` or list slugs).
 * Returns `null` if the slug is not recognized.
 */
export function segmentFromProductDetailSlug(slug) {
  if (!slug) return null;
  if (String(slug).toLowerCase() === "ai-picks") return "AI Picks";
  return segmentFromCatalogListSlug(slug);
}

export function isKnownProductDetailSlug(slug) {
  if (!slug) return false;
  if (String(slug).toLowerCase() === "ai-picks") return true;
  return segmentFromCatalogListSlug(slug) != null;
}

/** Pathname only: `/product/electronics/123` */
export function productDetailPathname(segment, productId) {
  const slug = productDetailSlugForSegment(segment);
  return `/product/${slug}/${encodeURIComponent(String(productId))}`;
}

/** Append optional `q` search param. */
export function withCatalogQuery(pathname, qRaw) {
  const q = qRaw != null ? String(qRaw).trim() : "";
  if (!q) return pathname;
  return `${pathname}?q=${encodeURIComponent(q)}`;
}

/** List URL from optional `q` string (trimmed). */
export function catalogListUrl(segment, qRaw) {
  return withCatalogQuery(catalogPathnameForSegment(segment), qRaw);
}

/** Detail URL from segment + id + optional `q`. */
export function productDetailUrl(segment, productId, qRaw) {
  return withCatalogQuery(productDetailPathname(segment, productId), qRaw);
}
