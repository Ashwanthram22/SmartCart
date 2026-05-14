const express = require("express");
const { withDb } = require("../lib/store");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

router.use(authMiddleware);

const MAX_ADDRESSES_PER_USER = 10;
const REQUIRED_FIELDS = ["fullName", "line1", "city", "postal"];

function ensureCollection(db) {
  if (!Array.isArray(db.addresses)) db.addresses = [];
}

function normaliseAddress(input) {
  if (!input || typeof input !== "object") return null;
  const out = {};
  for (const key of REQUIRED_FIELDS) {
    const v = String(input[key] || "").trim();
    if (v.length < 2) return null;
    out[key] = v;
  }
  out.label =
    typeof input.label === "string" && input.label.trim()
      ? input.label.trim().slice(0, 40)
      : "Home";
  out.line2 = typeof input.line2 === "string" ? input.line2.trim().slice(0, 80) : "";
  out.phone = typeof input.phone === "string" ? input.phone.trim().slice(0, 30) : "";
  return out;
}

function pickList(db, userId) {
  ensureCollection(db);
  return db.addresses.filter((a) => a.userId === userId);
}

router.get("/", async (req, res) => {
  const list = await withDb(async (db) => {
    return pickList(db, req.user.sub).map((a) => ({ ...a }));
  });
  return res.json({ addresses: list });
});

/**
 * Create a new address. The first address a user adds is automatically
 * marked as default; later ones inherit `isDefault: false` unless the
 * caller passed `isDefault: true`, in which case we flip the previous
 * default off so exactly one is true at a time.
 */
router.post("/", async (req, res) => {
  const incoming = normaliseAddress(req.body);
  if (!incoming) {
    return res.status(400).json({ message: "All address fields are required" });
  }

  const result = await withDb(async (db) => {
    ensureCollection(db);
    const own = db.addresses.filter((a) => a.userId === req.user.sub);
    if (own.length >= MAX_ADDRESSES_PER_USER) {
      return { error: `You can save at most ${MAX_ADDRESSES_PER_USER} addresses` };
    }
    const wantsDefault = Boolean(req.body?.isDefault) || own.length === 0;
    if (wantsDefault) {
      for (const a of own) a.isDefault = false;
    }
    const created = {
      id: `a${Date.now()}`,
      userId: req.user.sub,
      ...incoming,
      isDefault: wantsDefault,
      createdAt: new Date().toISOString(),
    };
    db.addresses.push(created);
    return { created };
  });

  if (result.error) return res.status(400).json({ message: result.error });
  return res.status(201).json({ address: result.created });
});

router.patch("/:id", async (req, res) => {
  const incoming = normaliseAddress(req.body);
  const wantsDefault = Boolean(req.body?.isDefault);

  const result = await withDb(async (db) => {
    ensureCollection(db);
    const target = db.addresses.find(
      (a) => a.id === req.params.id && a.userId === req.user.sub
    );
    if (!target) return { notFound: true };

    if (incoming) {
      target.fullName = incoming.fullName;
      target.line1 = incoming.line1;
      target.line2 = incoming.line2;
      target.city = incoming.city;
      target.postal = incoming.postal;
      target.label = incoming.label;
      target.phone = incoming.phone;
    }
    if (wantsDefault) {
      for (const a of db.addresses) {
        if (a.userId === req.user.sub) a.isDefault = false;
      }
      target.isDefault = true;
    }
    target.updatedAt = new Date().toISOString();
    return { updated: target };
  });

  if (result.notFound) return res.status(404).json({ message: "Address not found" });
  return res.json({ address: result.updated });
});

router.delete("/:id", async (req, res) => {
  const result = await withDb(async (db) => {
    ensureCollection(db);
    const idx = db.addresses.findIndex(
      (a) => a.id === req.params.id && a.userId === req.user.sub
    );
    if (idx < 0) return { notFound: true };
    const removed = db.addresses.splice(idx, 1)[0];
    // If we just deleted the default, promote the most-recent remaining
    // address (if any) so the user always has a usable default.
    if (removed.isDefault) {
      const remaining = db.addresses.filter((a) => a.userId === req.user.sub);
      const newest = remaining.sort(
        (a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0)
      )[0];
      if (newest) newest.isDefault = true;
    }
    return { removed };
  });

  if (result.notFound) return res.status(404).json({ message: "Address not found" });
  return res.json({ removed: result.removed.id });
});

module.exports = router;
