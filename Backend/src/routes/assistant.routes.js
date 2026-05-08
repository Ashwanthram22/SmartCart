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

  try {
    const db = await readDb();
    const reply = await generate({
      db,
      message,
      history,
      userId: req.user.sub,
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
