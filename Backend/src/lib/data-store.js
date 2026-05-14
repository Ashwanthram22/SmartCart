/**
 * JSON file persistence. App code should import `../lib/store` instead of
 * this module directly so storage can be swapped without wide refactors.
 */
const fs = require("fs/promises");
const path = require("path");

const DB_PATH = path.join(__dirname, "..", "data", "db.json");

/**
 * Serialise all writes through a single promise chain. The previous
 * implementation read → mutate → wrote without locking, so two concurrent
 * mutations (e.g. two reviews POSTed in the same second) could clobber each
 * other. `withDb(mutator)` is the safe replacement: only one mutator runs at
 * a time and its return value is awaited before the next begins.
 */
let writeQueue = Promise.resolve();

async function readDb() {
  const raw = await fs.readFile(DB_PATH, "utf-8");
  return JSON.parse(raw);
}

async function writeDb(nextData) {
  const payload = JSON.stringify(nextData, null, 2);
  await fs.writeFile(DB_PATH, `${payload}\n`, "utf-8");
}

/**
 * Atomic read-mutate-write helper. The mutator receives the latest db, can
 * mutate it in place or return a new object, and the result is persisted.
 * Callers get back whatever the mutator returns (typically a created/updated
 * record) so handlers can `const order = await withDb(db => …)` and respond.
 */
async function withDb(mutator) {
  const run = async () => {
    const db = await readDb();
    const result = await mutator(db);
    await writeDb(db);
    return result;
  };
  const next = writeQueue.then(run, run);
  // keep the chain alive even if this mutator threw, so subsequent writes
  // still serialise
  writeQueue = next.catch(() => undefined);
  return next;
}

module.exports = {
  readDb,
  writeDb,
  withDb,
};
