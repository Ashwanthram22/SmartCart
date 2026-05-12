/**
 * Recently-viewed product list, persisted in localStorage.
 *
 * Stores up to MAX_ENTRIES product summaries keyed by `productId` so we can
 * render them as a horizontal strip without going back to the API. New
 * entries are pushed to the front and dedupe by productId.
 *
 * Survives refresh/SPA-navigation; cleared on logout via the auth-change
 * subscriber wired in `index.js` (storage key is invalidated rather than
 * silently leaking the previous user's history).
 */

const STORAGE_KEY = "smartcart_recently_viewed_v1";
const MAX_ENTRIES = 12;

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_ENTRIES)));
  } catch {
    /* ignore quota errors */
  }
}

function summariseProduct(product) {
  if (!product || !product.id) return null;
  return {
    id: product.id,
    title: product.title || "",
    image: product.image || "",
    price: Number(product.price) || 0,
    category: product.category || "",
    rating: product.rating || null,
  };
}

/** Push a product to the front of the list (dedupe + cap). */
export function trackViewedProduct(product) {
  const summary = summariseProduct(product);
  if (!summary) return;
  const existing = readAll().filter((p) => String(p.id) !== String(summary.id));
  writeAll([{ ...summary, viewedAt: Date.now() }, ...existing]);
}

/**
 * Read the current list. `excludeId` filters out the product the caller is
 * already showing (e.g. on ProductDetail we don't want to recommend the
 * page the user is on right now).
 */
export function getRecentlyViewed({ excludeId } = {}) {
  const list = readAll();
  if (excludeId == null) return list;
  return list.filter((p) => String(p.id) !== String(excludeId));
}

export function clearRecentlyViewed() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export const RECENTLY_VIEWED_STORAGE_KEY = STORAGE_KEY;
