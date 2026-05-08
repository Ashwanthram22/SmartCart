const rateLimit = require("express-rate-limit");

const COMMON = {
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again in a moment." },
};

/** Tight bucket for credential-bearing endpoints. */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  ...COMMON,
});

/** Looser bucket for everything else under /api. */
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  ...COMMON,
});

/** Reviews/order creates etc. — protect from spam without blocking real use. */
const writeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  ...COMMON,
});

module.exports = { authLimiter, apiLimiter, writeLimiter };
