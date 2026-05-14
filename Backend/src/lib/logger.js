/**
 * Minimal structured logger. Prefer `logger.info/warn/error` over raw
 * `console.*` so logs stay consistent before you wire a log shipper.
 */
const { NODE_ENV } = require("../config/env");

const isDev = NODE_ENV !== "production";

function out(level, msg, extra) {
  const line = { ts: new Date().toISOString(), level, msg };
  if (extra && typeof extra === "object") Object.assign(line, extra);
  const text = JSON.stringify(line);
  if (level === "error") console.error(text);
  else if (level === "warn") console.warn(text);
  else console.log(text);
}

module.exports = {
  info(msg, extra) {
    out("info", msg, extra);
  },
  warn(msg, extra) {
    out("warn", msg, extra);
  },
  error(msg, extra) {
    out("error", msg, extra);
  },
  /** Verbose / local-only detail */
  debug(msg, extra) {
    if (isDev) out("debug", msg, extra);
  },
};
