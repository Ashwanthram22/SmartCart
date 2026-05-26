const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const { CORS_ORIGINS, USE_MONGO } = require("./config/env");
const { readDb } = require("./lib/store");
const { getMongoHealth } = require("./lib/mongo/connection");
const logger = require("./lib/logger");
const { apiLimiter } = require("./middleware/rateLimits");
const authRouter = require("./routes/auth.routes");
const productsRouter = require("./routes/products.routes");
const cartRouter = require("./routes/cart.routes");
const savedRouter = require("./routes/saved.routes");
const ordersRouter = require("./routes/orders.routes");
const assistantRouter = require("./routes/assistant.routes");
const couponsRouter = require("./routes/coupons.routes");
const addressesRouter = require("./routes/addresses.routes");
const stockAlertsRouter = require("./routes/stockAlerts.routes");
const preferencesRouter = require("./routes/preferences.routes");
const priceAlertsRouter = require("./routes/priceAlerts.routes");
const notificationsRouter = require("./routes/notifications.routes");
const adminRouter = require("./routes/admin.routes");

const app = express();

app.use(helmet());

/**
 * Allow only the configured frontend origins. We still permit non-browser /
 * curl requests (which arrive without an Origin header) so the health check
 * keeps working from local scripts.
 */
app.use(
  cors({
    origin(origin, cb) {
      if (!origin || CORS_ORIGINS.includes(origin)) return cb(null, true);
      return cb(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "200kb" }));

app.use("/api", apiLimiter);

app.get("/api/health", async (req, res) => {
  const started = Date.now();
  const mongo = getMongoHealth();
  const storeTimeoutMs = USE_MONGO ? 8000 : 2000;
  let dataStore = "unknown";
  try {
    await Promise.race([
      readDb(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("readDb timeout")), storeTimeoutMs)
      ),
    ]);
    dataStore = "ok";
  } catch (e) {
    dataStore = "error";
    logger.warn("[health] data store check failed", { message: e.message });
  }

  const ok =
    dataStore === "ok" && (!USE_MONGO || mongo.ready === true);
  res.status(ok ? 200 : 503).json({
    status: ok ? "ok" : "degraded",
    uptime: Math.round(process.uptime()),
    node: process.version,
    env: process.env.NODE_ENV || "development",
    dataStore,
    fileStore: dataStore,
    mongo,
    tookMs: Date.now() - started,
  });
});

app.use("/api/auth", authRouter);
app.use("/api/products", productsRouter);
app.use("/api/cart", cartRouter);
app.use("/api/saved", savedRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/coupons", couponsRouter);
app.use("/api/addresses", addressesRouter);
app.use("/api/stock-alerts", stockAlertsRouter);
app.use("/api/preferences", preferencesRouter);
app.use("/api/price-alerts", priceAlertsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/admin", adminRouter);
app.use("/api/assistant", assistantRouter);

module.exports = app;
