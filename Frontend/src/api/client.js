import axios from "axios";
import { getToken } from "../utils/authToken";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
});

api.interceptors.request.use((config) => {
  const token = getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export async function login(payload) {
  const { data } = await api.post("/auth/login", payload);
  return data;
}

export async function register(payload) {
  const { data } = await api.post("/auth/register", payload);
  return data;
}

export async function requestPasswordReset(payload) {
  const { data } = await api.post("/auth/forgot-password", payload);
  return data;
}

export async function validateResetToken(token) {
  const { data } = await api.get("/auth/reset-password/validate", {
    params: { token },
  });
  return data;
}

export async function resetPassword({ token, newPassword }) {
  const { data } = await api.post("/auth/reset-password", { token, newPassword });
  return data;
}

export async function getCurrentUser() {
  const { data } = await api.get("/auth/me");
  return data;
}

export async function updateCurrentUser(payload) {
  const { data } = await api.patch("/auth/me", payload);
  return data;
}

export async function changePassword({ currentPassword, newPassword }) {
  const { data } = await api.post("/auth/change-password", {
    currentPassword,
    newPassword,
  });
  return data;
}

/**
 * Normalise `POST /api/products` responses. Same endpoint for Home and Catalog;
 * only JSON body fields differ (segment, filters, page, limit).
 *
 * - With `page` or `limit`: backend returns `{ items, total, page, ... }`.
 * - Without both: legacy bare array (avoid for new callers).
 */
export function parseProductsListResponse(data) {
  if (Array.isArray(data)) {
    return {
      items: data,
      total: data.length,
      page: 1,
      limit: data.length,
      totalPages: 1,
      hasMore: false,
    };
  }
  const items = Array.isArray(data?.items) ? data.items : [];
  return {
    items,
    total: Number(data?.total) || items.length,
    page: Number(data?.page) || 1,
    limit: Number(data?.limit) || items.length,
    totalPages: Number(data?.totalPages) || 1,
    hasMore: Boolean(data?.hasMore),
    sort: data?.sort,
  };
}

function buildProductsListPayload(params) {
  const cleaned = {};
  if (params?.segment) cleaned.segment = params.segment;
  if (params?.q) cleaned.q = String(params.q).trim();
  if (params?.brand != null) {
    if (Array.isArray(params.brand)) {
      const brands = params.brand.map((b) => String(b).trim()).filter(Boolean);
      if (brands.length) cleaned.brand = brands;
    } else {
      const brand = String(params.brand).trim();
      if (brand) cleaned.brand = brand;
    }
  }
  if (params?.priceMin != null && params.priceMin !== "") {
    cleaned.priceMin = params.priceMin;
  }
  if (params?.priceMax != null && params.priceMax !== "") {
    cleaned.priceMax = params.priceMax;
  }
  if (params?.minRating != null && params.minRating !== "" && Number(params.minRating) > 0) {
    cleaned.minRating = params.minRating;
  }
  if (params?.sort) cleaned.sort = String(params.sort);
  if (params?.page != null && params.page !== "") cleaned.page = params.page;
  if (params?.limit != null && params.limit !== "") cleaned.limit = params.limit;
  return cleaned;
}

/**
 * List products — `POST /api/products` with JSON body (segment, filters, page, limit).
 * Network tab shows the route name only; filters are not appended to the URL.
 */
export async function getProducts(params) {
  const { data } = await api.post("/products", buildProductsListPayload(params));
  return data;
}

export async function getProductById(id) {
  const { data } = await api.get(`/products/${id}`);
  return data;
}

/**
 * Catalog sidebar facets — `POST /api/products/filters` with JSON body
 * (`segment`, optional `q`). Network tab shows `filters` only, no query string.
 * Load this before `getProducts` so facet ranges match the first product page.
 */
export async function getFilterData(params) {
  const body = {};
  if (params?.segment) body.segment = params.segment;
  if (params?.q) body.q = String(params.q).trim();
  const { data } = await api.post("/products/filters", body);
  return data;
}

/** @deprecated Use `getFilterData` — same behaviour. */
export const getProductFilters = getFilterData;

export async function getProductReviews(id) {
  const { data } = await api.get(`/products/${id}/reviews`);
  return data;
}

export async function createProductReview(id, payload) {
  const { data } = await api.post(`/products/${id}/reviews`, payload);
  return data;
}

/* --------------------------- Cart (server-side) --------------------------- */

export async function getCart() {
  const { data } = await api.get("/cart");
  return data;
}

/** Replace the entire cart server-side (used to merge a guest cart on login). */
export async function replaceCart(items) {
  const { data } = await api.put("/cart", { items });
  return data;
}

/** Body: { productId, quantity? } — full product comes back on the response. */
export async function addCartItem({ productId, quantity = 1 }) {
  const { data } = await api.post("/cart/items", { productId, quantity });
  return data;
}

export async function setCartItemQuantity(productId, quantity) {
  const { data } = await api.patch(`/cart/items/${encodeURIComponent(productId)}`, {
    quantity,
  });
  return data;
}

export async function removeCartItem(productId) {
  const { data } = await api.delete(`/cart/items/${encodeURIComponent(productId)}`);
  return data;
}

export async function clearCartServer() {
  const { data } = await api.delete("/cart");
  return data;
}

/* ------------------------------- Orders --------------------------------- */

export async function createOrder(payload) {
  const { data } = await api.post("/orders", payload);
  return data;
}

export async function getOrders() {
  const { data } = await api.get("/orders");
  return data;
}

export async function getOrderById(id) {
  const { data } = await api.get(`/orders/${id}`);
  return data;
}

export async function cancelOrder(id) {
  const { data } = await api.patch(`/orders/${encodeURIComponent(id)}/cancel`);
  return data;
}

/* ------------------------- Shopping assistant --------------------------- */

/* ---------- Coupons ---------- */

export async function validateCoupon({ code, subtotal }) {
  const { data } = await api.post("/coupons/validate", { code, subtotal });
  return data;
}

/* ---------- Addresses ---------- */

export async function getAddresses() {
  const { data } = await api.get("/addresses");
  return data;
}

export async function createAddress(payload) {
  const { data } = await api.post("/addresses", payload);
  return data;
}

export async function updateAddress(id, payload) {
  const { data } = await api.patch(`/addresses/${encodeURIComponent(id)}`, payload);
  return data;
}

export async function deleteAddress(id) {
  const { data } = await api.delete(`/addresses/${encodeURIComponent(id)}`);
  return data;
}

/* ---------- Stock alerts (notify when back in stock) ---------- */

export async function getStockAlerts() {
  const { data } = await api.get("/stock-alerts");
  return data;
}

export async function subscribeStockAlert(productId) {
  const { data } = await api.post("/stock-alerts", { productId });
  return data;
}

export async function unsubscribeStockAlert(productId) {
  const { data } = await api.delete(
    `/stock-alerts/${encodeURIComponent(productId)}`
  );
  return data;
}

/* ---------- Preferences ---------- */

export async function getPreferences() {
  const { data } = await api.get("/preferences");
  return data;
}

export async function updatePreferences(payload) {
  const { data } = await api.put("/preferences", payload);
  return data;
}

/* ---------- Price Alerts ---------- */

export async function getPriceAlerts() {
  const { data } = await api.get("/price-alerts");
  return data;
}

export async function subscribePriceAlert({ productId, targetPrice }) {
  const { data } = await api.post("/price-alerts", { productId, targetPrice });
  return data;
}

export async function unsubscribePriceAlert(productId) {
  const { data } = await api.delete(
    `/price-alerts/${encodeURIComponent(productId)}`
  );
  return data;
}

/* ---------- In-app notifications (customer inbox) ---------- */

export async function getNotifications() {
  const { data } = await api.get("/notifications");
  return data;
}

export async function markNotificationRead(id) {
  const { data } = await api.patch(`/notifications/${encodeURIComponent(id)}/read`);
  return data;
}

export async function markAllNotificationsRead() {
  const { data } = await api.post("/notifications/read-all");
  return data;
}

/* ---------- Admin customer alerts ---------- */

export async function adminListCustomerAlerts() {
  const { data } = await api.get("/admin/customer-alerts");
  return data;
}

export async function adminFulfillCustomerAlert(payload) {
  const { data } = await api.post("/admin/customer-alerts/fulfill", payload);
  return data;
}

/* ---------- Saved Items ---------- */

export async function getSavedItems() {
  const { data } = await api.get("/saved");
  return data;
}

export async function replaceSavedItems(items) {
  const { data } = await api.put("/saved", { items });
  return data;
}

export async function addSavedItem(payload) {
  const productId =
    payload?.productId != null
      ? String(payload.productId)
      : payload?.id != null
        ? String(payload.id)
        : "";
  const { data } = await api.post("/saved/items", productId ? { productId } : payload);
  return data;
}

export async function removeSavedItem(id) {
  const { data } = await api.delete(`/saved/items/${encodeURIComponent(id)}`);
  return data;
}

export async function clearSavedItems() {
  const { data } = await api.delete("/saved");
  return data;
}

export async function chatWithAssistant({ message, history = [], context }) {
  const payload = { message, history };
  if (context && typeof context === "object") payload.context = context;
  const { data } = await api.post("/assistant/chat", payload);
  return data;
}

/* ---------- Admin ---------- */

export async function adminGetStats() {
  const { data } = await api.get("/admin/stats");
  return data;
}

export async function adminGetSalesChart(days = 30) {
  const { data } = await api.get("/admin/sales-chart", { params: { days } });
  return data;
}

export async function adminGetRecentActivity() {
  const { data } = await api.get("/admin/recent-activity");
  return data;
}

export async function adminListProducts(params = {}) {
  const { data } = await api.get("/admin/products", { params });
  return data;
}

/**
 * Notify any listeners (currently the AdminLayout topbar bell) that the
 * inventory has changed so they can refresh derived counts (low / out of
 * stock badges, etc.) without waiting for a route change.
 *
 * Centralising this here means EVERY caller — inventory page, bulk import
 * modal, future bulk price edit, etc. — automatically triggers the badge
 * refresh; pages don't have to remember to dispatch it themselves.
 */
function emitInventoryChanged(detail = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("admin:inventory-changed", { detail })
  );
}

export async function adminCreateProduct(payload) {
  const { data } = await api.post("/admin/products", payload);
  emitInventoryChanged({ kind: "create", id: data?.product?.id });
  return data;
}

export async function adminBulkImportProducts(products, { dryRun = false } = {}) {
  const { data } = await api.post("/admin/products/bulk-import", {
    products,
    dryRun,
  });
  // Dry-run requests don't mutate state — only fire the event for real
  // commits so we don't churn the badge during preview validation.
  if (!dryRun) emitInventoryChanged({ kind: "bulk-import" });
  return data;
}

export async function adminUpdateProduct(id, payload) {
  const { data } = await api.patch(
    `/admin/products/${encodeURIComponent(id)}`,
    payload
  );
  emitInventoryChanged({ kind: "update", id });
  return data;
}

export async function adminDeleteProduct(id) {
  const { data } = await api.delete(`/admin/products/${encodeURIComponent(id)}`);
  emitInventoryChanged({ kind: "delete", id });
  return data;
}

export async function adminListOrders(params = {}) {
  const { data } = await api.get("/admin/orders", { params });
  return data;
}

export async function adminUpdateOrderStatus(id, status) {
  const { data } = await api.patch(
    `/admin/orders/${encodeURIComponent(id)}/status`,
    { status }
  );
  return data;
}

export async function adminBulkUpdateOrderStatus(ids, status) {
  const { data } = await api.post("/admin/orders/bulk-status", { ids, status });
  return data;
}

export async function adminListAuditLogs(params = {}) {
  const { data } = await api.get("/admin/audit", { params });
  return data;
}

export async function adminGetUploadConfig() {
  const { data } = await api.get("/admin/uploads/config");
  return data;
}

export async function adminGetUploadSignature(folder) {
  const { data } = await api.post("/admin/uploads/signature", folder ? { folder } : {});
  return data;
}

export default api;
