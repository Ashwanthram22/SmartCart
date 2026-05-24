/**
 * MongoDB persistence with the same `readDb` / `writeDb` / `withDb` API as
 * `data-store.js`, so routes keep working unchanged when `USE_MONGO=true`.
 */
const { connectMongo } = require("./mongo/connection");
const {
  User,
  Product,
  Review,
  Order,
  Coupon,
  AuditLog,
  PasswordReset,
} = require("./mongo/models");
const { toPlain, syncByKey } = require("./mongo/doc");

let writeQueue = Promise.resolve();

async function ensureConnected() {
  await connectMongo();
}

async function readDb() {
  await ensureConnected();

  const [
    users,
    products,
    reviews,
    orders,
    coupons,
    passwordResets,
    auditLogs,
  ] = await Promise.all([
    User.find({}).lean(),
    Product.find({}).lean(),
    Review.find({}).lean(),
    Order.find({}).lean(),
    Coupon.find({}).lean(),
    PasswordReset.find({}).lean(),
    AuditLog.find({}).lean(),
  ]);

  return {
    users: toPlain(users),
    products: toPlain(products),
    reviews: toPlain(reviews),
    orders: toPlain(orders),
    coupons: toPlain(coupons),
    passwordResets: toPlain(passwordResets),
    auditLogs: toPlain(auditLogs),
  };
}

async function writeDb(nextData) {
  await ensureConnected();
  const db = nextData || {};

  await Promise.all([
    syncByKey(User, db.users, "id"),
    syncByKey(Product, db.products, "id"),
    syncByKey(Review, db.reviews, "id"),
    syncByKey(Order, db.orders, "id"),
    syncByKey(Coupon, db.coupons, "code"),
    syncByKey(PasswordReset, db.passwordResets, "id"),
    syncByKey(AuditLog, db.auditLogs, "id"),
  ]);
}

async function withDb(mutator) {
  const run = async () => {
    const db = await readDb();
    const result = await mutator(db);
    await writeDb(db);
    return result;
  };
  const next = writeQueue.then(run, run);
  writeQueue = next.catch(() => undefined);
  return next;
}

module.exports = {
  readDb,
  writeDb,
  withDb,
};
