require("dotenv").config();

const app = require("./app");
const { PORT } = require("./config/env");
const { runStartupMigrations } = require("./lib/migrations");
// MongoDB scaffold (currently a no-op). Uncomment to enable when you flip
// `USE_MONGO=true` in `.env` and uncomment the body of
// `src/lib/mongo/connection.js`.
// const { connectMongo } = require("./lib/mongo/connection");

async function bootstrap() {
  // await connectMongo();
  await runStartupMigrations();
  app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error("[bootstrap] failed", err);
  process.exit(1);
});
