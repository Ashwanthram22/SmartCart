/**
 * Convenience re-export — SCAFFOLD ONLY.
 *
 * Once you uncomment the individual model files, importing from here gives
 * you a one-liner:
 *   const { User, Product, Review, Cart, Order } = require("./mongo/models");
 */

module.exports = {
  User: require("./User"),
  Product: require("./Product"),
  Review: require("./Review"),
  Cart: require("./Cart"),
  Order: require("./Order"),
};
