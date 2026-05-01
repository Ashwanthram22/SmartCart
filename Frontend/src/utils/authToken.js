import Cookies from "js-cookie";

const TOKEN_KEY = "jwt_token";

export function getToken() {
  return Cookies.get(TOKEN_KEY);
}

export function setToken(token) {
  Cookies.set(TOKEN_KEY, token, { expires: 30, path: "/" });
}

export function clearToken() {
  Cookies.remove(TOKEN_KEY, { path: "/" });
}

export function isAuthenticated() {
  return Boolean(getToken());
}
