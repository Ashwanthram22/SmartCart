const { readDb, withDb } = require("./data-store");
const { isHashed, hashPassword } = require("./passwords");

/**
 * Default admin account seeded into a fresh db so the admin console
 * is reachable out of the box. The password is hashed by the same
 * pass that hashes legacy plaintext passwords below.
 *
 * Default credentials (CHANGE IN PRODUCTION):
 *   email: admin@aicart.com
 *   password: admin123
 */
const SEED_ADMIN = {
  id: "u-admin",
  name: "Admin",
  email: "admin@aicart.com",
  password: "admin123",
  role: "admin",
  isAdmin: true,
};

/**
 * Idempotent boot-time migrations against the file db.
 *   1. Bcrypt-hash any users whose `password` is still a plaintext string
 *      (legacy seed data and pre-bcrypt registrations).
 *   2. Ensure `carts`, `orders` and `reviews` collections exist so the
 *      server-cart, orders and review code never has to defend against
 *      `undefined`.
 *
 * We do an initial read-only pass first and only acquire the write queue
 * when there's actual work, so the file is left untouched (and nodemon
 * doesn't restart) on subsequent boots.
 */
/**
 * Demo coupons we seed when `db.coupons` doesn't exist yet. Re-running
 * the migration won't re-seed once the array is present (even if you
 * delete every row), which mirrors the behaviour of the other
 * collections — the file db is meant to be edited directly.
 */
const SEED_COUPONS = [
  {
    code: "WELCOME10",
    type: "percent",
    value: 10,
    label: "10% off your first order",
    description: "Save 10% on any order — no minimum.",
    minOrder: 0,
    active: true,
  },
  {
    code: "SAVE25",
    type: "flat",
    value: 25,
    label: "$25 off orders over $200",
    description: "Take $25 off when your subtotal is at least $200.",
    minOrder: 200,
    active: true,
  },
  {
    code: "AICART",
    type: "percent",
    value: 15,
    label: "15% off — AI-curated picks",
    description: "Use code AICART for 15% off any order over $50.",
    minOrder: 50,
    active: true,
  },
];

async function runStartupMigrations() {
  const snapshot = await readDb();

  const collectionsToAdd = [];
  if (!Array.isArray(snapshot.reviews)) collectionsToAdd.push("reviews");
  if (!Array.isArray(snapshot.carts)) collectionsToAdd.push("carts");
  if (!Array.isArray(snapshot.orders)) collectionsToAdd.push("orders");
  if (!Array.isArray(snapshot.passwordResets)) collectionsToAdd.push("passwordResets");
  if (!Array.isArray(snapshot.savedItems)) collectionsToAdd.push("savedItems");
  if (!Array.isArray(snapshot.coupons)) collectionsToAdd.push("coupons");
  if (!Array.isArray(snapshot.addresses)) collectionsToAdd.push("addresses");
  if (!Array.isArray(snapshot.stockAlerts)) collectionsToAdd.push("stockAlerts");
  if (!Array.isArray(snapshot.preferences)) collectionsToAdd.push("preferences");
  if (!Array.isArray(snapshot.priceAlerts)) collectionsToAdd.push("priceAlerts");

  const usersNeedingHash = (snapshot.users || []).filter(
    (u) => typeof u.password === "string" && u.password.length > 0 && !isHashed(u.password)
  );

  const adminMissing = !(snapshot.users || []).some(
    (u) => u.role === "admin" || u.isAdmin === true
  );

  if (
    collectionsToAdd.length === 0 &&
    usersNeedingHash.length === 0 &&
    !adminMissing
  ) {
    return;
  }

  const summary = await withDb(async (db) => {
    const stats = { hashedUsers: 0, addedCollections: [], seededAdmin: false };

    if (!Array.isArray(db.users)) db.users = [];
    if (!Array.isArray(db.products)) db.products = [];

    if (!db.users.some((u) => u.role === "admin" || u.isAdmin === true)) {
      const seed = { ...SEED_ADMIN, password: await hashPassword(SEED_ADMIN.password) };
      // If the seed id is somehow taken, mint a fresh one.
      if (db.users.some((u) => u.id === seed.id)) {
        seed.id = `u-admin-${Date.now()}`;
      }
      db.users.push(seed);
      stats.seededAdmin = true;
    }

    if (!Array.isArray(db.reviews)) {
      db.reviews = [];
      stats.addedCollections.push("reviews");
    }
    if (!Array.isArray(db.carts)) {
      db.carts = [];
      stats.addedCollections.push("carts");
    }
    if (!Array.isArray(db.orders)) {
      db.orders = [];
      stats.addedCollections.push("orders");
    }
    if (!Array.isArray(db.passwordResets)) {
      db.passwordResets = [];
      stats.addedCollections.push("passwordResets");
    }
    if (!Array.isArray(db.savedItems)) {
      db.savedItems = [];
      stats.addedCollections.push("savedItems");
    }
    if (!Array.isArray(db.coupons)) {
      db.coupons = SEED_COUPONS.map((c) => ({ ...c }));
      stats.addedCollections.push("coupons");
    }
    if (!Array.isArray(db.addresses)) {
      db.addresses = [];
      stats.addedCollections.push("addresses");
    }
    if (!Array.isArray(db.stockAlerts)) {
      db.stockAlerts = [];
      stats.addedCollections.push("stockAlerts");
    }
    if (!Array.isArray(db.preferences)) {
      db.preferences = [];
      stats.addedCollections.push("preferences");
    }
    if (!Array.isArray(db.priceAlerts)) {
      db.priceAlerts = [];
      stats.addedCollections.push("priceAlerts");
    }

    for (const user of db.users) {
      if (
        typeof user.password === "string" &&
        user.password.length > 0 &&
        !isHashed(user.password)
      ) {
        // eslint-disable-next-line no-await-in-loop
        user.password = await hashPassword(user.password);
        stats.hashedUsers += 1;
      }
    }

    return stats;
  });

  if (summary.hashedUsers > 0) {
    console.log(`[migrations] hashed ${summary.hashedUsers} legacy plaintext password(s)`);
  }
  if (summary.addedCollections.length > 0) {
    console.log(`[migrations] initialised collections: ${summary.addedCollections.join(", ")}`);
  }
  if (summary.seededAdmin) {
    console.log(
      "[migrations] seeded default admin account → admin@aicart.com / admin123 (change this!)"
    );
  }
}

module.exports = { runStartupMigrations };
