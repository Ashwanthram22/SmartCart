/**
 * MongoDB connection helper — SCAFFOLD ONLY.
 *
 * Everything below is intentionally commented out. The app currently runs
 * against the file-based `db.json` store via `lib/data-store.js`. When you're
 * ready to switch:
 *   1. Uncomment the `require("mongoose")` and the `connectMongo` body.
 *   2. Set `MONGODB_URI` (and optional `USE_MONGO=true`) in `.env`.
 *   3. Uncomment the `connectMongo()` call in `src/server.js`.
 *   4. Migrate reads/writes off `data-store.js` onto the Mongoose models in
 *      `./models/*` (one router at a time is fine — the file db can keep
 *      serving the rest while you cut over).
 *
 * The intent of this scaffold is to make tomorrow's switch as small and
 * mechanical as possible: types are already declared, env keys are already
 * threaded through, and nothing here will run today (no mongoose import is
 * resolved at runtime, so the package can even be missing without breaking
 * the boot).
 */

// const mongoose = require("mongoose");
// const { MONGODB_URI, USE_MONGO } = require("../../config/env");

// let connectionPromise = null;

/**
 * Idempotent connector — call this from server bootstrap. Returns the same
 * connection promise on subsequent calls so it's safe to invoke from multiple
 * places (e.g. server start + a cron worker later).
 */
// async function connectMongo() {
//   if (!USE_MONGO) {
//     console.log("[mongo] USE_MONGO is false — skipping MongoDB connection");
//     return null;
//   }
//   if (!MONGODB_URI) {
//     throw new Error("MONGODB_URI must be set when USE_MONGO=true");
//   }
//   if (connectionPromise) return connectionPromise;
//
//   mongoose.set("strictQuery", true);
//
//   connectionPromise = mongoose
//     .connect(MONGODB_URI, {
//       // Mongoose 8+ defaults are sensible; only override if needed.
//       autoIndex: process.env.NODE_ENV !== "production",
//       serverSelectionTimeoutMS: 10_000,
//     })
//     .then((conn) => {
//       console.log(
//         `[mongo] connected → ${conn.connection.host}/${conn.connection.name}`
//       );
//       return conn;
//     })
//     .catch((err) => {
//       connectionPromise = null;
//       console.error("[mongo] connection failed", err.message);
//       throw err;
//     });
//
//   return connectionPromise;
// }

// async function disconnectMongo() {
//   if (!connectionPromise) return;
//   await mongoose.disconnect();
//   connectionPromise = null;
// }

module.exports = {
  // Exported as no-ops while the scaffold is dormant so callers that get
  // wired up early don't have to defend against `undefined`.
  connectMongo: async () => null,
  disconnectMongo: async () => undefined,
  isMongoEnabled: () => false,
};
