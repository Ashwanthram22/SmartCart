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
 * A small set of "always available" sample customer accounts. We use these
 * to recover from a known historical bug where the bcrypt-hash for the
 * demo user got corrupted in db.json (the stored hash no longer decodes
 * to its known plaintext), which made the documented `demo@aicart.com /
 * demo123` login useless.
 *
 * The migration only re-seeds these accounts when they are MISSING from
 * the users table, so a real customer who registered the same email is
 * never overwritten. To force a reset, delete the user row and reboot.
 */
const SEED_CUSTOMERS = [
  {
    id: "u1",
    name: "Demo User",
    email: "demo@aicart.com",
    password: "demo123",
    role: "customer",
  },
];

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
    value: 2000,
    label: "\u20b92,000 off orders over \u20b916,000",
    description:
      "Take \u20b92,000 off when your subtotal is at least \u20b916,000.",
    minOrder: 16000,
    active: true,
  },
  {
    code: "AICART",
    type: "percent",
    value: 15,
    label: "15% off — AI-curated picks",
    description:
      "Use code AICART for 15% off any order over \u20b94,000.",
    minOrder: 4000,
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
  if (!Array.isArray(snapshot.auditLogs)) collectionsToAdd.push("auditLogs");

  const usersNeedingHash = (snapshot.users || []).filter(
    (u) => typeof u.password === "string" && u.password.length > 0 && !isHashed(u.password)
  );

  const adminMissing = !(snapshot.users || []).some(
    (u) => u.role === "admin" || u.isAdmin === true
  );

  const seedCustomersMissing = SEED_CUSTOMERS.filter(
    (seed) =>
      !(snapshot.users || []).some(
        (u) => String(u.email || "").toLowerCase() === seed.email.toLowerCase()
      )
  );

  if (
    collectionsToAdd.length === 0 &&
    usersNeedingHash.length === 0 &&
    !adminMissing &&
    seedCustomersMissing.length === 0
  ) {
    return;
  }

  const summary = await withDb(async (db) => {
    const stats = {
      hashedUsers: 0,
      addedCollections: [],
      seededAdmin: false,
      seededCustomers: [],
    };

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

    for (const seed of SEED_CUSTOMERS) {
      const exists = db.users.some(
        (u) => String(u.email || "").toLowerCase() === seed.email.toLowerCase()
      );
      if (exists) continue;
      // Ensure the id is unique inside this snapshot, falling back to a
      // timestamped one if the canonical seed id is taken (e.g. a real
      // user took u1).
      let id = seed.id;
      if (db.users.some((u) => u.id === id)) {
        id = `u-${seed.email.split("@")[0]}-${Date.now()}`;
      }
      db.users.push({
        ...seed,
        id,
        // eslint-disable-next-line no-await-in-loop
        password: await hashPassword(seed.password),
      });
      stats.seededCustomers.push(seed.email);
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
    if (!Array.isArray(db.auditLogs)) {
      db.auditLogs = [];
      stats.addedCollections.push("auditLogs");
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
  if (summary.seededCustomers.length > 0) {
    console.log(
      `[migrations] seeded sample customer account(s): ${summary.seededCustomers.join(", ")}`
    );
  }
}

module.exports = { runStartupMigrations };
