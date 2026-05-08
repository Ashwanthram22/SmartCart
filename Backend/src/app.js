const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const { CORS_ORIGINS } = require("./config/env");
const { apiLimiter } = require("./middleware/rateLimits");
const authRouter = require("./routes/auth.routes");
const productsRouter = require("./routes/products.routes");
const cartRouter = require("./routes/cart.routes");
const ordersRouter = require("./routes/orders.routes");
const assistantRouter = require("./routes/assistant.routes");

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

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "API is running",
  });
});

app.use("/api/auth", authRouter);
app.use("/api/products", productsRouter);
app.use("/api/cart", cartRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/assistant", assistantRouter);

module.exports = app;
