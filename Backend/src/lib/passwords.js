const bcrypt = require("bcryptjs");

const ROUNDS = 10;

/**
 * bcrypt hashes always start with `$2a$`, `$2b$`, or `$2y$`. Anything else
 * (including the legacy plaintext passwords that existed in `db.json` before
 * the bcrypt migration, or `null` for OAuth-only users) is treated as
 * un-hashed.
 */
function isHashed(value) {
  return typeof value === "string" && /^\$2[aby]\$/.test(value);
}

async function hashPassword(plain) {
  return bcrypt.hash(String(plain), ROUNDS);
}

/**
 * Constant-time compare wrapper. Returns false (rather than throwing) for
 * users with no password set (OAuth-only accounts).
 */
async function verifyPassword(plain, hashed) {
  if (!plain || !hashed) return false;
  if (!isHashed(hashed)) return false;
  return bcrypt.compare(String(plain), hashed);
}

module.exports = {
  isHashed,
  hashPassword,
  verifyPassword,
};
