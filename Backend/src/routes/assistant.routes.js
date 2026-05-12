const express = require("express");
const { readDb } = require("../lib/data-store");
const authMiddleware = require("../middleware/auth");
const { writeLimiter } = require("../middleware/rateLimits");
const { generate, PROVIDER } = require("../lib/assistant/provider");

const router = express.Router();

router.use(authMiddleware);

router.get("/info", (req, res) => {
  res.json({ provider: PROVIDER });
});

/**
 * Sanitise an inbound product context payload from the client. We accept
 * only a small set of known fields, all coerced to strings/numbers, so a
 * crafted payload can't smuggle anything unsafe into the LLM prompt.
 */
function sanitiseContext(raw) {
  if (!raw || typeof raw !== "object") return null;
  const productId = raw.productId != null ? String(raw.productId).slice(0, 60) : "";
  const productTitle =
    typeof raw.productTitle === "string" ? raw.productTitle.slice(0, 200) : "";
  if (!productId && !productTitle) return null;
  return {
    productId,
    productTitle,
    productCategory:
      typeof raw.productCategory === "string"
        ? raw.productCategory.slice(0, 80)
        : "",
    productPrice: Number.isFinite(Number(raw.productPrice))
      ? Number(raw.productPrice)
      : null,
  };
}

router.post("/chat", writeLimiter, async (req, res) => {
  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  if (!message) return res.status(400).json({ message: "Message is required" });
  if (message.length > 1000) {
    return res.status(400).json({ message: "Message too long (1000 char max)" });
  }

  const history = Array.isArray(req.body?.history)
    ? req.body.history
        .filter((m) => m && typeof m.content === "string")
        .map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: String(m.content).slice(0, 2000),
        }))
        .slice(-12)
    : [];

  const context = sanitiseContext(req.body?.context);

  try {
    const db = await readDb();
    const reply = await generate({
      db,
      message,
      history,
      userId: req.user.sub,
      context,
    });
    return res.json(reply);
  } catch (err) {
    console.error("[assistant] generate failed", err);
    return res
      .status(500)
      .json({ message: "Assistant is unavailable, please try again" });
  }
});

module.exports = router;
