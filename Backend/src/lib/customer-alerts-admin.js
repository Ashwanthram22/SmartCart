/**
 * Admin view of customer stock / price alert subscriptions.
 */

const { ensureUserProfile } = require("./user-profile");
const { pushUserNotification } = require("./user-notifications");
const { appendAudit } = require("./audit");

function isPendingStockAlert(alert) {
  if (!alert || alert.fulfilled === true || alert.notified === true) return false;
  return true;
}

function isPendingPriceAlert(alert) {
  if (!alert || alert.fulfilled === true || alert.triggered === true) return false;
  return true;
}

function listPendingCustomerAlerts(db) {
  const users = db.users || [];
  const products = db.products || [];
  const productById = new Map(products.map((p) => [String(p.id), p]));
  const rows = [];

  for (const user of users) {
    if (!user || user.role === "admin") continue;
    ensureUserProfile(user);

    for (const alert of user.stockAlerts || []) {
      if (!isPendingStockAlert(alert)) continue;
      const product = productById.get(String(alert.productId));
      rows.push({
        kind: "stock",
        alertId: alert.id,
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        productId: alert.productId,
        productTitle: alert.productTitle || product?.title || alert.productId,
        targetPrice: null,
        createdAt: alert.createdAt,
        currentPrice: product?.price ?? null,
        currentStock: product?.stock ?? null,
      });
    }

    for (const alert of user.priceAlerts || []) {
      if (!isPendingPriceAlert(alert)) continue;
      const product = productById.get(String(alert.productId));
      rows.push({
        kind: "price",
        alertId: alert.id,
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        productId: alert.productId,
        productTitle: alert.productTitle || product?.title || alert.productId,
        targetPrice: alert.targetPrice,
        referencePrice: alert.referencePrice,
        createdAt: alert.createdAt,
        currentPrice: product?.price ?? null,
        currentStock: product?.stock ?? null,
      });
    }
  }

  rows.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return rows;
}

function fulfillCustomerAlert(db, { actor, kind, userId, alertId, newPrice, newStock }) {
  const user = ensureUserProfile((db.users || []).find((u) => u.id === userId));
  if (!user) return { error: "User not found" };

  if (kind === "stock") {
    const alert = user.stockAlerts.find((a) => a.id === alertId);
    if (!alert) return { error: "Stock alert not found" };
    if (!isPendingStockAlert(alert)) return { error: "This alert was already handled" };

    const product = (db.products || []).find(
      (p) => String(p.id) === String(alert.productId)
    );
    if (!product) return { error: "Product not found" };

    const stockNum = Number(newStock);
    if (!Number.isFinite(stockNum) || stockNum < 1) {
      return { error: "Set stock to at least 1 to mark as available" };
    }

    const beforeStock = product.stock;
    product.stock = Math.floor(stockNum);
    product.updatedAt = new Date().toISOString();
    if (actor?.email) product.updatedBy = actor.email;

    alert.fulfilled = true;
    alert.notified = true;
    alert.fulfilledAt = new Date().toISOString();

    const title = "Back in stock";
    const message = `${product.title} is available again. Stock updated to ${product.stock} units.`;
    const notification = pushUserNotification(user, {
      type: "stock_available",
      title,
      message,
      productId: product.id,
    });

    appendAudit(db, {
      actor,
      action: "alert.fulfill.stock",
      target: { type: "product", id: product.id },
      summary: `Notified ${user.email} — ${product.title} back in stock`,
      changes: { stock: { from: beforeStock, to: product.stock } },
      meta: { userId, alertId },
    });

    return { product, notification, alert };
  }

  if (kind === "price") {
    const alert = user.priceAlerts.find((a) => a.id === alertId);
    if (!alert) return { error: "Price alert not found" };
    if (!isPendingPriceAlert(alert)) return { error: "This alert was already handled" };

    const product = (db.products || []).find(
      (p) => String(p.id) === String(alert.productId)
    );
    if (!product) return { error: "Product not found" };

    const priceNum = Number(newPrice);
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      return { error: "newPrice must be a positive number" };
    }
    const target = Number(alert.targetPrice);
    if (Number.isFinite(target) && priceNum > target) {
      return {
        error: `Set price at or below the customer's target (₹${target})`,
      };
    }

    const beforePrice = product.price;
    product.price = Math.round(priceNum * 100) / 100;
    product.updatedAt = new Date().toISOString();
    if (actor?.email) product.updatedBy = actor.email;

    alert.fulfilled = true;
    alert.triggered = true;
    alert.fulfilledAt = new Date().toISOString();

    const title = "Price drop";
    const message = `${product.title} is now ₹${product.price.toLocaleString("en-IN")} — at or below your target of ₹${target.toLocaleString("en-IN")}.`;
    const notification = pushUserNotification(user, {
      type: "price_drop",
      title,
      message,
      productId: product.id,
    });

    appendAudit(db, {
      actor,
      action: "alert.fulfill.price",
      target: { type: "product", id: product.id },
      summary: `Notified ${user.email} — price drop on ${product.title}`,
      changes: { price: { from: beforePrice, to: product.price } },
      meta: { userId, alertId, targetPrice: target },
    });

    return { product, notification, alert };
  }

  return { error: "kind must be stock or price" };
}

module.exports = {
  listPendingCustomerAlerts,
  fulfillCustomerAlert,
  isPendingStockAlert,
  isPendingPriceAlert,
};
