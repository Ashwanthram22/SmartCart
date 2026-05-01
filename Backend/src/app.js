const express = require("express");
const cors = require("cors");

const authRouter = require("./routes/auth.routes");
const productsRouter = require("./routes/products.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "API is running",
  });
});

app.use("/api/auth", authRouter);
app.use("/api/products", productsRouter);

module.exports = app;
