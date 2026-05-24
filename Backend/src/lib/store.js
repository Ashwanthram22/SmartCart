/**
 * Persistence façade — import from here in routes and services, not from
 * `data-store` or `mongo-store` directly.
 */
const { USE_MONGO } = require("../config/env");

module.exports = USE_MONGO
  ? require("./mongo-store")
  : require("./data-store");
