const express = require("express");
const { withDb } = require("../lib/store");
const authMiddleware = require("../middleware/auth");
const {
  DEFAULT_PREFERENCES,
  withUserProfile,
} = require("../lib/user-profile");

const router = express.Router();

router.use(authMiddleware);

const ALLOWED_CURRENCIES = new Set(["USD", "INR", "EUR", "GBP"]);
const ALLOWED_THEMES = new Set(["system", "light", "dark"]);

const NOTIFICATION_KEYS = [
  "orderUpdates",
  "dealAlerts",
  "backInStock",
  "priceDrops",
  "weeklyDigest",
];

function withDefaults(record) {
  if (!record) {
    return {
      ...DEFAULT_PREFERENCES,
      notifications: { ...DEFAULT_PREFERENCES.notifications },
    };
  }
  return {
    currency: record.currency || DEFAULT_PREFERENCES.currency,
    theme: record.theme || DEFAULT_PREFERENCES.theme,
    notifications: {
      ...DEFAULT_PREFERENCES.notifications,
      ...(record.notifications || {}),
    },
    marketingEmails: Boolean(record.marketingEmails),
    updatedAt: record.updatedAt,
  };
}

function mergePatch(existing, body) {
  const next = withDefaults(existing);

  if (body.currency !== undefined) {
    const code = String(body.currency).toUpperCase();
    if (!ALLOWED_CURRENCIES.has(code)) {
      const err = new Error(`Unsupported currency: ${body.currency}`);
      err.status = 400;
      throw err;
    }
    next.currency = code;
  }

  if (body.theme !== undefined) {
    const theme = String(body.theme).toLowerCase();
    if (!ALLOWED_THEMES.has(theme)) {
      const err = new Error(`Unsupported theme: ${body.theme}`);
      err.status = 400;
      throw err;
    }
    next.theme = theme;
  }

  if (body.notifications && typeof body.notifications === "object") {
    for (const key of NOTIFICATION_KEYS) {
      if (key in body.notifications) {
        next.notifications[key] = Boolean(body.notifications[key]);
      }
    }
  }

  if (body.marketingEmails !== undefined) {
    next.marketingEmails = Boolean(body.marketingEmails);
  }

  return next;
}

router.get("/", async (req, res) => {
  const data = await withDb(async (db) => {
    const user = withUserProfile(db, req.user.sub);
    return withDefaults(user?.preferences);
  });
  return res.json({ preferences: data });
});

router.put("/", async (req, res) => {
  const body = req.body && typeof req.body === "object" ? req.body : {};

  let result;
  try {
    result = await withDb(async (db) => {
      const user = withUserProfile(db, req.user.sub);
      if (!user) return { error: "User not found" };
      const merged = mergePatch(user.preferences, body);
      user.preferences = {
        ...merged,
        updatedAt: new Date().toISOString(),
      };
      return user.preferences;
    });
  } catch (err) {
    return res.status(err.status || 400).json({ message: err.message });
  }

  if (result?.error) {
    return res.status(404).json({ message: result.error });
  }

  return res.json({ preferences: withDefaults(result) });
});

module.exports = router;
