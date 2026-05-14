/**
 * MongoDB connection — used when `USE_MONGO=true` and `MONGODB_URI` is set.
 * Routes still read/write via `lib/store.js` (JSON) until you migrate them to
 * Mongoose models; this connection is mainly for health checks and upcoming
 * repository work.
 */

const mongoose = require("mongoose");
const { USE_MONGO, MONGODB_URI, IS_PROD } = require("../../config/env");
const logger = require("../logger");

let connectionPromise = null;

/**
 * Idempotent connector — call from `server.js` bootstrap.
 * @returns {Promise<import("mongoose").Connection | null>}
 */
async function connectMongo() {
  if (!USE_MONGO) {
    logger.debug("[mongo] USE_MONGO is false — file JSON store only");
    return null;
  }
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is required when USE_MONGO=true");
  }
  if (connectionPromise) return connectionPromise;

  mongoose.set("strictQuery", true);

  connectionPromise = mongoose
    .connect(MONGODB_URI, {
      autoIndex: !IS_PROD,
      serverSelectionTimeoutMS: 10_000,
    })
    .then((conn) => {
      logger.info("[mongo] connected", {
        host: conn.connection.host,
        name: conn.connection.name,
      });
      return conn;
    })
    .catch((err) => {
      connectionPromise = null;
      logger.error("[mongo] connection failed", { message: err.message });
      throw err;
    });

  return connectionPromise;
}

async function disconnectMongo() {
  if (!USE_MONGO) return;
  try {
    await mongoose.disconnect();
  } finally {
    connectionPromise = null;
  }
}

function isMongoEnabled() {
  return USE_MONGO && mongoose.connection.readyState === 1;
}

/** For `/api/health` — never throws. */
function getMongoHealth() {
  if (!USE_MONGO) {
    return { mode: "json", configured: false, ready: false };
  }
  const st = mongoose.connection.readyState;
  const labels = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };
  return {
    mode: "mongo",
    configured: true,
    ready: st === 1,
    state: labels[st] || String(st),
  };
}

module.exports = {
  connectMongo,
  disconnectMongo,
  isMongoEnabled,
  getMongoHealth,
};
