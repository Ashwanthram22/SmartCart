/**
 * Centralised environment access + validation.
 *
 * `JWT_SECRET` is required for the app to run safely. In production we throw
 * immediately; in development we fall back to a generated secret but log a
 * loud warning so it cannot be missed. This removes the silent shared-default
 * that used to live in `auth.routes.js` and `auth.js`.
 */
const crypto = require("crypto");

const NODE_ENV = process.env.NODE_ENV || "development";
const IS_PROD = NODE_ENV === "production";

function readJwtSecret() {
  const fromEnv = process.env.JWT_SECRET && String(process.env.JWT_SECRET).trim();
  if (fromEnv && fromEnv !== "change_this_secret" && fromEnv.length >= 16) {
    return fromEnv;
  }
  if (IS_PROD) {
    throw new Error(
      "JWT_SECRET must be set to a strong (>=16 chars) value in production"
    );
  }
  const generated = crypto.randomBytes(32).toString("hex");
  console.warn(
    "[env] JWT_SECRET missing or weak — using an ephemeral dev secret. " +
      "All previously issued tokens are invalidated until you set JWT_SECRET."
  );
  return generated;
}

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

/**
 * Comma-separated list of allowed origins. Defaults to the single FRONTEND_URL.
 * Example: `CORS_ORIGINS=http://localhost:5173,https://smartcart.app`
 */
const CORS_ORIGINS = (process.env.CORS_ORIGINS || FRONTEND_URL)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

/**
 * MongoDB toggle. The actual connection lives in `lib/mongo/connection.js`
 * and is currently a no-op scaffold. We still read these values now so the
 * env contract is stable: tomorrow you only need to flip `USE_MONGO=true`
 * and supply a `MONGODB_URI`, no other code change required.
 */
const USE_MONGO =
  String(process.env.USE_MONGO || "").toLowerCase() === "true";
const MONGODB_URI = process.env.MONGODB_URI || null;

module.exports = {
  NODE_ENV,
  IS_PROD,
  PORT: Number(process.env.PORT) || 5000,
  JWT_SECRET: readJwtSecret(),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "30d",
  FRONTEND_URL,
  CORS_ORIGINS,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || null,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || null,
  GOOGLE_REDIRECT_URI:
    process.env.GOOGLE_REDIRECT_URI ||
    "http://localhost:5000/api/auth/google/callback",
  USE_MONGO,
  MONGODB_URI,
};
