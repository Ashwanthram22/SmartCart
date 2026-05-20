/**
 * Per-user data embedded on `users[]` documents (cart, saved list, prefs,
 * addresses, alerts). Global collections stay separate: products, orders,
 * coupons, reviews, passwordResets, auditLogs.
 */

const LEGACY_COLLECTION_KEYS = [
  "carts",
  "savedItems",
  "preferences",
  "addresses",
  "stockAlerts",
  "priceAlerts",
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

function nowIso() {
  return new Date().toISOString();
}

function findUser(db, userId) {
  return (db.users || []).find((u) => u.id === userId) || null;
}

/** Initialise nested profile fields on a user row (idempotent). */
function ensureUserProfile(user) {
  if (!user.cart || typeof user.cart !== "object") {
    user.cart = { items: [], updatedAt: nowIso() };
  } else if (!Array.isArray(user.cart.items)) {
    user.cart.items = [];
  }

  if (!user.savedItems || typeof user.savedItems !== "object") {
    user.savedItems = { items: [], updatedAt: nowIso() };
  } else if (!Array.isArray(user.savedItems.items)) {
    user.savedItems.items = [];
  }

  if (!user.preferences || typeof user.preferences !== "object") {
    user.preferences = {
      ...DEFAULT_PREFERENCES,
      notifications: { ...DEFAULT_PREFERENCES.notifications },
      updatedAt: nowIso(),
    };
  } else if (!user.preferences.notifications) {
    user.preferences.notifications = { ...DEFAULT_PREFERENCES.notifications };
  }

  if (!Array.isArray(user.addresses)) user.addresses = [];
  if (!Array.isArray(user.stockAlerts)) user.stockAlerts = [];
  if (!Array.isArray(user.priceAlerts)) user.priceAlerts = [];

  return user;
}

function withUserProfile(db, userId) {
  const user = findUser(db, userId);
  if (!user) return null;
  return ensureUserProfile(user);
}

function touchCart(cart) {
  cart.updatedAt = nowIso();
}

function touchSaved(entry) {
  entry.updatedAt = nowIso();
}

function mergeCartLines(targetItems, incomingItems) {
  const seen = new Map();
  for (const raw of targetItems || []) {
    const productId = String(raw?.productId || "").trim();
    if (!productId) continue;
    const quantity = Math.max(1, Math.floor(Number(raw.quantity) || 1));
    seen.set(productId, { productId, quantity });
  }
  for (const raw of incomingItems || []) {
    const productId = String(raw?.productId || "").trim();
    if (!productId) continue;
    const quantity = Math.max(1, Math.floor(Number(raw.quantity) || 1));
    const prior = seen.get(productId);
    if (prior) {
      prior.quantity = Math.max(prior.quantity, quantity);
    } else {
      seen.set(productId, { productId, quantity });
    }
  }
  return Array.from(seen.values());
}

function legacyCollectionsPresent(db) {
  return LEGACY_COLLECTION_KEYS.some(
    (key) => Array.isArray(db[key]) && db[key].length > 0
  );
}

function usersNeedProfileInit(db) {
  return (db.users || []).some((u) => !u.cart || !u.savedItems);
}

/**
 * Move rows from top-level `carts`, `savedItems`, etc. onto matching
 * `users[]` documents, then delete the legacy arrays.
 */
function migrateLegacyUserCollections(db) {
  if (!Array.isArray(db.users)) db.users = [];

  for (const user of db.users) {
    ensureUserProfile(user);
  }

  let migrated = false;

  if (Array.isArray(db.carts)) {
    for (const row of db.carts) {
      const user = findUser(db, row.userId);
      if (!user) continue;
      ensureUserProfile(user);
      user.cart.items = mergeCartLines(user.cart.items, row.items);
      if (row.updatedAt) user.cart.updatedAt = row.updatedAt;
    }
    delete db.carts;
    migrated = true;
  }

  if (Array.isArray(db.savedItems)) {
    for (const row of db.savedItems) {
      const user = findUser(db, row.userId);
      if (!user) continue;
      ensureUserProfile(user);
      const seen = new Map();
      for (const it of user.savedItems.items) {
        const pid = String(it?.productId || it?.id || "").trim();
        if (!pid) continue;
        seen.set(pid, {
          productId: pid,
          savedAt: it.savedAt || new Date().toISOString(),
        });
      }
      for (const it of row.items || []) {
        const pid = String(it?.productId || it?.id || "").trim();
        if (!pid || seen.has(pid)) continue;
        seen.set(pid, {
          productId: pid,
          savedAt: it.savedAt || new Date().toISOString(),
        });
      }
      user.savedItems.items = Array.from(seen.values());
      if (row.updatedAt) user.savedItems.updatedAt = row.updatedAt;
    }
    delete db.savedItems;
    migrated = true;
  }

  if (Array.isArray(db.preferences)) {
    for (const row of db.preferences) {
      const user = findUser(db, row.userId);
      if (!user) continue;
      ensureUserProfile(user);
      const { userId: _u, id: _id, ...rest } = row;
      user.preferences = { ...user.preferences, ...rest };
    }
    delete db.preferences;
    migrated = true;
  }

  if (Array.isArray(db.addresses)) {
    for (const row of db.addresses) {
      const user = findUser(db, row.userId);
      if (!user) continue;
      ensureUserProfile(user);
      const { userId: _u, ...addr } = row;
      if (!user.addresses.some((a) => a.id === addr.id)) {
        user.addresses.push(addr);
      }
    }
    delete db.addresses;
    migrated = true;
  }

  if (Array.isArray(db.stockAlerts)) {
    for (const row of db.stockAlerts) {
      const user = findUser(db, row.userId);
      if (!user) continue;
      ensureUserProfile(user);
      const { userId: _u, ...alert } = row;
      if (
        !user.stockAlerts.some(
          (a) => String(a.productId) === String(alert.productId)
        )
      ) {
        user.stockAlerts.push(alert);
      }
    }
    delete db.stockAlerts;
    migrated = true;
  }

  if (Array.isArray(db.priceAlerts)) {
    for (const row of db.priceAlerts) {
      const user = findUser(db, row.userId);
      if (!user) continue;
      ensureUserProfile(user);
      const { userId: _u, ...alert } = row;
      if (
        !user.priceAlerts.some(
          (a) => String(a.productId) === String(alert.productId)
        )
      ) {
        user.priceAlerts.push(alert);
      }
    }
    delete db.priceAlerts;
    migrated = true;
  }

  return migrated;
}

function needsUserProfileWork(db) {
  return legacyCollectionsPresent(db) || usersNeedProfileInit(db);
}

module.exports = {
  DEFAULT_PREFERENCES,
  LEGACY_COLLECTION_KEYS,
  findUser,
  ensureUserProfile,
  withUserProfile,
  touchCart,
  touchSaved,
  mergeCartLines,
  legacyCollectionsPresent,
  usersNeedProfileInit,
  migrateLegacyUserCollections,
  needsUserProfileWork,
};
