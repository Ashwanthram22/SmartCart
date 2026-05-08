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

export async function chatWithAssistant({ message, history = [] }) {
  const { data } = await api.post("/assistant/chat", { message, history });
  return data;
}

export default api;
