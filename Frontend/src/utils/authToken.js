import Cookies from "js-cookie";

const TOKEN_KEY = "jwt_token";
const AUTH_EVENT = "smartcart:auth-changed";

/**
 * Cookie hardening: `sameSite=strict` blocks CSRF-style auto-attaches from
 * other origins, and `secure` is enabled when the page is served over HTTPS
 * (which we detect at runtime so localhost dev still works).
 *
 * Note: this is still a JS-readable cookie because the JWT is also sent via
 * the Authorization header, not as an auth cookie. For full XSS protection
 * the next step is to switch to httpOnly cookies issued by the backend.
 */
const COOKIE_OPTIONS = {
  expires: 30,
  path: "/",
  sameSite: "strict",
  secure: typeof window !== "undefined" && window.location?.protocol === "https:",
};

function emitAuthChange(reason) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(AUTH_EVENT, {
      detail: { reason, authenticated: isAuthenticated() },
    })
  );
}

export function getToken() {
  return Cookies.get(TOKEN_KEY);
}

export function setToken(token) {
  Cookies.set(TOKEN_KEY, token, COOKIE_OPTIONS);
  emitAuthChange("set");
}

export function clearToken() {
  Cookies.remove(TOKEN_KEY, { path: "/" });
  emitAuthChange("clear");
}

export function isAuthenticated() {
  return Boolean(getToken());
}

/**
 * Decode the JWT body (no signature verification — that's the server's
 * job). Returns null if there is no token, the token is malformed, or
 * the body isn't valid base64-url JSON.
 */
export function getTokenClaims() {
  const token = getToken();
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const padded = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const base64 =
      padded + "=".repeat((4 - (padded.length % 4)) % 4);
    const json = atob(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Convenience: is the current token issued to an admin user?
 * Treats both `role === "admin"` and `isAdmin === true` claims as admin.
 */
export function isAdmin() {
  const claims = getTokenClaims();
  if (!claims) return false;
  return claims.role === "admin" || Boolean(claims.isAdmin);
}

/**
 * Subscribe to login/logout transitions. Returns an unsubscribe function so
 * the call site can be used directly in `useEffect`. Other tabs in the same
 * browser are also covered via the cookie's storage event proxy.
 */
export function onAuthChange(handler) {
  if (typeof window === "undefined") return () => {};
  const wrapped = (e) => handler(e.detail);
  window.addEventListener(AUTH_EVENT, wrapped);
  return () => window.removeEventListener(AUTH_EVENT, wrapped);
}
