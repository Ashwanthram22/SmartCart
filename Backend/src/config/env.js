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

/**
 * Cloudinary credentials. All three are required for signed uploads
 * to work; if any are missing the admin upload endpoint short-circuits
 * with a friendly 503 telling the operator what to set.
 *
 * `CLOUDINARY_URL` (the format `cloudinary://<key>:<secret>@<cloud>`)
 * is also recognised as a single-string fallback so anyone copying
 * the value straight out of the Cloudinary dashboard can paste it in
 * without splitting.
 */
function parseCloudinaryUrl(raw) {
  if (!raw) return null;
  try {
    // cloudinary://<api_key>:<api_secret>@<cloud_name>
    const m = String(raw).match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
    if (!m) return null;
    return { apiKey: m[1], apiSecret: m[2], cloudName: m[3] };
  } catch {
    return null;
  }
}

const cloudinaryFromUrl = parseCloudinaryUrl(process.env.CLOUDINARY_URL);

const CLOUDINARY_CLOUD_NAME =
  process.env.CLOUDINARY_CLOUD_NAME || cloudinaryFromUrl?.cloudName || null;
const CLOUDINARY_API_KEY =
  process.env.CLOUDINARY_API_KEY || cloudinaryFromUrl?.apiKey || null;
const CLOUDINARY_API_SECRET =
  process.env.CLOUDINARY_API_SECRET || cloudinaryFromUrl?.apiSecret || null;
const CLOUDINARY_UPLOAD_FOLDER =
  process.env.CLOUDINARY_UPLOAD_FOLDER || "smartcart/products";

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
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  CLOUDINARY_UPLOAD_FOLDER,
};
