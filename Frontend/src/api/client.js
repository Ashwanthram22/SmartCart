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

/**
 * List products. Optional `{ q }` maps to `/products?q=` when you move search server-side.
 * The catalog currently loads the full list and filters `q` client-side for simplicity.
 */
export async function getProducts(params) {
  const q = params?.q != null ? String(params.q).trim() : "";
  const { data } = await api.get("/products", q ? { params: { q } } : undefined);
  return data;
}

export async function getProductById(id) {
  const { data } = await api.get(`/products/${id}`);
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

export default api;
