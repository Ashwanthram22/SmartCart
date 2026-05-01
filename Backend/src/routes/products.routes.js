const express = require("express");
const { readDb } = require("../lib/data-store");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

router.get("/", authMiddleware, async (req, res) => {
  const db = await readDb();
  res.json(db.products);
});

router.get("/:id", authMiddleware, async (req, res) => {
  const db = await readDb();
  const product = db.products.find((item) => String(item.id) === String(req.params.id));

  if (!product) {
    return res.status(404).json({
      message: "Product not found",
    });
  }

  const similar = db.products
    .filter((item) => item.id !== product.id)
    .slice(0, 2);

  return res.json({
    product,
    similar,
  });
});

module.exports = router;
