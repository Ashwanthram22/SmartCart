require("dotenv").config();

const app = require("./app");
const { PORT } = require("./config/env");
const { runStartupMigrations } = require("./lib/migrations");
const { connectMongo } = require("./lib/mongo/connection");
const logger = require("./lib/logger");

async function bootstrap() {
  await connectMongo();
  await runStartupMigrations();
  app.listen(PORT, () => {
    logger.info(`Backend listening`, { url: `http://localhost:${PORT}` });
  });
}

bootstrap().catch((err) => {
  logger.error("[bootstrap] failed", { message: err.message, stack: err.stack });
  process.exit(1);
});
