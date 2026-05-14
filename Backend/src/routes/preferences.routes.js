const express = require("express");
const { withDb } = require("../lib/store");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

router.use(authMiddleware);

/**
 * Per-user preferences. The shape is intentionally permissive — new
 * fields can be added later without a backend change as long as they
 * pass the validators below. Any field omitted in the PUT body keeps
 * its existing value, so the UI can patch only what it changed.
 */
const ALLOWED_CURRENCIES = new Set(["USD", "INR", "EUR", "GBP"]);
const ALLOWED_THEMES = new Set(["system", "light", "dark"]);

const NOTIFICATION_KEYS = [
  "orderUpdates",
  "dealAlerts",
  "backInStock",
  "priceDrops",
  "weeklyDigest",
];

const DEFAULT_PREFERENCES = {
  currency: "INR",
  theme: "system",
  notifications: {
    orderUpdates: true,
    dealAlerts: true,
    backInStock: true,
    priceDrops: true,
    weeklyDigest: false,
  },
  marketingEmails: false,
};

function ensureCollection(db) {
  if (!Array.isArray(db.preferences)) db.preferences = [];
}

function findRecord(db, userId) {
  return db.preferences.find((p) => p.userId === userId);
}

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

/**
 * Merge a PUT body onto an existing record without ever blowing away
 * unknown fields. Throws when the body contains an explicitly invalid
 * value (e.g. an unsupported currency); silently ignores fields it
 * doesn't recognise so the API is forward-compatible with newer UIs.
 */
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
    ensureCollection(db);
    return withDefaults(findRecord(db, req.user.sub));
  });
  return res.json({ preferences: data });
});

router.put("/", async (req, res) => {
  const body = (req.body && typeof req.body === "object") ? req.body : {};

  let result;
  try {
    result = await withDb(async (db) => {
      ensureCollection(db);
      const existing = findRecord(db, req.user.sub);
      const merged = mergePatch(existing, body);
      const stamped = { ...merged, updatedAt: new Date().toISOString() };
      if (existing) {
        Object.assign(existing, stamped);
        return existing;
      }
      const record = {
        id: `pref${Date.now()}`,
        userId: req.user.sub,
        ...stamped,
      };
      db.preferences.push(record);
      return record;
    });
  } catch (err) {
    return res.status(err.status || 400).json({ message: err.message });
  }

  return res.json({ preferences: withDefaults(result) });
});

module.exports = router;
