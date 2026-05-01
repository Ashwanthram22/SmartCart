const fs = require("fs/promises");
const path = require("path");

const DB_PATH = path.join(__dirname, "..", "data", "db.json");

async function readDb() {
  const raw = await fs.readFile(DB_PATH, "utf-8");
  return JSON.parse(raw);
}

async function writeDb(nextData) {
  const payload = JSON.stringify(nextData, null, 2);
  await fs.writeFile(DB_PATH, `${payload}\n`, "utf-8");
}

module.exports = {
  readDb,
  writeDb,
};
