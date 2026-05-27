/**
 * In-app inbox on each user document (`user.inbox[]`).
 */

function nowIso() {
  return new Date().toISOString();
}

function ensureInbox(user) {
  if (!Array.isArray(user.inbox)) user.inbox = [];
  return user.inbox;
}

/**
 * @param {object} user — user row with inbox ensured
 * @param {{ type: string, title: string, message: string, productId?: string }} payload
 */
function pushUserNotification(user, payload) {
  const inbox = ensureInbox(user);
  const entry = {
    id: `in${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: String(payload.type || "info"),
    title: String(payload.title || "Notification"),
    message: String(payload.message || ""),
    productId: payload.productId != null ? String(payload.productId) : null,
    read: false,
    createdAt: nowIso(),
  };
  inbox.unshift(entry);
  if (inbox.length > 100) inbox.length = 100;
  return entry;
}

function publicNotification(row, product = null) {
  if (!row) return null;
  const out = {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    productId: row.productId,
    read: Boolean(row.read),
    createdAt: row.createdAt,
  };
  if (product) {
    out.productTitle = product.title != null ? String(product.title) : null;
    out.productCategory =
      product.category != null ? String(product.category) : null;
    const img =
      product.image ||
      (Array.isArray(product.images) && product.images.length > 0
        ? product.images[0]
        : null);
    out.productImage = img != null ? String(img) : null;
  }
  return out;
}

function findProductById(db, productId) {
  if (productId == null) return null;
  return (db.products || []).find((p) => String(p.id) === String(productId)) || null;
}

function publicNotificationWithProduct(db, row) {
  const product = row?.productId ? findProductById(db, row.productId) : null;
  return publicNotification(row, product);
}

module.exports = {
  ensureInbox,
  pushUserNotification,
  publicNotification,
  publicNotificationWithProduct,
  findProductById,
};
