/**
 * Verifies MONGODB_URI is reachable (5s server selection timeout).
 * Run from Backend: `npm run mongo:ping`
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const mongoose = require("mongoose");

const uri = process.env.MONGODB_URI && String(process.env.MONGODB_URI).trim();

if (!uri) {
  console.error("MONGODB_URI is not set (check Backend/.env)");
  process.exit(1);
}

mongoose
  .connect(uri, { serverSelectionTimeoutMS: 5000 })
  .then(() => {
    console.log("MongoDB ping OK:", mongoose.connection.host);
    return mongoose.disconnect();
  })
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("MongoDB ping failed:", err.message);
    process.exit(1);
  });
