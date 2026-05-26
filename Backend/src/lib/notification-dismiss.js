/**
 * When a customer dismisses an inbox notification, remove the related
 * fulfilled stock / price alert so product pages show "Notify" again.
 */

function removeStockAlertForProduct(user, productId) {
  const pid = String(productId);
  const idx = (user.stockAlerts || []).findIndex(
    (a) => String(a.productId) === pid
  );
  if (idx < 0) return false;
  user.stockAlerts.splice(idx, 1);
  return true;
}

function removePriceAlertForProduct(user, productId) {
  const pid = String(productId);
  const idx = (user.priceAlerts || []).findIndex(
    (a) => String(a.productId) === pid
  );
  if (idx < 0) return false;
  user.priceAlerts.splice(idx, 1);
  return true;
}

/**
 * @param {object} user
 * @param {{ type?: string, productId?: string }} notification
 * @returns {{ productId: string|null, stock: boolean, price: boolean }}
 */
function clearAlertsForNotification(user, notification) {
  const productId =
    notification?.productId != null ? String(notification.productId) : null;
  if (!productId) return { productId: null, stock: false, price: false };

  const type = String(notification.type || "");
  let stock = false;
  let price = false;

  if (type === "stock_available") {
    stock = removeStockAlertForProduct(user, productId);
  } else if (type === "price_drop") {
    price = removePriceAlertForProduct(user, productId);
  }

  return { productId, stock, price };
}

module.exports = {
  clearAlertsForNotification,
  removeStockAlertForProduct,
  removePriceAlertForProduct,
};
