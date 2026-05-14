/**
 * Persistence façade — import from here in routes and services, not from
 * `./data-store` directly. The implementation stays in `data-store.js` today
 * (JSON file); swapping to Mongo-backed repos later can re-export from here
 * without touching every caller.
 */
module.exports = require("./data-store");
