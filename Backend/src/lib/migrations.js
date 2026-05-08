const { readDb, withDb } = require("./data-store");
const { isHashed, hashPassword } = require("./passwords");

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
async function runStartupMigrations() {
  const snapshot = await readDb();

  const collectionsToAdd = [];
  if (!Array.isArray(snapshot.reviews)) collectionsToAdd.push("reviews");
  if (!Array.isArray(snapshot.carts)) collectionsToAdd.push("carts");
  if (!Array.isArray(snapshot.orders)) collectionsToAdd.push("orders");

  const usersNeedingHash = (snapshot.users || []).filter(
    (u) => typeof u.password === "string" && u.password.length > 0 && !isHashed(u.password)
  );

  if (collectionsToAdd.length === 0 && usersNeedingHash.length === 0) {
    return;
  }

  const summary = await withDb(async (db) => {
    const stats = { hashedUsers: 0, addedCollections: [] };

    if (!Array.isArray(db.users)) db.users = [];
    if (!Array.isArray(db.products)) db.products = [];

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
}

module.exports = { runStartupMigrations };
