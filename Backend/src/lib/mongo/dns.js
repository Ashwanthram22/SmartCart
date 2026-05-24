/**
 * Windows + Node often fail `mongodb+srv` with `querySrv ECONNREFUSED` while
 * `nslookup` works. Use reliable resolvers before Mongoose connects.
 */
const dns = require("dns");

const DEFAULT_SERVERS = ["8.8.8.8", "8.8.4.4"];

function configureMongoDns() {
  const raw = process.env.MONGODB_DNS_SERVERS;
  if (raw != null && String(raw).trim().toLowerCase() === "system") {
    return;
  }

  const servers =
    raw && String(raw).trim()
      ? String(raw)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : process.platform === "win32"
        ? DEFAULT_SERVERS
        : null;

  if (servers?.length) {
    dns.setServers(servers);
  }

  if (typeof dns.setDefaultResultOrder === "function") {
    dns.setDefaultResultOrder("ipv4first");
  }
}

module.exports = { configureMongoDns };
