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
 * List products. Filtering happens server-side: pass any combination of
 * `segment`, `q`, `brand` (string or string[]), `priceMin`, `priceMax`,
 * `minRating`. Empty / missing values are dropped before the request is sent
 * so callers can spread their state without checking each field.
 */
export async function getProducts(params) {
  const cleaned = {};
  if (params?.segment) cleaned.segment = params.segment;
  if (params?.q) cleaned.q = String(params.q).trim();
  if (params?.brand != null) {
    const brand = Array.isArray(params.brand)
      ? params.brand.filter(Boolean).join(",")
      : String(params.brand).trim();
    if (brand) cleaned.brand = brand;
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
  // Asking for either `page` or `limit` switches the backend to the
  // `{ items, total, page, limit, totalPages, hasMore }` envelope.
  if (params?.page != null && params.page !== "") cleaned.page = params.page;
  if (params?.limit != null && params.limit !== "") cleaned.limit = params.limit;
  const { data } = await api.get(
    "/products",
    Object.keys(cleaned).length ? { params: cleaned } : undefined
  );
  return data;
}

export async function getProductById(id) {
  const { data } = await api.get(`/products/${id}`);
  return data;
}

/**
 * Catalog sidebar facets (price range, brands, ratings, specifications) for
 * the current segment + optional search. Always reflects the products that
 * are actually present in that tab so the UI never exposes empty filters.
 */
export async function getProductFilters(params) {
  const cleaned = {};
  if (params?.segment) cleaned.segment = params.segment;
  if (params?.q) cleaned.q = String(params.q).trim();
  const { data } = await api.get(
    "/products/filters",
    Object.keys(cleaned).length ? { params: cleaned } : undefined
  );
  return data;
}

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

export async function addCartItem(line) {
  const { data } = await api.post("/cart/items", line);
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

/* ---------- Saved Items ---------- */

export async function getSavedItems() {
  const { data } = await api.get("/saved");
  return data;
}

export async function replaceSavedItems(items) {
  const { data } = await api.put("/saved", { items });
  return data;
}

export async function addSavedItem(item) {
  const { data } = await api.post("/saved/items", item);
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

export async function adminCreateProduct(payload) {
  const { data } = await api.post("/admin/products", payload);
  return data;
}

export async function adminUpdateProduct(id, payload) {
  const { data } = await api.patch(
    `/admin/products/${encodeURIComponent(id)}`,
    payload
  );
  return data;
}

export async function adminDeleteProduct(id) {
  const { data } = await api.delete(`/admin/products/${encodeURIComponent(id)}`);
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

export async function adminGetUploadConfig() {
  const { data } = await api.get("/admin/uploads/config");
  return data;
}

export async function adminGetUploadSignature(folder) {
  const { data } = await api.post("/admin/uploads/signature", folder ? { folder } : {});
  return data;
}

export default api;
